"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GOLD, hourDistance, listFr, paletteOf, parseHour } from "@/lib/heures";
import { allNotes, type MaisonItem } from "@/lib/maison";
import { isUnoptimizedImage } from "@/components/commerce/media";
import { ArrowIcon } from "@/components/maison/icons";
import { Scene, photosOf } from "@/components/maison/scene";
import { useAccent, useMaison } from "@/components/maison/maison-context";

// Trois tempéraments, trois heures de référence : le matin, la fin du jour, la nuit.
type Key = "matin" | "soir" | "nuit";
const TARGET: Record<Key, number> = { matin: 8 * 60, soir: 19 * 60, nuit: 0 };

const QUESTIONS: { q: string; options: { title: string; text: string; key: Key; weight: number }[] }[] = [
  { q: "Votre moment préféré de la journée ?", options: [
    { title: "Le matin", text: "Quand tout commence et que la lumière est neuve.", key: "matin", weight: 2 },
    { title: "La fin du jour", text: "Quand la lumière hésite et que tout devient possible.", key: "soir", weight: 2 },
    { title: "La nuit", text: "Quand la ville s’allume et que les voix baissent.", key: "nuit", weight: 2 },
  ] },
  { q: "On vous remarque surtout pour…", options: [
    { title: "Votre énergie", text: "Vous entrez, la pièce se réveille.", key: "matin", weight: 2 },
    { title: "Votre mystère", text: "On cherche encore à vous cerner.", key: "soir", weight: 2 },
    { title: "Votre présence", text: "Pas besoin de parler pour qu’on vous écoute.", key: "nuit", weight: 2 },
  ] },
  { q: "Une matière que vous aimeriez toucher ?", options: [
    { title: "Un lin chauffé au soleil", text: "Léger, froissé, lumineux.", key: "matin", weight: 2 },
    { title: "Un velours poudré", text: "Doux, un peu secret.", key: "soir", weight: 2 },
    { title: "Un cuir patiné", text: "Profond, chaud, avec une histoire.", key: "nuit", weight: 2 },
  ] },
  { q: "Le sillage dont vous rêvez ?", options: [
    { title: "Frais et lumineux", text: "Qu’on se dise qu’il fait beau à côté de vous.", key: "matin", weight: 3 },
    { title: "Doux et troublant", text: "Qu’on se retourne sans savoir pourquoi.", key: "soir", weight: 3 },
    { title: "Profond et inoubliable", text: "Qu’on vous reconnaisse les yeux fermés.", key: "nuit", weight: 3 },
  ] },
];

const PORTRAIT: Record<Key, string> = {
  matin: "Vous avez l’énergie des premières heures, franche, lumineuse, contagieuse.",
  soir: "Vous aimez ce qui se devine plus que ce qui se montre.",
  nuit: "Vous n’avez pas besoin d’élever la voix pour qu’on vous remarque.",
};

/** Le parfum dont l'heure est la plus proche de l'heure du tempérament gagnant. */
function pickPerfume(perfumes: MaisonItem[], key: Key) {
  let best: MaisonItem | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const perfume of perfumes) {
    const hour = parseHour(perfume.hour);
    if (hour === null) continue;
    const distance = hourDistance(hour, TARGET[key]);
    if (distance < bestDistance) {
      best = perfume;
      bestDistance = distance;
    }
  }
  return best ?? perfumes[0] ?? null;
}

function winner(answers: number[]): Key {
  const scores: Record<Key, number> = { matin: 0, soir: 0, nuit: 0 };
  answers.forEach((choice, index) => {
    const option = QUESTIONS[index].options[choice];
    scores[option.key] += option.weight;
  });
  const max = Math.max(...Object.values(scores));
  // Égalité : la dernière réponse (le sillage rêvé) départage.
  const last = QUESTIONS[answers.length - 1].options[answers[answers.length - 1]].key;
  return scores[last] === max ? last : (Object.keys(scores) as Key[]).find((key) => scores[key] === max) ?? last;
}

