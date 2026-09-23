"use client";

import { ErrorView } from "@/components/site/status-views";
import "@/styles/site.css";

// Erreur hors du groupe (site) : pas d'habillage, mais la même mise en page sobre.
export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="site-shell"><ErrorView {...props} /></div>;
}
