// Validation des variables d'environnement au runtime.
//
// - Ne fait JAMAIS échouer `next build` : pendant le build (NEXT_PHASE =
//   phase-production-build) les variables peuvent légitimement manquer.
// - Au runtime, journalise UNE fois des messages clairs (en français) pour
//   chaque variable manquante ou invalide, sans jamais afficher leur valeur.
// - N'importe rien de Prisma / Auth.js : utilisable partout (y compris Edge).

type EnvIssue = { name: string; message: string; fatal: boolean };

export const DEFAULT_SITE_URL = "https://jaeparis.com";

export function isBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isValidUrl(value: string, protocols: string[]) {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Liste les problèmes de configuration (aucune valeur n'est renvoyée).
export function checkEnv(env: NodeJS.ProcessEnv = process.env): EnvIssue[] {
  const issues: EnvIssue[] = [];

  const databaseUrl = env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    issues.push({ name: "DATABASE_URL", fatal: true, message: "DATABASE_URL est absente : le site ne peut pas joindre PostgreSQL (catalogue vide, commandes et admin indisponibles)." });
  } else if (!isValidUrl(databaseUrl, ["postgresql:", "postgres:"])) {
    issues.push({ name: "DATABASE_URL", fatal: true, message: "DATABASE_URL doit être une URL postgresql://…" });
  }

  const authSecret = (env.AUTH_SECRET ?? env.NEXTAUTH_SECRET)?.trim();
  if (!authSecret) {
    issues.push({ name: "AUTH_SECRET", fatal: true, message: "AUTH_SECRET est absente : la connexion à l'espace admin est impossible. Générez-la avec « openssl rand -base64 32 » et ajoutez-la dans Vercel > Settings > Environment Variables." });
  } else if (authSecret.length < 32) {
    issues.push({ name: "AUTH_SECRET", fatal: false, message: "AUTH_SECRET est trop courte (32 caractères minimum recommandés)." });
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    issues.push({ name: "NEXT_PUBLIC_SITE_URL", fatal: false, message: `NEXT_PUBLIC_SITE_URL est absente : sitemap.xml et robots.txt utiliseront ${env.VERCEL_PROJECT_PRODUCTION_URL ? "l'URL de production Vercel" : DEFAULT_SITE_URL}.` });
  } else if (!isValidUrl(siteUrl, ["http:", "https:"])) {
    issues.push({ name: "NEXT_PUBLIC_SITE_URL", fatal: false, message: "NEXT_PUBLIC_SITE_URL doit être une URL absolue (https://…)." });
  }

  const authUrl = env.AUTH_URL?.trim();
  if (authUrl && !isValidUrl(authUrl, ["http:", "https:"])) {
    issues.push({ name: "AUTH_URL", fatal: false, message: "AUTH_URL doit être une URL absolue (https://…) ou être supprimée (Vercel la déduit automatiquement)." });
  }

  // Paiement par carte (Stripe) : seul moyen de paiement du site.
  const stripeKey = env.STRIPE_SECRET_KEY?.trim();
  if (!stripeKey) {
    issues.push({ name: "STRIPE_SECRET_KEY", fatal: true, message: "STRIPE_SECRET_KEY est absente : aucune commande n'est possible. Ajoutez la clé Stripe (live en production) dans Vercel > Settings > Environment Variables." });
  } else {
    if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/.test(stripeKey)) {
      issues.push({ name: "STRIPE_SECRET_KEY", fatal: true, message: "STRIPE_SECRET_KEY est invalide (attendu : sk_live_…, rk_live_… ou équivalent test) : aucune commande n'est possible." });
    } else {
      if (!env.STRIPE_WEBHOOK_SECRET?.trim().startsWith("whsec_")) {
        issues.push({ name: "STRIPE_WEBHOOK_SECRET", fatal: false, message: "STRIPE_WEBHOOK_SECRET est absente : créez le webhook https://<domaine>/api/stripe/webhook dans le Dashboard Stripe. Sans lui, les paiements ne sont confirmés qu'au retour du client et par la resynchronisation périodique." });
      }
      if (/^(sk|rk)_test_/.test(stripeKey) && env.VERCEL_ENV === "production") {
        issues.push({ name: "STRIPE_SECRET_KEY", fatal: false, message: "STRIPE_SECRET_KEY est une clé de TEST en production : les vraies cartes seront refusées. Utilisez une clé live." });
      }
    }
  }

  return issues;
}

const globalForEnv = globalThis as unknown as { __jaeEnvChecked?: boolean };

// Journalise les problèmes une seule fois par instance. Sans effet au build.
export function reportEnvIssues() {
  if (isBuildPhase() || globalForEnv.__jaeEnvChecked) return;
  globalForEnv.__jaeEnvChecked = true;
  for (const issue of checkEnv()) {
    const log = issue.fatal ? console.error : console.warn;
    log(`[env] ${issue.message}`);
  }
}

export function hasAuthSecret() {
  return Boolean((process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)?.trim());
}

// URL publique absolue du site, sans « / » final.
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && isValidUrl(configured, ["http:", "https:"])) return configured.replace(/\/+$/, "");
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, "")}`;
  return DEFAULT_SITE_URL;
}
