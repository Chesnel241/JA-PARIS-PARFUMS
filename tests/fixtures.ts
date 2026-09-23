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
  // Serveur de test en HTTP uniquement : la CSP `upgrade-insecure-requests` fait passer en https://
  // les redirections (ex. préchargement du lien /admin du pied de page → /connexion-admin), ce qui
  // échoue localement/en CI mais pas en production (HTTPS). Next retombe alors sur une navigation normale.
  ...(BASE_URL.startsWith("http://")
    ? [/net::ERR_SSL_PROTOCOL_ERROR \(https:\/\//, /Failed to fetch RSC payload for [^]*Falling back to browser navigation/]
    : []),
];

export function collectProblems(page: Page): PageProblems {
  const problems: PageProblems = { consoleErrors: [], pageErrors: [], failedResponses: [] };
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() !== "error") return;
    const location = message.location();
    const entry = `${message.text()}${location.url ? ` (${location.url}:${location.lineNumber})` : ""}`;
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(entry))) return;
    problems.consoleErrors.push(entry);
  });
  page.on("pageerror", (error) => problems.pageErrors.push(`${error.name}: ${error.message}`));
  page.on("response", (response) => {
    if (response.status() >= 400 && response.url().startsWith(BASE_URL)) {
      problems.failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return problems;
}

// Chaque test simule une IP client distincte : les limites de débit par IP
// (commandes, candidatures, newsletter) ne se déclenchent pas d'un test à l'autre.
// Un test peut toujours imposer ses propres en-têtes sur une requête donnée.
function uniqueClientIp() {
  const byte = () => Math.floor(Math.random() * 254) + 1;
  return `10.${byte()}.${byte()}.${byte()}`;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide) => {
    await provide({ ...extraHTTPHeaders, "x-real-ip": uniqueClientIp() });
  },
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
