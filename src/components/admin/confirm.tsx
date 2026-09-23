"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { CircleHelp, TriangleAlert } from "lucide-react";
import { useScrollLock } from "@/components/admin/use-scroll-lock";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Boîte de confirmation accessible (élément <dialog> natif : piège du focus,
// touche Échap, arrière-plan inerte) qui remplace window.confirm.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useScrollLock(Boolean(request));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (request && dialog && !dialog.open) dialog.showModal();
  }, [request]);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setRequest(null);
    dialogRef.current?.close();
  }, []);

  const confirm = useCallback<ConfirmFn>((options) => new Promise<boolean>((resolve) => {
    resolverRef.current?.(false);
    resolverRef.current = resolve;
    setRequest(options);
  }), []);

  const danger = request?.tone === "danger";
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        className="adm-dialog"
        aria-labelledby={titleId}
        aria-describedby={request?.description ? descriptionId : undefined}
        onCancel={(event) => { event.preventDefault(); settle(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) settle(false); }}
      >
        {request && (
          <>
            <div className="adm-dialog-body">
              <div className="adm-dialog-head">
                <span className="adm-dialog-icon" data-tone={danger ? "danger" : undefined} aria-hidden>{danger ? <TriangleAlert /> : <CircleHelp />}</span>
                <div>
                  <h2 className="adm-dialog-title" id={titleId}>{request.title}</h2>
                  {request.description && <p className="adm-dialog-text" id={descriptionId}>{request.description}</p>}
                </div>
              </div>
            </div>
            <div className="adm-dialog-actions">
              <button type="button" className="adm-btn adm-btn--secondary" onClick={() => settle(false)}>{request.cancelLabel ?? "Annuler"}</button>
              <button type="button" className={`adm-btn ${danger ? "adm-btn--danger" : "adm-btn--primary"}`} onClick={() => settle(true)}>{request.confirmLabel ?? "Confirmer"}</button>
            </div>
          </>
        )}
      </dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm doit être utilisé dans <ConfirmProvider>.");
  return context;
}
