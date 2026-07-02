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
      category: product.category,
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

  const demoArticles = [
    {
      slug: "secrets-de-fabrication",
      title: "Les secrets de fabrication de nos parfums",
      excerpt: "Des matières premières à la mise en flacon, plongée dans l'atelier où naissent nos sillages.",
      content: "Chaque parfum JAE naît d'une rencontre entre un nez, une émotion et des matières d'exception.\n\nNous sélectionnons chaque ingrédient à la main : safran de Taliouine, rose centifolia de Grasse, santal de Nouvelle-Calédonie. Les accords reposent ensuite plusieurs semaines, le temps que la matière s'exprime pleinement.\n\nC'est ce temps long, rare dans l'industrie, qui donne à nos créations leur profondeur et leur tenue.",
      coverImage: "/craft.jpg",
    },
    {
      slug: "choisir-sa-signature-olfactive",
      title: "L'art de choisir sa signature olfactive",
      excerpt: "Un parfum n'est pas un accessoire : c'est une présence. Nos conseils pour trouver la vôtre.",
      content: "Choisir un parfum, c'est choisir la trace que l'on laisse.\n\nCommencez par identifier la famille qui vous attire : boisée, florale, ambrée. Portez ensuite le parfum sur peau une journée entière — un sillage se révèle dans le temps, jamais sur une mouillette.\n\nEnfin, écoutez les autres : une signature olfactive se reconnaît aux compliments qu'elle provoque.",
      coverImage: "/essence.jpg",
    },
    {
      slug: "coulisses-illusion",
      title: "Dans les coulisses de la création d'Illusion",
      excerpt: "Notre best-seller a demandé dix-huit mois de travail. Récit d'une obsession.",
      content: "Illusion devait capturer un moment précis : la lumière dorée d'une fin d'après-midi d'été.\n\nDix-huit mois de travail, quarante-trois essais, une concentration en parfum de 24 %. Le résultat : un floral lumineux enveloppé d'un musc délicat, devenu la signature de la maison.\n\nIllusion est aujourd'hui notre création la plus portée — et celle dont nous sommes le plus fiers.",
      coverImage: "/bestseller.jpg",
    },
  ];

  for (const article of demoArticles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: { ...article, isPublished: true, publishedAt: new Date() },
    });
  }

  console.info(`Administrateur initialisé : ${email}`);
  console.info(`${products.length} produits de démonstration synchronisés.`);
  console.info(`${demoArticles.length} articles de démonstration synchronisés.`);
}

main()
  .catch((error) => {
    console.error("Échec de l'initialisation de la base.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
