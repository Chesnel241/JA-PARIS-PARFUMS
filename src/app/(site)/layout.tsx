import { SiteChrome } from "@/components/site/site-chrome";
import "@/styles/site.css";
import "@/styles/commerce.css";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteChrome>{children}</SiteChrome>;
}
