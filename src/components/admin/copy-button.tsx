"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/admin/toast";

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Repli (contexte non sécurisé, permissions refusées).
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

export function CopyButton({ text, label, successMessage, className = "adm-btn adm-btn--secondary adm-btn--sm", iconOnly = false }: {
  text: string;
  label: string;
  successMessage: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          toast.success(successMessage);
          window.setTimeout(() => setCopied(false), 1800);
        } else {
          toast.error("Copie impossible", "Sélectionnez le texte et copiez-le manuellement.");
        }
      }}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {!iconOnly && (copied ? "Copié" : label)}
    </button>
  );
}
