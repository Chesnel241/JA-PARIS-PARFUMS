import fs from "node:fs";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { BASE_URL } from "./tests/helpers/env";

const isCI = Boolean(process.env.CI);

/**
 * Environnements où les navigateurs sont pré-installés (PLAYWRIGHT_BROWSERS_PATH)
 * dans une révision différente de celle attendue par @playwright/test : on
 * réutilise le Chromium local plutôt que de lancer `playwright install`.
 * Surcharge explicite possible avec PW_CHROMIUM_EXECUTABLE. En CI (navigateur
 * installé par `npx playwright install chromium`), rien n'est modifié.
 */
function chromiumExecutableFallback(): string | undefined {
  if (process.env.PW_CHROMIUM_EXECUTABLE) return process.env.PW_CHROMIUM_EXECUTABLE;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || root === "0" || !fs.existsSync(root)) return undefined;
  try {
    const browsersJson = path.join(__dirname, "node_modules", "playwright-core", "browsers.json");
    const { browsers } = JSON.parse(fs.readFileSync(browsersJson, "utf8")) as { browsers: { name: string; revision: string }[] };
    const revision = browsers.find((browser) => browser.name === "chromium-headless-shell")?.revision;
    if (revision && fs.existsSync(path.join(root, `chromium_headless_shell-${revision}`))) return undefined;
  } catch {
    return undefined;
  }
  const candidates = fs
    .readdirSync(root)
    .filter((entry) => /^chromium(_headless_shell)?-\d+$/.test(entry))
    .sort((a, b) => Number(b.split("-").pop()) - Number(a.split("-").pop()) || (a.includes("headless") ? -1 : 1));
  for (const entry of candidates) {
    for (const platformDir of fs.readdirSync(path.join(root, entry))) {
      for (const binary of ["headless_shell", "chrome-headless-shell", "chrome"]) {
        const executable = path.join(root, entry, platformDir, binary);
        if (fs.existsSync(executable)) return executable;
      }
    }
  }
  return undefined;
}

const executablePath = chromiumExecutableFallback();

/**
 * Suite E2E / API de JAE Paris — voir docs/QA.md.
 *
 * Le serveur n'est PAS démarré par Playwright : on teste une application déjà
 * lancée (next dev sur 3005 en local, serveur standalone en CI) désignée par BASE_URL.
 *
 * Projets :
 *  - setup   : connexion admin via l'API Auth.js → storageState partagé + préchauffage ;
 *  - api     : tests HTTP purs (fixture `request`, aucun navigateur) ;
 *  - desktop : Chromium 1440×900 ;
 *  - mobile  : Chromium 390×844 tactile (isMobile).
 */
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: process.env.PW_WORKERS ? Number(process.env.PW_WORKERS) : isCI ? 2 : undefined,
  // `next dev` compile chaque route à la première visite : marge confortable.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: isCI
    ? [["list"], ["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: BASE_URL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: "setup",
      testMatch: /setup\/.*\.setup\.ts$/,
    },
    {
      name: "api",
      testMatch: /api\/.*\.spec\.ts$/,
      dependencies: ["setup"],
    },
    {
      name: "desktop",
      testMatch: /e2e\/.*\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
    {
      name: "mobile",
      testMatch: /e2e\/.*\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        launchOptions: executablePath ? { executablePath } : {},
      },
    },
  ],
});
