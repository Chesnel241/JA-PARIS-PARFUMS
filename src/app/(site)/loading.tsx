export default function Loading() {
  return (
    <div className="page-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "2px solid #ddd7d0", borderTopColor: "var(--ink)", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
        <p style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "#817971" }}>Chargement…</p>
      </div>
    </div>
  );
}
