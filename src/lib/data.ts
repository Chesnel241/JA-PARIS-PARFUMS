export type Product = {
  slug: string;
  name: string;
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
    subtitle: "Eau de parfum · Floral épicé",
    description: "Une rose sans sagesse, électrisée par le poivre rose et enveloppée de patchouli velours.",
    story: "Elle entre sans attendre d’être invitée. La rose classique se défait de ses habitudes et laisse derrière elle une impression inoubliable.",
    image: "/parfum-rose.svg",
    accent: "#a86a6a",
    notes: { top: ["Poivre rose", "Litchi"], heart: ["Rose centifolia", "Iris"], base: ["Patchouli", "Ambrette"] },
    variants: [{ volume: "50 ml", price: 13500, stock: 4 }, { volume: "100 ml", price: 20500, stock: 0 }],
  },
];

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
