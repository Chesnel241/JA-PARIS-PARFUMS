import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const articles = [
  ["Matières", "Dans l’atelier : le safran, or rouge de la parfumerie", "Une épice vibrante, sèche et lumineuse qui transforme tout ce qu’elle touche."],
  ["Rencontres", "La mémoire a-t-elle une odeur ?", "Conversation avec celles et ceux qui composent nos émotions invisibles."],
  ["Paris", "Après minuit, la ville change de parfum", "Une promenade olfactive dans les rues silencieuses de la rive droite."],
];

export default function JournalPage() { return <div className="page-shell editorial-page"><header className="page-intro"><p className="eyebrow">Journal JAE</p><h1>Des histoires<br /><em>à respirer.</em></h1></header><div className="article-list">{articles.map(([tag, title, text], index) => <article key={title}><span>0{index + 1}</span><div><p className="eyebrow">{tag}</p><h2>{title}</h2><p>{text}</p></div><Link href="#" aria-label={`Lire ${title}`}><ArrowUpRight /></Link></article>)}</div></div>; }
