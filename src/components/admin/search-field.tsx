"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";

// Champ de recherche synchronisé avec l'URL (?q=) : résultats côté serveur,
// adresse partageable, conservée au retour arrière.
export function UrlSearchField({ placeholder, label, param = "q" }: { placeholder: string; label: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = searchParams.get(param) ?? "";
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => { setValue(searchParams.get(param) ?? ""); }, [searchParams, param]);

  function push(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim()) params.set(param, next.trim()); else params.delete(param);
    params.delete("page");
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  function onChange(next: string) {
    setValue(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => push(next), 350);
  }

  return (
    <form className="adm-search" role="search" onSubmit={(event) => { event.preventDefault(); window.clearTimeout(timer.current); push(value); }}>
      {pending ? <LoaderCircle className="adm-spin" aria-hidden /> : <Search aria-hidden />}
      <label className="adm-sr-only" htmlFor={`search-${param}`}>{label}</label>
      <input id={`search-${param}`} className="adm-input" type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} autoComplete="off" enterKeyHint="search" />
      {value && <button type="button" className="adm-search-clear" aria-label="Effacer la recherche" onClick={() => { setValue(""); window.clearTimeout(timer.current); push(""); }}><X aria-hidden /></button>}
    </form>
  );
}

// Variante locale (filtrage en mémoire, sans aller-retour serveur).
export function LocalSearchField({ value, onChange, placeholder, label, id }: { value: string; onChange: (value: string) => void; placeholder: string; label: string; id: string }) {
  return (
    <div className="adm-search" role="search">
      <Search aria-hidden />
      <label className="adm-sr-only" htmlFor={id}>{label}</label>
      <input id={id} className="adm-input" type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} autoComplete="off" />
      {value && <button type="button" className="adm-search-clear" aria-label="Effacer la recherche" onClick={() => onChange("")}><X aria-hidden /></button>}
    </div>
  );
}

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
