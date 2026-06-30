import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Role } from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { ProductAdminActions } from "@/components/product-admin-actions";
import { requireStaff } from "@/lib/auth-guard";
import { formatPrice } from "@/lib/data";
import { listAdminProducts } from "@/lib/product-service";

export const metadata = { title: "Produits · Maison" };

export default async function AdminProductsPage() {
  const [user, products] = await Promise.all([requireStaff(), listAdminProducts()]);
  return <AdminShell user={user}>
    <header className="admin-content-header"><div><p>Catalogue</p><h1>Le catalogue.</h1></div><Link className="admin-create-button" href="/admin/produits/nouveau"><Plus /> Nouveau produit</Link></header>
    <div className="admin-product-list">
      <div className="admin-product-list-head"><span>Produit</span><span>Variantes</span><span>Stock</span><span>Statut</span><span>Actions</span></div>
      {products.length === 0 ? <div className="admin-empty">Aucun parfum. La page blanche, mais avec un meilleur sillage.</div> : products.map((product) => {
        const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        const startingPrice = product.variants[0]?.price;
        return <article className="admin-product-row" key={product.id}>
          <div className="admin-product-identity"><div className="admin-product-thumb">{product.images[0] && <Image src={product.images[0]} alt="" width={64} height={80} />}</div><div><Link href={`/admin/produits/${product.id}`}>{product.name}</Link><small>{product.category === "ACCESSOIRE" ? "Accessoire" : "Parfum"} · {startingPrice === undefined ? "Sans prix" : `Dès ${formatPrice(startingPrice)}`} · /{product.slug}</small></div></div>
          <span>{product.variants.length}</span><span className={stock <= 5 ? "low-stock" : ""}>{stock}</span><span><i className={product.isActive ? "published" : "draft"} />{product.isActive ? "Publié" : "Brouillon"}</span>
          <ProductAdminActions id={product.id} name={product.name} isActive={product.isActive} canDelete={user.role === Role.ADMIN} />
        </article>;
      })}
    </div>
  </AdminShell>;
}
