import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { products } from "../src/lib/data";

const prisma = new PrismaClient();

const seedEnvironment = z.object({
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(12),
});

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = seedEnvironment.parse(process.env);
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await hash(ADMIN_PASSWORD, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, isActive: true },
    create: {
      name: "Maison JAE",
      email,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  for (const [productIndex, product] of products.entries()) {
    const variants = product.variants.map((variant, variantIndex) => ({
      sku: `JAE-${String(productIndex + 1).padStart(2, "0")}-${String(variantIndex + 1).padStart(2, "0")}`,
      volume: variant.volume,
      price: variant.price,
      stock: variant.stock,
      isActive: true,
    }));
    const data = {
      name: product.name,
      description: product.description,
      story: product.story,
      images: [product.image],
      notesTop: product.notes.top,
      notesHeart: product.notes.heart,
      notesBase: product.notes.base,
      isActive: true,
    };

    await prisma.product.upsert({
      where: { slug: product.slug },
      update: { ...data, variants: { deleteMany: {}, create: variants } },
      create: { slug: product.slug, ...data, variants: { create: variants } },
    });
  }

  console.info(`Administrateur initialisé : ${email}`);
  console.info(`${products.length} produits de démonstration synchronisés.`);
}

main()
  .catch((error) => {
    console.error("Échec de l'initialisation de la base.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
