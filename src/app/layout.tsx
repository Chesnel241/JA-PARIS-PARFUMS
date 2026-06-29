import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "JAE Paris — Parfums de caractère", template: "%s — JAE Paris" },
  description: "Maison parisienne de parfums de caractère. Découvrez la collection JAE Paris.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr"><body className={`${display.variable} ${sans.variable}`}>
      <CartProvider><SiteHeader /><main>{children}</main><SiteFooter /></CartProvider>
    </body></html>
  );
}
