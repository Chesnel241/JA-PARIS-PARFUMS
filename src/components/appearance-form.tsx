"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { adminRequest, isValidImageReference } from "@/components/admin/api";
import { useConfirm } from "@/components/admin/confirm";
import { SubmitButton, useUnsavedChanges } from "@/components/admin/form";
import { useToast } from "@/components/admin/toast";
import { Badge } from "@/components/admin/ui";
import { ImageUploader } from "@/components/image-uploader";

type Slot = { key: string; label: string; description: string; defaultValue: string; current: string };

// Reproduit le cadrage de chaque emplacement du site.
function SlotPreview({ slotKey, src }: { slotKey: string; src: string }) {
  /* eslint-disable @next/next/no-img-element */
  if (slotKey === "home.campaign.image") {
    return <div className="adm-slot-preview" style={{ aspectRatio: "4 / 5", maxWidth: 260 }}><img src={src} alt="Aperçu : photo de campagne" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} /></div>;
  }
  if (slotKey === "home.ors.image" || slotKey === "home.univers.cercle" || slotKey === "cercle.image") {
    return <div className="adm-slot-preview" data-variant="portrait"><img src={src} alt="Aperçu : tuile portrait" /></div>;
  }
  if (slotKey === "home.univers.ors") {
    return <div className="adm-slot-preview" style={{ position: "relative", aspectRatio: "1 / 1", maxWidth: 300 }}><img src={src} alt="Aperçu : bloc Les Ors" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 30%", borderRadius: 18 }} /><div className="adm-slot-overlay"><span>Accessoires</span><strong style={{ fontSize: 22 }}>Les Ors</strong></div></div>;
  }
  if (slotKey.startsWith("ors.lookbook.")) {
    const square = slotKey === "ors.lookbook.2" || slotKey === "ors.lookbook.5";
    return <div className="adm-slot-preview" style={{ aspectRatio: square ? "1 / 1" : "1 / 2", maxWidth: square ? 220 : 160 }}><img src={src} alt="Aperçu : photo du lookbook" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} /></div>;
  }
  return <div className="adm-slot-preview" style={{ aspectRatio: "16 / 10" }}><img src={src} alt="Aperçu" /></div>;
  /* eslint-enable @next/next/no-img-element */
}

function SlotEditor({ slot, onDirtyChange }: { slot: Slot; onDirtyChange: (key: string, dirty: boolean) => void }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [value, setValue] = useState(slot.current);
  const [saved, setSaved] = useState(slot.current);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const isDefault = saved === slot.defaultValue;
  const dirty = value !== saved;
  const valid = isValidImageReference(value);

  function change(next: string) {
    setValue(next);
    onDirtyChange(slot.key, next !== saved);
  }

  async function save(nextValue: string, message: string) {
    setPending(true);
    const result = await adminRequest("/api/admin/settings", { method: "PUT", json: { key: slot.key, value: nextValue } });
    setPending(false);
    if (!result.ok) { toast.apiError(result, "Image non enregistrée"); return; }
    const effective = nextValue || slot.defaultValue;
    setValue(effective);
    setSaved(effective);
    onDirtyChange(slot.key, false);
    toast.success(message, "La page d'accueil est à jour.");
    startTransition(() => router.refresh());
  }

  async function reset() {
    const ok = await confirm({ title: "Revenir à l'image d'origine ?", description: `L'emplacement « ${slot.label} » retrouvera son visuel initial.`, confirmLabel: "Restaurer" });
    if (ok) await save("", "Image d'origine restaurée");
  }

  return (
    <form className="adm-card" onSubmit={(event) => { event.preventDefault(); if (valid && dirty) void save(value.trim(), `« ${slot.label} » mis à jour`); }} aria-labelledby={`slot-${slot.key}`}>
      <div className="adm-card-header">
        <div className="adm-card-header-text">
          <h2 className="adm-card-title" id={`slot-${slot.key}`}>{slot.label}</h2>
          <p className="adm-card-desc">{slot.description}</p>
        </div>
        {dirty ? <Badge tone="warning">Non enregistré</Badge> : isDefault ? <Badge>Image d&apos;origine</Badge> : <Badge tone="success">Personnalisée</Badge>}
      </div>
      <div className="adm-card-body">
        <ImageUploader id={`slot-${slot.key.replace(/\./g, "-")}`} value={value} onChange={change} preview={valid ? <SlotPreview slotKey={slot.key} src={value} /> : undefined} label="image" error={!value ? "Choisissez une image ou restaurez l'image d'origine." : undefined} />
      </div>
      <div className="adm-card-footer">
        {dirty && <button type="button" className="adm-btn adm-btn--ghost" disabled={pending} onClick={() => change(saved)}>Annuler</button>}
        {!isDefault && !dirty && <button type="button" className="adm-btn adm-btn--ghost" disabled={pending} onClick={reset}><RotateCcw aria-hidden /> Image d&apos;origine</button>}
        <SubmitButton pending={pending} disabled={!dirty || !valid}>Enregistrer</SubmitButton>
      </div>
    </form>
  );
}

export function AppearanceForm({ slots }: { slots: Slot[] }) {
  const [dirtyKeys, setDirtyKeys] = useState<string[]>([]);
  useUnsavedChanges(dirtyKeys.length > 0);
  const onDirtyChange = (key: string, dirty: boolean) => setDirtyKeys((current) => (dirty ? [...new Set([...current, key])] : current.filter((item) => item !== key)));
  return <div className="adm-slots">{slots.map((slot) => <SlotEditor key={slot.key} slot={slot} onDirtyChange={onDirtyChange} />)}</div>;
}
