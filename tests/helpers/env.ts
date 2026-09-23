import path from "node:path";

// Configuration partagée par la config Playwright, les fixtures et les tests.
// Tout est surchargeable par variables d'environnement (voir docs/QA.md).

export const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3005").replace(/\/$/, "");

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@jae-paris.com").trim().toLowerCase();
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "AdminLocal2026!Secure";

export const REPO_ROOT = path.resolve(__dirname, "..", "..");

// storageState de l'admin, produit par le projet `setup` (ignoré par git).
export const ADMIN_STATE_PATH = path.join(REPO_ROOT, "tests", ".auth", "admin.json");

// Préfixe de toutes les données créées par la suite : permet de les reconnaître
// (et de les exclure quand on cherche des données « réelles » du catalogue).
export const QA_PREFIX = "qa";
