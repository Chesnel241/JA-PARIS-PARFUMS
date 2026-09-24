import type { Metadata, Viewport } from "next";
import { Archivo, Cormorant_Garamond, Inter } from "next/font/google";
import { SITE_NAME, getSiteUrl } from "@/components/site/seo";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Boutique : sans-serif large et géométrique (axe de chasse « wdth »), en capitales.
const brand = Archivo({ subsets: ["latin"], variable: "--font-brand", axes: ["wdth"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: `${SITE_NAME} — Maison de parfum parisienne`, template: `%s — ${SITE_NAME}` },
  description: "Parfums et bijoux en laiton doré, composés à Paris. Livraison offerte dès 50 €.",
  applicationName: SITE_NAME,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { type: "website", locale: "fr_FR", siteName: SITE_NAME },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f3",
  width: "device-width",
  initialScale: 1,
};

// Posé avant le premier affichage : permet au CSS de préparer les animations
// d'apparition, sans jamais masquer le contenu si JavaScript ne s'exécute pas
// (voir le filet de sécurité « reveal-failsafe » dans src/styles/experience.css).
const bootScript = "document.documentElement.classList.add('js')";

// Layout racine minimal : la boutique ((site)) et l'administration (admin,
// connexion-admin) ont chacune leur propre layout et leur propre feuille de style.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className={`${display.variable} ${sans.variable} ${brand.variable}`}>{children}</body>
    </html>
  );
}
