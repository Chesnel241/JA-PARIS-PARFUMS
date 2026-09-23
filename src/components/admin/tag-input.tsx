"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Field } from "@/components/admin/form";

// Saisie de mots-clés en « pastilles » (Entrée ou virgule pour valider).
export function TagInput({ id, label, hint, values, onChange, placeholder, max = 12, error }: {
  id: string;
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max?: number;
  error?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const additions = raw.split(",").map((item) => item.trim().slice(0, 80)).filter(Boolean);
    if (!additions.length) return;
    const next = [...values];
    for (const item of additions) {
      if (next.length >= max) break;
      if (!next.some((existing) => existing.toLowerCase() === item.toLowerCase())) next.push(item);
    }
    onChange(next);
    setDraft("");
  }

  return (
    <Field id={id} label={label} hint={hint ?? `Entrée ou virgule pour ajouter · ${values.length}/${max}`} error={error} optional>
      <div className="adm-tags" onClick={() => document.getElementById(id)?.focus()}>
        {values.map((value, index) => (
          <span className="adm-tag" key={`${value}-${index}`}>
            {value}
            <button type="button" aria-label={`Retirer ${value}`} onClick={(event) => { event.stopPropagation(); onChange(values.filter((_, i) => i !== index)); }}><X aria-hidden /></button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          placeholder={values.length ? "" : placeholder}
          disabled={values.length >= max}
          aria-describedby={`${id}-hint`}
          onChange={(event) => {
            const value = event.target.value;
            if (value.includes(",")) commit(value); else setDraft(value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); commit(draft); }
            if (event.key === "Backspace" && !draft && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={() => commit(draft)}
        />
      </div>
    </Field>
  );
}
