import { test as base, expect, type APIRequestContext, type ConsoleMessage, type Page } from "@playwright/test";
import { ADMIN_STATE_PATH, BASE_URL } from "./helpers/env";

export type PageProblems = {
  consoleErrors: string[];
  pageErrors: string[];
  /** Réponses HTTP >= 400 sur l'origine testée (hors navigation principale attendue). */
  failedResponses: string[];
};

type TestFixtures = {
  /** Erreurs console / pageerror / réponses en échec collectées pour la page courante. */
  problems: PageProblems;
};

type WorkerFixtures = {
  /** Contexte HTTP authentifié en admin (storageState produit par le projet `setup`). */
  adminRequest: APIRequestContext;
};

// Bruits connus sans rapport avec l'application (à garder minimal et justifié).
const IGNORED_CONSOLE = [
  /Download the React DevTools/i,
  /\[HMR\]/,
  /\[Fast Refresh\]/,
];

export function collectProblems(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], pageErrors: [], failedResponses: [] };
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    const location = message.location();
    problems.consoleErrors.push(`${text}${location.url ? ` (${location.url}:${location.lineNumber})` : ""}`);
  });
  page.on("pageerror", (error) => problems.pageErrors.push(`${error.name}: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(BASE_URL)) {
      problems.failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return problems;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  adminRequest: [
    async ({ playwright }, provide) => {
      const context = await playwright.request.newContext({ baseURL: BASE_URL, storageState: ADMIN_STATE_PATH });
      await provide(context);
      await context.dispose();
    },
    { scope: "worker" },
  ],
  problems: async ({ page }, provide) => {
    await provide(collectProblems(page));
  },
});

export { expect };
