// Squelette affiché instantanément pendant le chargement d'une page admin
// (la barre latérale, portée par le layout, reste en place).
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="adm-sr-only">Chargement…</span>
      <div className="adm-loading-bar" aria-hidden />
      <div aria-hidden>
        <div className="adm-page-header">
          <div className="adm-page-header-text">
            <span className="adm-skeleton" style={{ width: 110, height: 14 }} />
            <span className="adm-skeleton" style={{ width: "min(320px, 70%)", height: 34, marginTop: 6 }} />
          </div>
          <span className="adm-skeleton" style={{ width: 150, height: 40, borderRadius: 8 }} />
        </div>
        <div className="adm-kpis">
          {[0, 1, 2].map((key) => (
            <div className="adm-kpi" key={key}>
              <span className="adm-skeleton" style={{ width: "50%", height: 14 }} />
              <span className="adm-skeleton" style={{ width: "40%", height: 28, marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div className="adm-card">
          {[0, 1, 2, 3, 4].map((key) => (
            <div key={key} style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 20px", borderTop: key ? "1px solid var(--adm-border)" : 0 }}>
              <span className="adm-skeleton" style={{ width: 48, height: 48, borderRadius: 8, flex: "none" }} />
              <span style={{ display: "grid", gap: 8, flex: 1 }}>
                <span className="adm-skeleton" style={{ width: "45%", height: 14 }} />
                <span className="adm-skeleton" style={{ width: "25%", height: 12 }} />
              </span>
              <span className="adm-skeleton" style={{ width: 80, height: 22, borderRadius: 999 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
