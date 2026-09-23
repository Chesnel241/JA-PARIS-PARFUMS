import fs from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";
import { loginAsAdmin } from "../helpers/auth";
import { ADMIN_STATE_PATH } from "../helpers/env";
import { discoverPages, PUBLIC_PAGES } from "../helpers/pages";

// Connexion admin unique pour toute la suite : les projets api/desktop/mobile
// réutilisent ce storageState (cookie `authjs.session-token`, JWT valable 8 h).
setup("connexion admin et enregistrement du storageState", async ({ request }) => {
  setup.setTimeout(180_000);
  const reachable = await request.get("/robots.txt", { timeout: 60_000 }).catch(() => null);
  expect(reachable?.ok(), "Serveur injoignable : démarrer l'application et/ou définir BASE_URL (voir docs/QA.md)").toBe(true);

  await loginAsAdmin(request);
  fs.mkdirSync(path.dirname(ADMIN_STATE_PATH), { recursive: true });
  await request.storageState({ path: ADMIN_STATE_PATH });

  // Préchauffage des pages d'administration (compilation à la volée de `next dev`).
  for (const url of discoverPages("admin")) {
    await request.get(url, { timeout: 120_000, maxRedirects: 0 }).catch(() => undefined);
  }
});

// En `next dev`, chaque route est compilée à sa première visite (plusieurs
// secondes) : on les préchauffe une fois pour éviter des délais aléatoires dans
// les tests. Sans effet notable sur un serveur de production.
setup("préchauffage des routes publiques", async ({ request }) => {
  setup.setTimeout(180_000);
  const urls = [
    ...PUBLIC_PAGES.filter((page) => !page.path.includes("[")).map((page) => page.path),
    "/produit/qa-prechauffage-inexistant",
    "/journal/qa-prechauffage-inexistant",
    "/sitemap.xml",
    "/api/articles",
    "/api/media/qa-prechauffage",
  ];
  for (const url of urls) {
    await request.get(url, { timeout: 120_000, maxRedirects: 0 }).catch(() => undefined);
  }
  for (const url of ["/api/orders", "/api/newsletter", "/api/ambassador-applications"]) {
    await request.post(url, { data: {}, timeout: 120_000 }).catch(() => undefined);
  }
});
