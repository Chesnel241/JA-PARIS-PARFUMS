"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import type { ApiFailure } from "@/components/admin/api";

type ToastTone = "success" | "error" | "info";
type ToastAction = { label: string; href: string; newTab?: boolean };
type ToastInput = { tone: ToastTone; title: string; description?: string; action?: ToastAction; duration?: number };
type ToastEntry = ToastInput & { id: number };

type ToastApi = {
  show: (toast: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  // Affiche l'échec d'un appel API (avec lien de reconnexion si la session a expiré).
  apiError: (failure: ApiFailure, title?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

function ToastItem({ toast, onClose }: { toast: ToastEntry; onClose: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration ?? (toast.tone === "error" ? 9000 : 5000));
  const startedAt = useRef(0);

  useEffect(() => {
    if (paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => onClose(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, onClose, toast.id]);

  const IconComponent = ICONS[toast.tone];
  return (
    <div
      className="adm-toast"
      data-tone={toast.tone}
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <IconComponent aria-hidden />
      <div className="adm-toast-body">
        <strong>{toast.title}</strong>
        {toast.description && <p>{toast.description}</p>}
        {toast.action && (
          <a href={toast.action.href} target={toast.action.newTab ? "_blank" : undefined} rel={toast.action.newTab ? "noopener" : undefined}>
            {toast.action.label}
          </a>
        )}
      </div>
      <button type="button" className="adm-toast-close" onClick={() => onClose(toast.id)} aria-label="Fermer la notification"><X aria-hidden /></button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const close = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const api = useMemo<ToastApi>(() => {
    const show = (toast: ToastInput) => {
      counter.current += 1;
      const entry = { ...toast, id: counter.current };
      setToasts((current) => [...current.slice(-3), entry]);
    };
    return {
      show,
      success: (title, description) => show({ tone: "success", title, description }),
      error: (title, description) => show({ tone: "error", title, description }),
      info: (title, description) => show({ tone: "info", title, description }),
      apiError: (failure, title = "L'action n'a pas abouti") => {
        if (failure.sessionExpired) {
          const callbackUrl = typeof window === "undefined" ? "/admin" : window.location.pathname;
          show({
            tone: "error",
            title: "Session expirée",
            description: "Reconnectez-vous dans l'onglet qui va s'ouvrir, puis revenez ici : vos saisies sont conservées.",
            action: { label: "Se reconnecter", href: `/connexion-admin?callbackUrl=${encodeURIComponent(callbackUrl)}`, newTab: true },
            duration: 20000,
          });
          return;
        }
        show({ tone: "error", title, description: failure.error });
      },
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="adm-toasts" aria-live="polite" aria-relevant="additions" aria-label="Notifications">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onClose={close} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast doit être utilisé dans <ToastProvider>.");
  return context;
}
