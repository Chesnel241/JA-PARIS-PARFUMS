import type { PaletteKey } from "@/lib/heures";

export type ProductCategory = "PARFUM" | "ACCESSOIRE";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  subtitle: string;
  description: string;
  story: string;
  // Image principale (= images[0]) et galerie complète.
  image: string;
  images: string[];
  /** false : seuls des visuels provisoires (flacon illustré affiché à la place). */
  hasPhoto: boolean;
  accent: string;
  notes: { top: string[]; heart: string[]; base: string[] };
  variants: { volume: string; price: number; stock: number }[];
  // « Les Heures »
  tagline: string;
  family: string;
  moment: string;
  hour: string | null;
  hourFrom: string | null;
  palette: PaletteKey | "";
};

type DemoProduct = Omit<Product, "image" | "hasPhoto" | "accent" | "subtitle">;

// Données de démonstration (seed) : la collection « Les Heures » et le premier
// bijou des Ors. En production, tout est géré depuis l'admin.
const demoProducts: DemoProduct[] = [
  {
    slug: "or-solaire",
    name: "Or Solaire",
    category: "PARFUM",
    tagline: "Un matin d’été sur la peau.",
    family: "Floral hespéridé · musqué",
    moment: "Matin d’été",
    hour: "08:00",
    hourFrom: "06:00",
    palette: "soleil",
    description: "Le néroli et la mandarine ouvrent la fenêtre. La fleur d’oranger et le jasmin réchauffent la peau, puis un musc blanc posé sur le santal garde la lumière jusqu’au soir.",
    story: "Les volets s’ouvrent sur une terrasse encore fraîche. Quelqu’un a cueilli des fleurs d’oranger, une mandarine attend sur la table. Or Solaire, c’est la minute où la journée n’a encore rien demandé, et qu’on emporte avec soi jusqu’au soir.",
    images: ["/parfum-or.svg"],
    notes: { top: ["Néroli", "Mandarine"], heart: ["Fleur d’oranger", "Jasmin"], base: ["Musc blanc", "Santal"] },
    variants: [{ volume: "50 ml", price: 8499, stock: 0 }],
  },
  {
    slug: "illusion",
    name: "Illusion",
    category: "PARFUM",
    tagline: "L’élégance de ce qu’on laisse deviner.",
    family: "Floral fruité · poudré",
    moment: "Entre chien et loup",
    hour: "19:00",
    hourFrom: "16:00",
    palette: "poudre",
    description: "Bois de rose, citron et ananas pour l’éclat. Rose, jasmin et fleurs blanches pour le trouble. Fève tonka et héliotrope pour la douceur qui reste, longtemps après vous.",
    story: "Entre chien et loup, la lumière hésite et les silhouettes se brouillent. On croit reconnaître quelqu’un, on se retourne. Illusion est fait pour ce moment-là, un sillage qui attire le regard sans jamais tout dire.",
    images: ["/maison/illusion-flacon.jpg", "/maison/illusion-cou.jpg", "/maison/illusion-coffret.jpg", "/maison/illusion-table.jpg"],
    notes: { top: ["Bois de rose", "Citron", "Ananas"], heart: ["Rose", "Jasmin", "Fleurs blanches"], base: ["Fève tonka", "Héliotrope"] },
    variants: [{ volume: "50 ml", price: 7000, stock: 0 }, { volume: "100 ml", price: 9500, stock: 12 }],
  },
  {
    slug: "nuit-souveraine",
    name: "Nuit Souveraine",
    category: "PARFUM",
    tagline: "La ville s’éteint. Vous, non.",
    family: "Boisé ambré · épicé",
    moment: "Minuit",
    hour: "00:00",
    hourFrom: "22:00",
    palette: "grenat",
    description: "Le safran et la bergamote s’allument. La rose noire et le bois de gaïac prennent la nuit. L’oud et une vanille presque fumée signent un sillage magnétique.",
    story: "Minuit passé, la ville baisse la voix. Le safran brûle doucement, la rose noire s’ouvre dans l’obscurité, l’oud et la vanille fumée s’installent. Nuit Souveraine ne cherche pas l’attention. Elle la garde.",
    images: ["/parfum-noir.svg"],
    notes: { top: ["Safran", "Bergamote"], heart: ["Rose noire", "Bois de gaïac"], base: ["Oud", "Vanille fumée"] },
    variants: [{ volume: "50 ml", price: 8499, stock: 0 }],
  },
  {
    slug: "esther",
    name: "Esther",
    category: "ACCESSOIRE",
    tagline: "Boucles d’oreilles en laiton doré",
    family: "",
    moment: "",
    hour: null,
    hourFrom: null,
    palette: "",
    description: "Le premier bijou des Ors. Du laiton doré qui attrape la lumière, à porter avec le parfum de votre heure.",
    story: "Pensées comme la dernière note d’un sillage, les boucles Esther se portent seules ou avec votre heure. Vaporisez votre parfum, laissez-le sécher, puis mettez vos bijoux : le laiton doré garde mieux son éclat loin de l’eau, du parfum et des crèmes.",
    images: ["/maison/placeholder-bijou.svg"],
    notes: { top: [], heart: [], base: [] },
    variants: [{ volume: "Taille unique", price: 1000, stock: 20 }],
  },
];

export const products = demoProducts;

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    // Affiche les centimes uniquement lorsqu'ils existent (« 145 € » mais « 5,90 € »).
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
