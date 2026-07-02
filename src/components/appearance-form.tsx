"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, RotateCcw, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "@/components/image-uploader";

type Slot = { key: string; label: string; description: string; defaultValue: string; current: string };

function SlotEditor({ slot }: { slot: Slot }) {
  const router = useRouter();
  const [value, setValue] = useState(slot.current);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const isDefault = slot.current === slot.defaultValue;
  const dirty = value !== slot.current;

  function save(nextValue: string) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: slot.key, value: nextValue }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Enregistrement impossible.");
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
      router.refresh();
    });
  }

  return (
    <section className="admin-form-card appearance-slot">
      <div className="appearance-slot-head">
        <h2>{slot.label}</h2>
        {!isDefault && (
          <button type="button" className="appearance-reset" disabled={pending} onClick={() => { setValue(slot.defaultValue); save(""); }}>
            <RotateCcw size={13} /> Image d&apos;origine
          </button>
        )}
      </div>
      <p className="appearance-slot-description">{slot.description}</p>
      <ImageUploader value={value} onChange={setValue} />
      {error && <p className="admin-form-error">{error}</p>}
      <button type="button" className="primary-button appearance-save" disabled={pending || (!dirty && !saved)} onClick={() => save(value)}>
        {pending ? <><LoaderCircle className="spin" /> Enregistrement…</> : saved ? <><Check /> Enregistré</> : <><Save /> Enregistrer</>}
      </button>
    </section>
  );
}

export function AppearanceForm({ slots }: { slots: Slot[] }) {
  return <div className="appearance-grid">{slots.map((slot) => <SlotEditor key={slot.key} slot={slot} />)}</div>;
}
