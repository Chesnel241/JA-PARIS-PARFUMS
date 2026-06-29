const ambassadors = [
  ["Inès", "Photographe", "Elle collectionne les lumières fugaces et porte Or Solaire comme une seconde peau."],
  ["Aïcha", "Architecte", "Son élégance est précise, son sillage ne l’est jamais. Nuit Souveraine lui ressemble."],
  ["Clara", "Danseuse", "Libre, instinctive, intensément présente. Rose Insolente était une évidence."],
];

export default function AmbassadorsPage() { return <div className="page-shell ambassadors-page"><header className="page-intro"><p className="eyebrow">Les visages JAE</p><h1>Celles qui<br /><em>laissent une trace.</em></h1><p>Créatrices, rêveuses, bâtisseuses. Elles ne représentent pas JAE : elles lui donnent un visage nouveau.</p></header><div className="ambassador-grid">{ambassadors.map(([name, role, text], index) => <article key={name} style={{ "--tone": ["#bf9c72", "#57493e", "#a56f70"][index] } as React.CSSProperties}><div className="portrait-placeholder"><span>{name[0]}</span><small>Portrait à venir</small></div><p className="eyebrow">{role}</p><h2>{name}</h2><p>{text}</p></article>)}</div></div>; }
