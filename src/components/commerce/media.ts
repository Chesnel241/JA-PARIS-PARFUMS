// Aides pour afficher sans risque les visuels produits avec next/image.
// Les images peuvent être : un chemin local ("/parfum-noir.svg"), un média
// téléversé ("/api/media/<id>") ou une URL distante. Une valeur inattendue
// ne doit jamais faire planter le rendu (next/image lève une erreur sur une
// URL mal formée ou un hôte non autorisé).

export const FALLBACK_PRODUCT_IMAGE = "/parfum-noir.svg";

export function safeImageSrc(src: unknown): string {
  if (typeof src !== "string") return FALLBACK_PRODUCT_IMAGE;
  const value = src.trim();
  if (!value) return FALLBACK_PRODUCT_IMAGE;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  // La CSP applique upgrade-insecure-requests : on aligne l'URL en https,
  // seul protocole distant autorisé par next.config (remotePatterns).
  const candidate = value.startsWith("http://") ? `https://${value.slice("http://".length)}` : value;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : FALLBACK_PRODUCT_IMAGE;
  } catch {
    return FALLBACK_PRODUCT_IMAGE;
  }
}

// Les médias servis par l'API sont déjà optimisés et privés de cache long :
// on évite de les faire repasser par l'optimiseur d'images.
export function isUnoptimizedImage(src: string): boolean {
  return src.startsWith("/api/media/") || src.endsWith(".svg");
}

// Les flacons vectoriels se présentent « posés » (contain) ; les photos
// remplissent le cadre (cover).
export function isVectorImage(src: string): boolean {
  return /\.svg(\?.*)?$/i.test(src);
}
