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

  for (const product of products) {
    // SKU stable, dérivé du slug et de la contenance (ex. JAE-ILLUSION-100-ML).
    const variants = product.variants.map((variant) => ({
      sku: `JAE-${product.slug}-${variant.volume}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64),
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
      images: product.images,
      notesTop: product.notes.top,
      notesHeart: product.notes.heart,
      notesBase: product.notes.base,
      tagline: product.tagline,
      family: product.family,
      moment: product.moment,
      hour: product.hour,
      hourFrom: product.hourFrom,
      palette: product.palette,
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
      slug: "ou-vaporiser-son-parfum",
      title: "Où vaporiser son parfum pour que le sillage dure",
      excerpt: "Un bon parfum mal posé disparaît en une heure. Cinq gestes simples changent tout.",
      content: [
        "Un bon parfum mal posé disparaît en une heure. Cinq gestes simples changent tout.",
        [
          "1. Sur les points chauds — Le cou, l’arrière des oreilles, l’intérieur des poignets et des coudes. La chaleur de la peau diffuse le parfum autour de vous.",
          "2. Sans frotter — Frotter ses poignets l’un contre l’autre écrase les notes de tête et accélère leur évaporation. Laissez sécher, tout simplement.",
          "3. Sur une peau hydratée — Une peau sèche retient moins bien le parfum. Une crème neutre appliquée juste avant aide le sillage à tenir.",
          "4. À 15 ou 20 centimètres — Assez loin pour couvrir une zone, assez près pour ne pas perdre la moitié du parfum dans l’air.",
          "5. Sur les vêtements, avec prudence — Les fibres gardent l’odeur longtemps. Testez d’abord sur une zone cachée : certaines matières claires ou fragiles peuvent marquer.",
        ].join("\n"),
      ].join("\n\n"),
      coverImage: "/maison/illusion-cou.jpg",
    },
    {
      slug: "choisir-sa-signature-olfactive",
      title: "L'art de choisir sa signature olfactive",
      excerpt: "Un parfum n'est pas un accessoire : c'est une présence. Nos conseils pour trouver la vôtre.",
      content: "Choisir un parfum, c'est choisir la trace que l'on laisse.\n\nCommencez par identifier la famille qui vous attire : boisée, florale, ambrée. Portez ensuite le parfum sur peau une journée entière — un sillage se révèle dans le temps, jamais sur une mouillette.\n\nEnfin, écoutez les autres : une signature olfactive se reconnaît aux compliments qu'elle provoque.",
      coverImage: "/maison/illusion-table.jpg",
    },
  ];

  for (const article of demoArticles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: { ...article, isPublished: true, publishedAt: new Date() },
    });
  }

  // Ambassadrices et boutiques de démonstration : créées une seule fois,
  // ensuite entièrement gérées depuis l'admin (/admin/ambassadrices, /admin/boutiques).
  if ((await prisma.ambassador.count()) === 0) {
    await prisma.ambassador.createMany({
      data: [
        { name: "Inès", role: "Photographe", photo: "/essence.jpg", description: "Elle collectionne les lumières fugaces et porte Or Solaire comme une seconde peau.", sortOrder: 1 },
        { name: "Aïcha", role: "Architecte", photo: "/craft.jpg", description: "Son élégance est précise, son sillage ne l'est jamais. Nuit Souveraine lui ressemble.", sortOrder: 2 },
        { name: "Clara", role: "Danseuse", photo: "/newsletter.jpg", description: "Libre, instinctive, intensément présente. Rose Insolente était une évidence.", sortOrder: 3 },
      ],
    });
  }

  if ((await prisma.store.count()) === 0) {
    await prisma.store.create({
      data: { name: "Maison JAE · Paris", address: "24, rue du Bac", city: "75007 Paris", country: "France", phone: "+33 1 84 80 20 24", openingHours: "Lun–Sam · 10h30–19h", image: "/bestseller.jpg", sortOrder: 1 },
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
