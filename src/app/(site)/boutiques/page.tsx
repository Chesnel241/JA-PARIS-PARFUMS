import { MapPin, Phone } from "lucide-react";

const stores = [
  { name: "Maison JAE · Paris", address: "24, rue du Bac · 75007 Paris", phone: "+33 1 84 80 20 24", hours: "Lun–Sam · 10h30–19h" },
  { name: "Le Bon Marché", address: "24, rue de Sèvres · 75007 Paris", phone: "+33 1 44 39 80 00", hours: "Lun–Dim · 10h–19h45" },
];

export default function StoresPage() { return <div className="stores-page"><div className="stores-map"><div className="map-lines" /><span className="map-pin pin-one"><MapPin /></span><span className="map-pin pin-two"><MapPin /></span><strong>PARIS</strong></div><div className="stores-copy"><p className="eyebrow">Nos boutiques</p><h1>Venez<br /><em>nous rencontrer.</em></h1><p>Le parfum se choisit aussi dans le temps d’une rencontre. Nos équipes vous accompagnent pour découvrir votre sillage.</p><div className="store-list">{stores.map((store) => <article key={store.name}><h2>{store.name}</h2><p>{store.address}</p><p>{store.hours}</p><a href={`tel:${store.phone.replaceAll(" ", "")}`}><Phone />{store.phone}</a></article>)}</div></div></div>; }
