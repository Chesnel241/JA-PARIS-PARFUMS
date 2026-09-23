"use client";

import { ErrorView } from "@/components/site/status-views";

// Erreur dans une page publique : l'en-tête et le pied de page restent affichés.
export default function SiteError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} />;
}
