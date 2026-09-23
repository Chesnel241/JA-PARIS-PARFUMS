"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, X } from "lucide-react";
import { AdminNav, type AdminBadges } from "@/components/admin-nav";
import { AdminSignOut } from "@/components/admin-sign-out";
import { ConfirmProvider } from "@/components/admin/confirm";
import { ToastProvider } from "@/components/admin/toast";
import { initials } from "@/components/admin/format";
import { useScrollLock } from "@/components/admin/use-scroll-lock";

type FrameUser = { name: string | null; email: string; role: string };

function Brand() {
  return <Link className="adm-brand" href="/admin" aria-label="JAE — tableau de bord"><strong>JAE</strong><span>Admin</span></Link>;
}

function SidebarFooter({ user }: { user: FrameUser }) {
  const displayName = user.name?.trim() || user.email;
  return (
    <div className="adm-sidebar-footer">
      <a className="adm-nav-link" href="/" target="_blank" rel="noopener"><ExternalLink aria-hidden /> Voir le site<span className="adm-sr-only"> (nouvel onglet)</span></a>
      <div className="adm-user">
        <span className="adm-avatar" aria-hidden>{initials(displayName)}</span>
        <span className="adm-user-meta">
          <strong title={displayName}>{displayName}</strong>
          <span title={user.email}>{user.role === "ADMIN" ? "Administrateur" : "Éditeur"} · {user.email}</span>
        </span>
      </div>
      <AdminSignOut />
    </div>
  );
}

// Cadre persistant de l'admin : barre latérale (bureau), barre supérieure et
// tiroir de navigation (mobile/tablette), notifications et confirmations.
export function AdminFrame({ user, badges, children }: { user: FrameUser; badges: AdminBadges; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useScrollLock(open);

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (open && !drawer.open) drawer.showModal();
    if (!open && drawer.open) drawer.close();
  }, [open]);

  // Ferme le tiroir après une navigation.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Si l'écran s'élargit (rotation, redimensionnement), le tiroir n'a plus lieu d'être.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => { if (query.matches) setOpen(false); };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const pending = badges.orders + badges.applications;

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="adm-app">
          <a className="adm-skip" href="#adm-main">Aller au contenu</a>

          <header className="adm-topbar">
            <button ref={menuButtonRef} type="button" className="adm-topbar-btn" onClick={() => setOpen(true)} aria-label={pending > 0 ? `Ouvrir le menu (${pending} éléments à traiter)` : "Ouvrir le menu"} aria-haspopup="dialog" aria-expanded={open}>
              <Menu aria-hidden />
              {pending > 0 && <span className="adm-dot-badge" aria-hidden />}
            </button>
            <Brand />
            <span className="adm-topbar-spacer" />
            <a className="adm-topbar-btn" href="/" target="_blank" rel="noopener" aria-label="Voir le site (nouvel onglet)"><ExternalLink aria-hidden /></a>
          </header>

          <aside className="adm-sidebar" aria-label="Menu principal">
            <div className="adm-sidebar-inner">
              <Brand />
              <AdminNav badges={badges} />
              <SidebarFooter user={user} />
            </div>
          </aside>

          <dialog
            ref={drawerRef}
            className="adm-drawer"
            aria-label="Menu"
            onCancel={(event) => { event.preventDefault(); setOpen(false); }}
            onClose={() => { setOpen(false); menuButtonRef.current?.focus(); }}
            onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}
          >
            {open && (
              <div className="adm-drawer-inner">
                <div className="adm-drawer-head">
                  <Brand />
                  <button type="button" className="adm-topbar-btn" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X aria-hidden /></button>
                </div>
                <AdminNav badges={badges} onNavigate={(href) => { if (href === pathname) setOpen(false); }} />
                <SidebarFooter user={user} />
              </div>
            )}
          </dialog>

          <main id="adm-main" className="adm-main" tabIndex={-1}>
            <div className="adm-content">{children}</div>
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
