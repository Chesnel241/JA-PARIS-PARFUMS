"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, AtSign, Clock, Eye, EyeOff, LoaderCircle, MapPin, Pencil, Phone, Trash2 } from "lucide-react";
import { adminRequest } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { instagramHandle } from "@/components/admin/format";
import { useToast } from "@/components/admin/toast";
import { Badge } from "@/components/admin/ui";

export type AmbassadorItem = { id: string; name: string; role: string; photo: string; description: string; instagram: string | null; isActive: boolean; sortOrder: number };
export type StoreItem = { id: string; name: string; address: string; city: string; country: string; phone: string | null; openingHours: string; image: string; isActive: boolean; sortOrder: number };

export function ambassadorPayload(item: AmbassadorItem) {
  return { name: item.name, role: item.role, photo: item.photo, description: item.description, instagram: item.instagram ?? "", isActive: item.isActive, sortOrder: item.sortOrder };
}

export function storePayload(item: StoreItem) {
  return { name: item.name, address: item.address, city: item.city, country: item.country, phone: item.phone ?? "", openingHours: item.openingHours, image: item.image, isActive: item.isActive, sortOrder: item.sortOrder };
}

type Config<T> = {
  endpoint: string;
  editBase: string;
  noun: string;
  payload: (item: T) => object;
};

const CONFIG = {
  ambassador: { endpoint: "/api/admin/ambassadors", editBase: "/admin/ambassadrices", noun: "l'ambassadrice", payload: ambassadorPayload } as Config<AmbassadorItem>,
  store: { endpoint: "/api/admin/stores", editBase: "/admin/boutiques", noun: "la boutique", payload: storePayload } as Config<StoreItem>,
};

type BoardProps = { kind: "ambassador"; items: AmbassadorItem[] } | { kind: "store"; items: StoreItem[] };

// Grille des ambassadrices ou des boutiques : ordre d'affichage (flèches),
// activation, modification et suppression avec confirmation.
export function CommunityBoard(props: BoardProps) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const config = CONFIG[props.kind] as Config<AmbassadorItem | StoreItem>;
  const [items, setItems] = useState<(AmbassadorItem | StoreItem)[]>(props.items);
  const [busyId, setBusyId] = useState("");
  const [reordering, setReordering] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => { setItems(props.items); }, [props.items]);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    const renumbered = next.map((item, position) => ({ ...item, sortOrder: (position + 1) * 10 }));
    const changed = renumbered.filter((item) => items.find((original) => original.id === item.id)?.sortOrder !== item.sortOrder);
    const previous = items;
    setItems(renumbered);
    setReordering(true);
    for (const item of changed) {
      const result = await adminRequest(`${config.endpoint}/${item.id}`, { method: "PUT", json: config.payload(item) });
      if (!result.ok) {
        setItems(previous);
        setReordering(false);
        toast.apiError(result, "Ordre non enregistré");
        startTransition(() => router.refresh());
        return;
      }
    }
    setReordering(false);
    toast.success("Ordre d'affichage enregistré");
    startTransition(() => router.refresh());
  }

  async function toggle(item: AmbassadorItem | StoreItem) {
    setBusyId(item.id);
    const result = await adminRequest(`${config.endpoint}/${item.id}`, { method: "PATCH", json: { isActive: !item.isActive } });
    setBusyId("");
    if (!result.ok) { toast.apiError(result, "Statut inchangé"); return; }
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, isActive: !item.isActive } : entry)));
    toast.success(item.isActive ? `« ${item.name} » est masquée du site` : `« ${item.name} » est visible sur le site`);
    startTransition(() => router.refresh());
  }

  async function remove(item: AmbassadorItem | StoreItem) {
    const ok = await confirm({ title: `Supprimer « ${item.name} » ?`, description: `${config.noun.charAt(0).toUpperCase()}${config.noun.slice(1)} sera définitivement retirée du site. Pour la masquer temporairement, désactivez-la plutôt.`, confirmLabel: "Supprimer", tone: "danger" });
    if (!ok) return;
    setBusyId(item.id);
    const result = await adminRequest(`${config.endpoint}/${item.id}`, { method: "DELETE" });
    setBusyId("");
    if (!result.ok) { toast.apiError(result, "Suppression impossible"); return; }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    toast.success(`« ${item.name} » a été supprimée`);
    startTransition(() => router.refresh());
  }

  return (
    <ul className="adm-entity-grid" aria-busy={reordering || undefined}>
      {items.map((item, index) => {
        const isAmbassador = props.kind === "ambassador";
        const ambassador = item as AmbassadorItem;
        const store = item as StoreItem;
        const image = isAmbassador ? ambassador.photo : store.image;
        const busy = busyId === item.id;
        return (
          <li key={item.id} className="adm-entity" data-inactive={item.isActive ? undefined : ""}>
            <div className={`adm-entity-media ${isAmbassador ? "adm-entity-media--portrait" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" loading="lazy" style={isAmbassador ? { objectPosition: "center 25%" } : undefined} />
              <span className="adm-entity-order" title="Position sur le site">N° {index + 1}</span>
              <span className="adm-entity-status"><Badge tone={item.isActive ? "success" : "neutral"}>{item.isActive ? "Visible" : "Masquée"}</Badge></span>
            </div>
            <div className="adm-entity-body">
              <div>
                {isAmbassador && ambassador.role && <p className="adm-entity-kicker">{ambassador.role}</p>}
                <h2><Link href={`${config.editBase}/${item.id}`}>{item.name}</Link></h2>
              </div>
              {isAmbassador ? (
                <div className="adm-stack" style={{ gap: 8 }}>
                  <p className="adm-entity-text">{ambassador.description}</p>
                  {ambassador.instagram && <div className="adm-entity-meta"><span><AtSign aria-hidden />{instagramHandle(ambassador.instagram)?.replace(/^@/, "")}</span></div>}
                </div>
              ) : (
                <div className="adm-entity-meta">
                  <span><MapPin aria-hidden />{store.address}, {store.city} · {store.country}</span>
                  <span><Clock aria-hidden />{store.openingHours}</span>
                  {store.phone && <span><Phone aria-hidden />{store.phone}</span>}
                </div>
              )}
              <div className="adm-entity-actions">
                <span className="adm-order-arrows">
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" disabled={index === 0 || reordering} onClick={() => move(index, -1)} aria-label={`Monter ${item.name} d'une position`} title="Monter"><ArrowUp aria-hidden /></button>
                  <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" disabled={index === items.length - 1 || reordering} onClick={() => move(index, 1)} aria-label={`Descendre ${item.name} d'une position`} title="Descendre"><ArrowDown aria-hidden /></button>
                </span>
                <span className="adm-grow" />
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" disabled={busy} onClick={() => toggle(item)} aria-label={item.isActive ? `Masquer ${item.name}` : `Afficher ${item.name}`} title={item.isActive ? "Masquer du site" : "Afficher sur le site"}>
                  {busy ? <LoaderCircle className="adm-spin" aria-hidden /> : item.isActive ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--icon" style={{ color: "var(--adm-danger)" }} disabled={busy} onClick={() => remove(item)} aria-label={`Supprimer ${item.name}`} title="Supprimer"><Trash2 aria-hidden /></button>
                <Link className="adm-btn adm-btn--secondary adm-btn--sm" href={`${config.editBase}/${item.id}`}><Pencil aria-hidden /> Modifier</Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
