import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="page-shell cm-notfound">
      <p className="eyebrow">Création introuvable</p>
      <h1>Ce sillage s’est <em>évaporé.</em></h1>
      <p>Cette création n’existe pas ou n’est plus disponible. Découvrez le reste de la collection.</p>
      <div className="cm-notfound__links">
        <Link className="primary-button" href="/boutique">Les parfums</Link>
        <Link className="cm-button-ghost" href="/accessoires">Les accessoires</Link>
      </div>
    </div>
  );
}
