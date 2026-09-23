import { test, expect } from "../fixtures";
import { signInWithCredentials, uniqueForwardedFor } from "../helpers/auth";
import { uploadMedia } from "../helpers/admin-api";
import { expectStatus } from "../helpers/factories";
import { createFakePngPayload, createMaliciousSvg, createOversizedPng } from "../helpers/images";
import { discoverApiRoutes, discoverPages } from "../helpers/pages";

// Routes découvertes en scannant src/app/api/admin/**/route.ts au chargement :
// toute nouvelle route admin est automatiquement couverte.
const ADMIN_ROUTES = discoverApiRoutes("admin");
const ADMIN_PAGES = discoverPages("admin");

test.describe("Sécurité — API d'administration sans session", () => {
  test("le scan des routes admin trouve des routes et leurs méthodes", () => {
    expect(ADMIN_ROUTES.length, "aucune route sous src/app/api/admin").toBeGreaterThanOrEqual(10);
    for (const route of ADMIN_ROUTES) expect(route.methods.length, `aucune méthode détectée dans ${route.file}`).toBeGreaterThan(0);
  });

  for (const route of ADMIN_ROUTES) {
    for (const method of route.methods) {
      test(`${method} ${route.url} → 401 sans session`, async ({ request }) => {
        const response = await request.fetch(route.url, {
          method,
          data: method === "GET" || method === "DELETE" ? undefined : {},
          maxRedirects: 0,
        });
        await expectStatus(response, 401, route.file);
      });
    }
  }

  test("cookie de session forgé → 401 sur toutes les routes GET", async ({ playwright, baseURL }) => {
    const forged = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { cookie: "authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0.forge.forge.forge.forge" },
    });
    try {
      for (const route of ADMIN_ROUTES.filter((candidate) => candidate.methods.includes("GET"))) {
        await expectStatus(await forged.get(route.url, { maxRedirects: 0 }), 401, route.file);
      }
    } finally {
      await forged.dispose();
    }
  });
});

test.describe("Sécurité — pages /admin sans session", () => {
  test("le scan des pages admin trouve /admin", () => {
    expect(ADMIN_PAGES).toContain("/admin");
  });

  for (const page of ADMIN_PAGES) {
    test(`${page} → redirection vers /connexion-admin?callbackUrl=…`, async ({ request }) => {
      const response = await request.get(page, { maxRedirects: 0 });
      expect([302, 303, 307, 308], `statut ${response.status()}`).toContain(response.status());
      const location = new URL(response.headers()["location"] ?? "", "http://x");
      expect(location.pathname).toBe("/connexion-admin");
      expect(location.searchParams.get("callbackUrl")).toBe(page);
    });
  }
});

test.describe("Sécurité — upload de médias", () => {
  test("SVG refusé (même avec du JavaScript dedans)", async ({ adminRequest }) => {
    const response = await uploadMedia(adminRequest, { name: "logo.svg", mimeType: "image/svg+xml", buffer: createMaliciousSvg() });
    await expectStatus(response, [415, 422]);
  });

  // BUG: l'upload ne vérifie que le type MIME déclaré par le client (file.type), jamais la signature
  // binaire (octets magiques) : un HTML/SVG envoyé en « image/png » est accepté (201) puis servi
  // par /api/media/<id>. Fichier : src/app/api/admin/media/route.ts.
  test("faux PNG (mime déclaré image/png, contenu HTML) refusé", async ({ adminRequest }) => {
    const response = await uploadMedia(adminRequest, { name: "photo.png", mimeType: "image/png", buffer: createFakePngPayload() });
    if (response.status() === 201) {
      // Nettoyage si l'app a accepté le fichier (bug), pour ne pas polluer la médiathèque.
      const { asset } = (await response.json()) as { asset: { id: string } };
      await adminRequest.delete(`/api/admin/media/${asset.id}`);
    }
    await expectStatus(response, [415, 422]);
  });

  // BUG: l'upload ne vérifie que le type MIME déclaré par le client (file.type), jamais la signature
  // binaire (octets magiques) : un HTML/SVG envoyé en « image/png » est accepté (201) puis servi
  // par /api/media/<id>. Fichier : src/app/api/admin/media/route.ts.
  test("SVG déguisé en PNG refusé", async ({ adminRequest }) => {
    const response = await uploadMedia(adminRequest, { name: "image.png", mimeType: "image/png", buffer: createMaliciousSvg() });
    if (response.status() === 201) {
      const { asset } = (await response.json()) as { asset: { id: string } };
      await adminRequest.delete(`/api/admin/media/${asset.id}`);
    }
    await expectStatus(response, [415, 422]);
  });

  test("fichier > 4 Mo refusé", async ({ adminRequest }) => {
    const response = await uploadMedia(adminRequest, { name: "gros.png", mimeType: "image/png", buffer: createOversizedPng(4 * 1024 * 1024) });
    await expectStatus(response, [413, 422]);
  });

  test("requête sans fichier refusée", async ({ adminRequest }) => {
    await expectStatus(await adminRequest.post("/api/admin/media", { multipart: { autre: "valeur" } }), 422);
  });
});

