// Aides pour next/image sur le site public.

/** Les médias servis par l'API (/api/media/<id>) sont déjà optimisés à l'upload. */
export function isApiMedia(src: string) {
  return src.startsWith("/api/media/");
}

/**
 * Les visuels détourés (PNG/SVG, ex. flacons) se présentent en entier sur un
 * fond neutre ; les photos remplissent leur cadre.
 */
export function imageFit(src: string): "contain" | "cover" {
  return /\.(svg|png)(\?.*)?$/i.test(src) ? "contain" : "cover";
}