export function Quiz() {
  const { items, toast } = useMaison();
  const perfumes = useMemo(() => items.filter((item) => item.category === "PARFUM"), [items]);
  const [answers, setAnswers] = useState<number[]>([]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  const step = answers.length;
  const done = step >= QUESTIONS.length;
  const key = done ? winner(answers) : null;
  const result = key ? pickPerfume(perfumes, key) : null;

  useAccent(result ? paletteOf(result.palette).accent : GOLD);

  // À chaque étape : retour en haut et focus sur le nouveau titre (lecteurs d'écran).
  useEffect(() => {
    if (!started.current) return;
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  const answer = (choice: number) => {
    started.current = true;
    setAnswers((current) => [...current, choice]);
  };

  const share = async () => {
    if (!result) return;
    const url = `${window.location.origin}/trouver-mon-heure`;
    const text = `Mon heure JAE : ${result.hour ? `${result.hour}, ` : ""}${result.name}. Et vous, quelle heure êtes-vous ?`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Mon heure JAE", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast("Résultat copié. Collez-le où vous voulez.");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") toast("Copie impossible. Faites une capture de la carte pour la partager.");
    }
  };

  if (!done) {
    const question = QUESTIONS[step];
    return (
      <div className="wrap quiz">
        <div className="q-top">
          <span className="tag"><span className="dot" />Trouver mon heure</span>
          <span className="small muted">Question {step + 1} sur {QUESTIONS.length}</span>
        </div>
        <div className="q-progress" aria-hidden="true">
          {QUESTIONS.map((_, index) => <i key={index} className={index < step ? "done" : index === step ? "now" : ""} />)}
        </div>
        <h1 className="h-lg q-title" ref={titleRef} tabIndex={-1}>{question.q}</h1>
        <div className="q-options" key={step}>
          {question.options.map((option, index) => (
            <button key={option.title} type="button" className="q-opt" onClick={() => answer(index)}>
              <span className="q-letter" aria-hidden="true">{"abc"[index]}</span>
              <span><strong>{option.title}</strong><span className="q-desc">{option.text}</span></span>
            </button>
          ))}
        </div>
        {step > 0 ? <button type="button" className="q-back" onClick={() => setAnswers((current) => current.slice(0, -1))}>Revenir à la question précédente</button> : null}
      </div>
    );
  }

  if (!result || !key) {
    return (
      <div className="wrap quiz">
        <h1 className="h-lg q-title" ref={titleRef} tabIndex={-1}>Votre heure arrive bientôt.</h1>
        <p className="lead">La collection se prépare. Revenez très vite découvrir le parfum qui vous ressemble.</p>
        <div className="btn-row" style={{ marginTop: 24 }}><Link className="btn" href="/journal">Lire le Journal<span className="ico"><ArrowIcon /></span></Link></div>
      </div>
    );
  }

  const portrait = photosOf(result)[1];
  const colors = paletteOf(result.palette);
  const notes = allNotes(result);
  const signature = [...result.notes.top.slice(0, 1), ...result.notes.heart.slice(0, 2), ...result.notes.base.slice(0, 1)];

  return (
    <div className="wrap q-result">
      <div className={`story${portrait ? " has-ph" : ""}`} role="img" aria-label={`Carte à partager : mon heure JAE${result.hour ? `, ${result.hour}` : ""}, ${result.name}`}>
        {portrait ? <Image className="ph-fill" src={portrait} alt="" fill sizes="360px" unoptimized={isUnoptimizedImage(portrait)} /> : <Scene subject={result} sizes="360px" />}
        <div className="story-over" style={portrait ? undefined : { color: colors.ink }}>
          <div className="story-top"><span>Mon heure JAE</span><span>Paris</span></div>
          <div>
            {result.hour ? <div className="story-hour">{result.hour}</div> : null}
            <div className="story-name">{result.name}</div>
          </div>
          <div className="story-bot"><span>{notes.slice(0, 4).join(" · ")}</span><span>JAE Paris</span></div>
        </div>
      </div>
      <div className="q-res-text">
        <span className="tag"><span className="dot" />Votre heure</span>
        <h1 className="h-lg" ref={titleRef} tabIndex={-1}>{result.hour ? `${result.hour}, ` : ""}<span className="serif">{result.name}</span></h1>
        <p className="lead">
          {PORTRAIT[key]} {result.name} vous ressemble{signature.length ? `, avec ${listFr(signature)}` : ""}.
          {result.tagline ? ` ${result.tagline}` : ""}
        </p>
        <div className="btn-row">
          <Link className="btn" href={`/produit/${result.slug}`}>Découvrir {result.name}<span className="ico"><ArrowIcon /></span></Link>
          <button className="btn btn-line" type="button" onClick={share}>Partager mon résultat</button>
        </div>
        <p className="small muted" style={{ marginTop: 16 }}>Faites une capture de la carte pour la partager en story.</p>
        <button type="button" className="q-back" onClick={() => { started.current = true; setAnswers([]); }}>Recommencer le quiz</button>
      </div>
    </div>
  );
}
