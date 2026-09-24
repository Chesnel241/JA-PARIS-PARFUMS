// Remonté à chaque navigation : fondu d'entrée léger du contenu (CSS, voir
// .page-view dans src/styles/experience.css). Rien au premier chargement.
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-view">{children}</div>;
}
