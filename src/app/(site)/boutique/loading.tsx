// Squelette de chargement cohérent avec les pages catalogue / éditoriales.
export default function Loading() {
  return (
    <div className="page-shell" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden>
        <div className="skeleton skeleton-line" style={{ width: 120 }} />
        <div className="skeleton skeleton-title" style={{ marginTop: 20 }} />
        <div className="skeleton skeleton-line" style={{ width: "min(360px, 70%)", marginTop: 24, marginBottom: 56 }} />
        <div className="loading-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-line" style={{ width: "60%", marginTop: 16 }} />
              <div className="skeleton skeleton-line" style={{ width: "35%" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
