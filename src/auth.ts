import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Role } from "@prisma/client";
import { signInSchema } from "@/lib/auth-validation";
import { hasAuthSecret, isBuildPhase, reportEnvIssues } from "@/lib/env";
import { clearFailedLogins, isLoginAllowed, loginIdentifier, recordFailedLogin } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";
import { RATE_LIMITS, consumeRateLimit, getClientIp } from "@/lib/rate-limit";

const DUMMY_PASSWORD_HASH = "$2b$12$BOzOhJmIVTrjXq37lPscA.Np8E8s5RQh9brdBO5XlIbRC4Rdj9AG6";

// Session admin : 8 heures, puis reconnexion obligatoire.
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const STAFF_ROLES: readonly Role[] = [Role.ADMIN, Role.EDITOR];

reportEnvIssues();
if (!isBuildPhase() && !hasAuthSecret()) {
  console.error("[auth] AUTH_SECRET manquante : toute connexion à l'espace admin échouera (erreur « MissingSecret »). Ajoutez AUTH_SECRET (openssl rand -base64 32) aux variables d'environnement puis redéployez.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Les erreurs Auth.js (configuration, etc.) renvoient vers la page de
  // connexion plutôt que vers la page d'erreur anglaise par défaut.
  pages: { signIn: "/connexion-admin", error: "/connexion-admin" },
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  logger: {
    error(error) {
      const name = error instanceof Error ? error.name : "Error";
      // CredentialsSignin = mauvais identifiants : cas normal, pas une erreur serveur.
      if (name === "CredentialsSignin") return;
      if (name === "JWTSessionError") {
        console.warn("[auth] cookie de session illisible ignoré (expiré, corrompu ou AUTH_SECRET modifié) : l'utilisateur doit se reconnecter.");
        return;
      }
      console.error(`[auth] ${name} :`, error instanceof Error ? error.message : error);
    },
    warn(code) {
      console.warn(`[auth] avertissement : ${code}`);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        try {
          // 1) Limite globale par IP (toutes adresses e-mail confondues).
          const ipLimit = await consumeRateLimit(RATE_LIMITS.loginIp, getClientIp(request));
          if (!ipLimit.allowed) {
            console.warn("[auth] connexion refusée : trop de tentatives depuis cette adresse IP.");
            return null;
          }

          // 2) Verrou 5 échecs / 15 min par couple e-mail + IP.
          const identifier = loginIdentifier(email, request);
          if (!(await isLoginAllowed(identifier))) return null;

          const user = await prisma.user.findUnique({ where: { email } });
          const passwordMatches = await compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

          if (!user || !user.passwordHash || !user.isActive || !passwordMatches || !STAFF_ROLES.includes(user.role)) {
            await recordFailedLogin(identifier);
            return null;
          }

          await Promise.all([
            clearFailedLogins(identifier),
            prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
          ]);

          return { id: user.id, name: user.name, email: user.email, role: user.role };
        } catch (error) {
          console.error("[auth] vérification des identifiants impossible :", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = user.role;
        return token;
      }

      if (typeof token.id !== "string" || !token.id) return null;

      // À chaque lecture de session : le compte doit toujours exister, être
      // actif et membre de l'équipe. Sinon la session est invalidée
      // immédiatement (retour null → cookie supprimé) : désactiver un compte
      // ou lui retirer ses droits coupe l'accès sans attendre l'expiration.
      try {
        const account = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, isActive: true, name: true, email: true },
        });
        if (!account || !account.isActive || !STAFF_ROLES.includes(account.role)) return null;
        token.role = account.role;
        token.name = account.name;
        token.email = account.email;
      } catch (error) {
        // Base momentanément indisponible : on conserve la session (les
        // routes et pages admin revérifient le compte via getCurrentStaff).
        console.error("[auth] vérification du compte impossible :", error);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = typeof token.id === "string" ? token.id : "";
      session.user.role = Object.values(Role).includes(token.role as Role) ? token.role as Role : Role.CUSTOMER;
      return session;
    },
  },
});
