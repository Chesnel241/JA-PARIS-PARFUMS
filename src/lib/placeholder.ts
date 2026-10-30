// Visuels provisoires (flacons vectoriels historiques, bijou de démonstration) :
// tant qu'un produit n'a que ceux-là, le site affiche à la place sa « scène »
// illustrée aux couleurs du parfum.
const PLACEHOLDER_PATTERN = /^\/(?:parfum-(?:or|noir|rose)|maison\/placeholder-[a-z-]+)\.svg$/;

export function isPlaceholderImage(src: string | null | undefined): boolean {
  return typeof src === "string" && PLACEHOLDER_PATTERN.test(src);
}
