import Link from "next/link";
import { ArrowIcon } from "@/components/maison/icons";

export default function ProductNotFound() {
  return (
    <section className="wrap statut" aria-labelledby="status-title">
      <span className="tag">Création introuvable</span>
      <h1 id="status-title" className="h-lg">Ce sillage s’est <span className="serif">évaporé.</span></h1>
      <p className="lead">Cette création n’existe pas ou n’est plus disponible. Découvrez le reste de la collection.</p>
      <div className="btn-row">
        <Link className="btn" href="/boutique">Les parfums<span className="ico"><ArrowIcon /></span></Link>
        <Link className="btn btn-line" href="/accessoires">Les Ors</Link>
      </div>
    </section>
  );
}
