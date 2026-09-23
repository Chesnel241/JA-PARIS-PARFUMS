// Données structurées schema.org. Le contenu est sérialisé et « < » échappé
// pour qu'aucune valeur (titre d'article, etc.) ne puisse fermer la balise.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
