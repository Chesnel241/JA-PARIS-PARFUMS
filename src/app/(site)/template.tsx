// Chaque navigation rejoue une courte apparition de la page (désactivée en mouvement réduit).
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="view">{children}</div>;
}
