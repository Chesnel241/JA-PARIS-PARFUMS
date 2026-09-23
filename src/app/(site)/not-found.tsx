import { NotFoundView } from "@/components/site/status-views";

export const metadata = { title: "Page introuvable", robots: { index: false } };

export default function SiteNotFound() {
  return <NotFoundView />;
}
