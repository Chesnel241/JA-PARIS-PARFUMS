import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { AddToCart } from "@/components/add-to-cart";
import { getPublicProduct } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();

  const isAccessory = product.category === "ACCESSOIRE";
  const hasNotes = product.notes.top.length > 0 || product.notes.heart.length > 0 || product.notes.base.length > 0;

  return <div className="product-page"><Link className="back-link" href={isAccessory ? "/accessoires" : "/boutique"}><ArrowLeft size={16} /> {isAccessory ? "Les accessoires" : "La collection"}</Link><div className="product-detail"><div className="detail-visual" style={{ backgroundColor: `${product.accent}20` }}><Image src={product.image} alt={product.name} width={650} height={760} priority /><span className="detail-mark">JAE</span></div><div className="detail-copy"><p className="eyebrow">JAE Paris · {product.variants[0].volume}</p><h1>{product.name}</h1><p className="detail-subtitle">{product.subtitle}</p><p className="detail-description">{product.description}</p><AddToCart product={product} /><div className="trust-row"><span><ShieldCheck /> Paiement sécurisé</span><span><Truck /> Livraison offerte dès 50 €</span><span><RotateCcw /> Retours sous 14 jours</span></div></div></div><section className="olfactory"><div><p className="eyebrow">Le récit</p><h2>{isAccessory ? <>Une pièce<br /><em>à part.</em></> : <>Une nuit<br /><em>à soi.</em></>}</h2><p>{product.story}</p></div>{hasNotes ? <div className="notes"><h3>La signature olfactive</h3>{(["top", "heart", "base"] as const).map((level, index) => <div className="note-line" key={level}><span>0{index + 1}</span><small>{level === "top" ? "Notes de tête" : level === "heart" ? "Notes de cœur" : "Notes de fond"}</small><p>{product.notes[level].join(" · ")}</p></div>)}</div> : null}</section></div>;
}
