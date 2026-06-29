import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD sont requis.");

const prisma = new PrismaClient();

function createCookieJar() {
  const cookies = new Map();
  return {
    absorb(response) {
      for (const header of response.headers.getSetCookie()) {
        const [pair] = header.split(";", 1);
        const separator = pair.indexOf("=");
        cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
      }
    },
    header() {
      return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    },
  };
}

async function signIn(candidatePassword, jar = createCookieJar()) {
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, { headers: { cookie: jar.header() } });
  jar.absorb(csrfResponse);
  const { csrfToken } = await csrfResponse.json();

  const response = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: jar.header(),
      "content-type": "application/x-www-form-urlencoded",
      "x-auth-return-redirect": "1",
    },
    body: new URLSearchParams({ email, password: candidatePassword, csrfToken, callbackUrl: `${baseUrl}/admin` }),
  });
  jar.absorb(response);
  const data = await response.json();
  return { response, data, jar };
}

try {
  await prisma.loginAttempt.deleteMany();

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const result = await signIn("mot-de-passe-volontairement-faux");
    if (!result.data.url?.includes("CredentialsSignin")) throw new Error(`Échec non reconnu à la tentative ${attempt}.`);
  }

  const blockedAttempt = await prisma.loginAttempt.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!blockedAttempt?.blockedUntil || blockedAttempt.attempts !== 5) throw new Error("Le verrouillage après cinq échecs n’a pas été créé.");
  console.info("✓ Limitation à cinq tentatives validée");

  const blockedLogin = await signIn(password);
  if (!blockedLogin.data.url?.includes("CredentialsSignin")) throw new Error("Une connexion bloquée a été acceptée.");
  console.info("✓ Connexion refusée pendant la période de blocage");

  await prisma.loginAttempt.deleteMany();
  const authenticated = await signIn(password);
  if (!authenticated.response.ok || authenticated.data.url?.includes("error=")) throw new Error("La connexion administrateur a échoué.");

  const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie: authenticated.jar.header() } });
  const session = await sessionResponse.json();
  if (session.user?.email !== email.toLowerCase() || session.user?.role !== "ADMIN") throw new Error("La session ne contient pas l’administrateur attendu.");
  console.info("✓ Session administrateur Auth.js validée");

  const adminResponse = await fetch(`${baseUrl}/admin`, { headers: { cookie: authenticated.jar.header() }, redirect: "manual" });
  const adminHtml = await adminResponse.text();
  if (adminResponse.status !== 200 || !adminHtml.includes("Session sécurisée")) throw new Error("Le back-office protégé n’est pas accessible.");
  console.info("✓ Back-office protégé accessible avec la session");
} finally {
  await prisma.loginAttempt.deleteMany();
  await prisma.$disconnect();
}
