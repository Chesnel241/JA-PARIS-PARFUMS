"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { isUnoptimizedImage, isVectorImage, safeImageSrc } from "@/components/commerce/media";
import { useModal } from "@/components/commerce/use-modal";

// Suit la diapositive visible d'une piste à défilement horizontal (scroll-snap).
function useSnapIndex(trackRef: React.RefObject<HTMLDivElement | null>, count: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || count < 2) return;
    let frame = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const width = track.clientWidth || 1;
        setIndex(Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / width))));
      });
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      track.removeEventListener("scroll", onScroll);
    };
  }, [trackRef, count]);
  return index;
}

function scrollToSlide(track: HTMLDivElement | null, index: number, smooth: boolean) {
  if (!track) return;
  track.scrollTo({ left: index * track.clientWidth, behavior: smooth ? "smooth" : "auto" });
}

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const sources = (images.length > 0 ? images : [""]).map(safeImageSrc).slice(0, 12);
  const count = sources.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const index = useSnapIndex(trackRef, count);
  const reduceMotion = useReducedMotion();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const goTo = useCallback((next: number) => {
    scrollToSlide(trackRef.current, (next + count) % count, !reduceMotion);
  }, [count, reduceMotion]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (count < 2) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }
  };

  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <div className={`cm-gallery${count > 1 ? " has-thumbs" : ""}`}>
      {count > 1 ? (
        <div className="cm-gallery__thumbs" role="group" aria-label="Choisir une vue">
          {sources.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              className={`cm-gallery__thumb${i === index ? " is-active" : ""}`}
              aria-label={`Vue ${i + 1} sur ${count}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => goTo(i)}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="72px"
                unoptimized={isUnoptimizedImage(src)}
                className={isVectorImage(src) ? "is-contained" : "is-cover"}
              />
            </button>
          ))}
        </div>
      ) : null}

      <div className="cm-gallery__stage">
        <div
          ref={trackRef}
          className="cm-gallery__track"
          tabIndex={count > 1 ? 0 : -1}
          role={count > 1 ? "region" : undefined}
          aria-roledescription={count > 1 ? "carrousel" : undefined}
          aria-label={count > 1 ? `Galerie ${name}, utilisez les flèches pour naviguer` : undefined}
          onKeyDown={onKeyDown}
        >
          {sources.map((src, i) => (
            <figure
              key={`${src}-${i}`}
              className="cm-gallery__slide"
              aria-roledescription={count > 1 ? "diapositive" : undefined}
              aria-label={count > 1 ? `${i + 1} sur ${count}` : undefined}
            >
              <Image
                src={src}
                alt={i === 0 ? name : `${name}, vue ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 900px) 100vw, 56vw"
                unoptimized={isUnoptimizedImage(src)}
                className={isVectorImage(src) ? "is-contained" : "is-cover"}
              />
            </figure>
          ))}
        </div>

        <button type="button" className="cm-gallery__zoom cm-icon-button" onClick={() => setLightbox(index)} aria-label="Agrandir l’image">
          <Maximize2 aria-hidden="true" />
        </button>

        {count > 1 ? (
          <>
            <div className="cm-gallery__nav">
              <button type="button" className="cm-icon-button" onClick={() => goTo(index - 1)} aria-label="Vue précédente">
                <ChevronLeft aria-hidden="true" />
              </button>
              <span className="cm-gallery__counter" aria-hidden="true">{index + 1} / {count}</span>
              <button type="button" className="cm-icon-button" onClick={() => goTo(index + 1)} aria-label="Vue suivante">
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <div className="cm-gallery__dots" aria-hidden="true">
              {sources.map((src, i) => <span key={`${src}-${i}`} className={i === index ? "is-active" : ""} />)}
            </div>
          </>
        ) : null}
      </div>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {lightbox !== null ? (
                <Lightbox key="lightbox" sources={sources} name={name} start={lightbox} onClose={closeLightbox} />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

function Lightbox({ sources, name, start, onClose }: { sources: string[]; name: string; start: number; onClose: () => void }) {
  const dialogRef = useModal<HTMLDivElement>(true, onClose);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = sources.length;
  const index = useSnapIndex(trackRef, count);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    scrollToSlide(trackRef.current, start, false);
  }, [start]);

  const goTo = (next: number) => scrollToSlide(trackRef.current, (next + count) % count, !reduceMotion);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (count < 2) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    }
  };

  return (
    <motion.div
      ref={dialogRef}
      className="cm-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${name}, vue agrandie`}
      tabIndex={-1}
      data-modal-layer=""
      onKeyDown={onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.3 }}
    >
      <button type="button" className="cm-lightbox__close cm-icon-button" onClick={onClose} aria-label="Fermer la vue agrandie" data-autofocus="">
        <X aria-hidden="true" />
      </button>
      <div ref={trackRef} className="cm-lightbox__track">
        {sources.map((src, i) => (
          <figure key={`${src}-${i}`} className="cm-lightbox__slide">
            <Image
              src={src}
              alt={i === 0 ? name : `${name}, vue ${i + 1}`}
              fill
              sizes="100vw"
              unoptimized={isUnoptimizedImage(src)}
              className="is-contained"
            />
          </figure>
        ))}
      </div>
      {count > 1 ? (
        <div className="cm-lightbox__nav">
          <button type="button" className="cm-icon-button" onClick={() => goTo(index - 1)} aria-label="Vue précédente">
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="cm-gallery__counter" aria-live="polite">{index + 1} / {count}</span>
          <button type="button" className="cm-icon-button" onClick={() => goTo(index + 1)} aria-label="Vue suivante">
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}
