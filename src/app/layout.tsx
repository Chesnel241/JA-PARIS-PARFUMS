import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "JAE Paris — Parfums de caractère", template: "%s — JAE Paris" },
  description: "Maison parisienne de parfums de caractère. Découvrez la collection JAE Paris.",
};

// Layout racine minimal : la boutique ((site)) et l'administration (admin,
// connexion-admin) ont chacune leur propre layout et leur propre feuille de style.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr"><body className={`${display.variable} ${sans.variable}`}>{children}</body></html>
  );
}
