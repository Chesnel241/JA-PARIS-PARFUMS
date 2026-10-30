import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { SITE_NAME, getSiteUrl } from "@/components/site/seo";
import "./globals.css";

// Polices de l'administration. La boutique charge les siennes (Newsreader et
// Schibsted Grotesk, voir site-chrome.tsx) : pas de préchargement ici.
const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap", preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: `${SITE_NAME} — Maison de parfum parisienne`, template: `%s — ${SITE_NAME}` },
  description: "Trois eaux de parfum composées à Paris, une pour chaque heure du jour, et des bijoux dorés. Livraison offerte dès 50 €.",
  applicationName: SITE_NAME,
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: { type: "website", locale: "fr_FR", siteName: SITE_NAME },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Posé avant le premier affichage : permet au CSS de préparer les animations
// d'apparition, sans jamais masquer le contenu si JavaScript ne s'exécute pas
// (voir le filet de sécurité « reveal-failsafe » dans src/styles/maison.css).
const bootScript = "document.documentElement.classList.add('js')";

// Layout racine minimal : la boutique ((site)) et l'administration (admin,
// connexion-admin) ont chacune leur propre layout et leur propre feuille de style.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
