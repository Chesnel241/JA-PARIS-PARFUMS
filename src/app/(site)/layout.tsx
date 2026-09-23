import { CartProvider } from "@/lib/cart";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "@/styles/site.css";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartProvider><SiteHeader /><main>{children}</main><SiteFooter /></CartProvider>
  );
}
