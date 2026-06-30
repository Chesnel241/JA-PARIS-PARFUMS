export type ProductCategory = "PARFUM" | "ACCESSOIRE";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  subtitle: string;
  description: string;
  story: string;
  image: string;
  accent: string;
  notes: { top: string[]; heart: string[]; base: string[] };
  variants: { volume: string; price: number; stock: number }[];
};

export const products: Product[] = [
  {
    slug: "nuit-souveraine",
    name: "Nuit Souveraine",
    category: "PARFUM",
    subtitle: "Extrait de parfum · Boisé ambré",
    description: "Un sillage magnétique où le safran rencontre les bois sombres et une vanille presque fumée.",
    story: "Paris après minuit. Les pierres encore tièdes, les lumières qui se reflètent sur l’asphalte et cette sensation rare que la ville entière vous appartient.",
    image: "/parfum-noir.svg",
    accent: "#9b6b43",
    notes: { top: ["Safran", "Bergamote"], heart: ["Rose noire", "Bois de gaïac"], base: ["Oud", "Vanille fumée"] },
    variants: [{ volume: "50 ml", price: 14500, stock: 12 }, { volume: "100 ml", price: 22000, stock: 7 }],
  },
  {
    slug: "or-solaire",
    name: "Or Solaire",
    category: "PARFUM",
    subtitle: "Eau de parfum · Floral lumineux",
    description: "Une lumière dorée sur la peau, dessinée par la fleur d’oranger, le néroli et un musc délicat.",
    story: "Le souvenir d’un matin d’été, volets entrouverts sur une chambre claire. Une fragrance radieuse, tendre et pleinement vivante.",
    image: "/parfum-or.svg",
    accent: "#c29a52",
    notes: { top: ["Néroli", "Mandarine"], heart: ["Fleur d’oranger", "Jasmin"], base: ["Musc blanc", "Santal"] },
    variants: [{ volume: "50 ml", price: 13500, stock: 18 }, { volume: "100 ml", price: 20500, stock: 9 }],
  },
  {
    slug: "rose-insolente",
    name: "Rose Insolente",
    category: "PARFUM",
    subtitle: "Eau de parfum · Floral épicé",
    description: "Une rose sans sagesse, électrisée par le poivre rose et enveloppée de patchouli velours.",
    story: "Elle entre sans attendre d’être invitée. La rose classique se défait de ses habitudes et laisse derrière elle une impression inoubliable.",
    image: "/parfum-rose.svg",
    accent: "#a86a6a",
    notes: { top: ["Poivre rose", "Litchi"], heart: ["Rose centifolia", "Iris"], base: ["Patchouli", "Ambrette"] },
    variants: [{ volume: "50 ml", price: 13500, stock: 4 }, { volume: "100 ml", price: 20500, stock: 0 }],
  },
  {
    slug: "boucles-soleil",
    name: "Boucles Soleil",
    category: "ACCESSOIRE",
    subtitle: "Boucles d’oreilles · Laiton doré",
    description: "Des boucles d’oreilles sculpturales en laiton doré à l’or fin, inspirées des rayons du soleil.",
    story: "Pensées comme une signature, elles prolongent le geste du parfum : une présence solaire qui attrape la lumière à chaque mouvement.",
    image: "/essence.jpg",
    accent: "#c29a52",
    notes: { top: [], heart: [], base: [] },
    variants: [{ volume: "Taille unique", price: 12000, stock: 8 }],
  },
  {
    slug: "anneau-elegance",
    name: "Anneau Élégance",
    category: "ACCESSOIRE",
    subtitle: "Bague ondulée · Laiton doré",
    description: "Une bague ondulée en laiton doré, façonnée à la main, aux courbes organiques et intemporelles.",
    story: "Une pièce unique qui épouse la main comme une seconde peau, dans le prolongement de l’univers JAE.",
    image: "/craft.jpg",
    accent: "#9b6b43",
    notes: { top: [], heart: [], base: [] },
    variants: [{ volume: "Taille unique", price: 9500, stock: 10 }],
  },
];

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    // Affiche les centimes uniquement lorsqu'ils existent (« 145 € » mais « 5,90 € »).
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
