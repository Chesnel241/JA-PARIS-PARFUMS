import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Role } from "@prisma/client";
import { signInSchema } from "@/lib/auth-validation";
import { clearFailedLogins, isLoginAllowed, loginIdentifier, recordFailedLogin } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";

const DUMMY_PASSWORD_HASH = "$2b$12$BOzOhJmIVTrjXq37lPscA.Np8E8s5RQh9brdBO5XlIbRC4Rdj9AG6";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  pages: { signIn: "/connexion-admin" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
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
        const identifier = loginIdentifier(email, request);
        if (!(await isLoginAllowed(identifier))) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        const passwordMatches = await compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

        if (!user || !user.passwordHash || !user.isActive || !passwordMatches || user.role === Role.CUSTOMER) {
          await recordFailedLogin(identifier);
          return null;
        }

        await Promise.all([
          clearFailedLogins(identifier),
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
        ]);

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
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
