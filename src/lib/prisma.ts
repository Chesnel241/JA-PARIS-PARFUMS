import { PrismaClient } from "@prisma/client";
import { reportEnvIssues } from "@/lib/env";

// Client Prisma unique par instance (serverless) et par process de dev (HMR) :
// on le mémorise sur globalThis dans TOUS les environnements, ce qui évite
// d'ouvrir un nouveau pool de connexions à chaque rechargement de module.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  reportEnvIssues();
  return new PrismaClient({
    // En production, les erreurs de requêtes sont remontées à l'appelant et
    // journalisées une seule fois par les routes (préfixe [api:…]) : on évite
    // ainsi de polluer les logs avec les erreurs attendues (P2002, P2025…).
    log: process.env.NODE_ENV === "production" ? ["warn"] : ["warn", "error"],
    errorFormat: process.env.NODE_ENV === "production" ? "minimal" : "pretty",
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;

export default prisma;
