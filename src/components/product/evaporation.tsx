"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/data";
import { listFr } from "@/lib/heures";
import { useReducedMotion } from "@/components/motion";

// Intensité perçue (0 → 1) de chaque étage selon le temps passé sur la peau (minutes).
const INTENSITY = {
  top: (t: number) => (t < 15 ? 1 : Math.max(0, 1 - (t - 15) / 70)),
  heart: (t: number) => (t < 10 ? 0.25 + (0.15 * t) / 10 : t < 60 ? 0.4 + (0.6 * (t - 10)) / 50 : t < 210 ? 1 : Math.max(0.12, 1 - (t - 210) / 260)),
  base: (t: number) => (t < 30 ? 0.14 : t < 200 ? 0.14 + (0.86 * (t - 30)) / 170 : 1),
};

const LAYERS = [
  { key: "top", label: "Tête" },
  { key: "heart", label: "Cœur" },
  { key: "base", label: "Fond" },
] as const;

const MAX_MINUTES = 480;
const pad = (value: number) => String(value).padStart(2, "0");

/** Échelle quadratique : les premières minutes prennent plus de place sur la réglette. */
const toMinutes = (position: number) => MAX_MINUTES * (position / 1000) ** 2;

function duration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const rest = Math.round(minutes % 60);
  return `${Math.floor(minutes / 60)} h${rest ? ` ${pad(rest)}` : ""}`;
}

/**
 * « Votre sillage dans le temps » : une réglette fait passer les heures sur la
 * peau ; les notes de tête s'effacent, le cœur se révèle, le fond reste.
 */
export function Evaporation({ product }: { product: Product }) {
  const [position, setPosition] = useState(65);
  const frame = useRef(0);
  const reduce = useReducedMotion();
  const minutes = toMinutes(position);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const play = () => {
    cancelAnimationFrame(frame.current);
    if (reduce) {
      setPosition(1000);
      return;
    }
    const start = performance.now();
    const length = 7000;
    const step = (time: number) => {
      const progress = Math.min(1, (time - start) / length);
      setPosition(Math.round(progress * 1000));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  const caption = minutes < 20
    ? `Les premières minutes, les notes de tête éclatent : ${listFr(product.notes.top)}.`
    : minutes < 200
      ? `Le cœur se révèle : ${listFr(product.notes.heart)}. C’est la signature de ${product.name}.`
      : `Des heures plus tard, ce qui reste de vous : ${listFr(product.notes.base)}.`;

  return (
    <>
      <div className="evap-stage">
        {LAYERS.filter(({ key }) => product.notes[key].length > 0).map(({ key, label }) => {
          const intensity = INTENSITY[key](minutes);
          return (
            <div className="evap-layer" key={key}>
              <span className="nm">{label}</span>
              <div className="evap-notes">
                {product.notes[key].map((note) => (
                  <span key={note} style={{ opacity: Number((0.12 + 0.88 * intensity).toFixed(3)), filter: `blur(${((1 - intensity) * 3).toFixed(2)}px)` }}>{note}</span>
                ))}
              </div>
              <div className="evap-bar" aria-hidden="true"><i style={{ width: `${(intensity * 100).toFixed(1)}%` }} /></div>
            </div>
          );
        })}
      </div>
      <div className="evap-ctrl">
        <button className="btn btn-line" type="button" onClick={play}>Voir le temps passer</button>
        <div className="evap-range">
          <label htmlFor="evap-range">Sur la peau depuis <output>{duration(minutes)}</output></label>
          <input
            type="range"
            id="evap-range"
            min={0}
            max={1000}
            step={1}
            value={position}
            aria-valuetext={duration(minutes)}
            onChange={(event) => { cancelAnimationFrame(frame.current); setPosition(Number(event.target.value)); }}
          />
          <div className="evap-scale" aria-hidden="true">
            <span style={{ left: 0 }}>0</span><span style={{ left: "35.4%" }}>1 h</span><span style={{ left: "61.2%" }}>3 h</span><span style={{ left: "100%" }}>8 h</span>
          </div>
        </div>
      </div>
      <p className="evap-caption" aria-live="polite">{caption}</p>
    </>
  );
}