test.describe("Sécurité — en-têtes HTTP", () => {
  for (const url of ["/", "/boutique", "/connexion-admin", "/api/articles", "/robots.txt"]) {
    test(`en-têtes de sécurité sur ${url}`, async ({ request }) => {
      const response = await request.get(url);
      expect(response.status()).toBeLessThan(400);
      const headers = response.headers();
      const csp = headers["content-security-policy"] ?? "";
      expect(csp, "Content-Security-Policy absente").not.toBe("");
      expect(csp).toMatch(/default-src [^;]*'self'/);
      expect(csp).toMatch(/object-src 'none'/);
      const antiFraming = /frame-ancestors ('none'|'self')/.test(csp) || /^(DENY|SAMEORIGIN)$/i.test(headers["x-frame-options"] ?? "");
      expect(antiFraming, "ni frame-ancestors ni X-Frame-Options").toBe(true);
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toMatch(/^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin|origin|origin-when-cross-origin)$/);
      expect(headers["x-powered-by"], "X-Powered-By ne doit pas être exposé").toBeUndefined();
    });
  }
});

test.describe("Sécurité — limitation des tentatives de connexion", () => {
  test("5 échecs → blocage (même le bon mot de passe est refusé), sans bloquer une autre IP", async ({ playwright, baseURL }) => {
    const ip = uniqueForwardedFor();
    const attacker = await playwright.request.newContext({ baseURL });
    try {
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        const result = await signInWithCredentials(attacker, { password: "mauvais-mot-de-passe-qa", forwardedFor: ip });
        expect(result.ok, `tentative ${attempt} acceptée`).toBe(false);
      }
      const blocked = await signInWithCredentials(attacker, { forwardedFor: ip });
      expect(blocked.ok, "le bon mot de passe doit être refusé pendant le blocage").toBe(false);
    } finally {
      await attacker.dispose();
    }

    // Le blocage est par email + IP : l'admin légitime (autre IP) n'est pas verrouillé.
    const legit = await playwright.request.newContext({ baseURL });
    try {
      expect((await signInWithCredentials(legit, { forwardedFor: uniqueForwardedFor() })).ok).toBe(true);
    } finally {
      await legit.dispose();
    }
  });

  // BUG: recordFailedLogin fait lecture puis upsert non atomiques (src/lib/login-rate-limit.ts) :
  // des échecs envoyés en parallèle écrasent le compteur ; après 10 échecs simultanés le bon mot
  // de passe est accepté → force brute contournant la limite de 5 tentatives.
  test("10 échecs concurrents → blocage quand même (pas de perte de compteur)", async ({ playwright, baseURL }) => {
    const ip = uniqueForwardedFor();
    const clients = await Promise.all(Array.from({ length: 10 }, () => playwright.request.newContext({ baseURL })));
    try {
      const results = await Promise.all(
        clients.map((client) => signInWithCredentials(client, { password: "mauvais-mot-de-passe-qa", forwardedFor: ip })),
      );
      expect(results.every((result) => !result.ok)).toBe(true);
      const afterBurst = await signInWithCredentials(clients[0], { forwardedFor: ip });
      expect(afterBurst.ok, "10 échecs parallèles doivent déclencher le blocage").toBe(false);
    } finally {
      await Promise.all(clients.map((client) => client.dispose()));
    }
  });
});
