"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ArticleAdminActions({ id, title, isPublished }: { id: string; title: string; isPublished: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function request(method: "PATCH" | "DELETE", body?: object) {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/articles/${id}`, {
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
    <button disabled={pending} onClick={() => request("PATCH", { isPublished: !isPublished })}>{isPublished ? <EyeOff /> : <Eye />}{isPublished ? "Dépublier" : "Publier"}</button>
    <button className="danger" disabled={pending} onClick={() => { if (window.confirm(`Supprimer définitivement « ${title} » ?`)) request("DELETE"); }}><Trash2 /> Supprimer</button>
    {error && <small>{error}</small>}
  </div>;
}
