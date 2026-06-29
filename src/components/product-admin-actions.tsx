"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProductAdminActions({ id, name, isActive, canDelete }: { id: string; name: string; isActive: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function request(method: "PATCH" | "DELETE", body?: object) {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/products/${id}`, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Action impossible." }));
        setError(data.error ?? "Action impossible.");
        return;
      }
      router.refresh();
    });
  }

  return <div className="product-admin-actions">
    <button disabled={pending} onClick={() => request("PATCH", { isActive: !isActive })}>{isActive ? <EyeOff /> : <Eye />}{isActive ? "Dépublier" : "Publier"}</button>
    {canDelete && <button className="danger" disabled={pending} onClick={() => { if (window.confirm(`Supprimer définitivement « ${name} » ?`)) request("DELETE"); }}><Trash2 /> Supprimer</button>}
    {error && <small>{error}</small>}
  </div>;
}
