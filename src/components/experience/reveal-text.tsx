import { Children, Fragment, cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";

/**
 * Découpe un texte (y compris <em>, <br/>…) en mots masqués qui « montent »
 * à l'apparition. Composant serveur : le découpage est fait au rendu HTML,
 * sans JavaScript client, donc sans clignotement ni impact sur le LCP.
 * Le texte reste strictement identique pour les lecteurs d'écran et le SEO.
 *
 * mode="load"   : animation CSS jouée dès l'affichage (titres au-dessus de la ligne de flottaison).
 * mode="scroll" : animation déclenchée à l'entrée dans l'écran (ScrollAnimator).
 */
type Counter = { value: number };

function splitNode(node: ReactNode, counter: Counter): ReactNode {
  if (typeof node === "string") {
    return node.split(/(\s+)/).map((part, index) => {
      if (part === "" || /^\s+$/.test(part)) return part;
      const style = { "--i": counter.value++ } as CSSProperties;
      return (
        <span className="w" key={index}>
          <span className="w-in" style={style}>{part}</span>
        </span>
      );
    });
  }
  if (typeof node === "number") return splitNode(String(node), counter);
  if (Array.isArray(node)) return node.map((child, index) => <Fragment key={index}>{splitNode(child, counter)}</Fragment>);
  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    if (element.type === "br" || element.props.children === undefined) return element;
    return cloneElement(element, undefined, splitNode(Children.toArray(element.props.children), counter));
  }
  return node;
}

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";

export function RevealText({ as: TagName = "span", children, mode = "scroll", className = "", id, delay = 0, style }: {
  as?: Tag;
  children: ReactNode;
  mode?: "load" | "scroll";
  className?: string;
  id?: string;
  /** Délai supplémentaire en secondes. */
  delay?: number;
  style?: CSSProperties;
}) {
  const content = splitNode(children, { value: 0 });
  const merged = { ...style, "--d": delay } as CSSProperties;
  return (
    <TagName
      id={id}
      className={`reveal-text ${className}`.trim()}
      style={merged}
      {...(mode === "scroll" ? { "data-animate": "words" } : { "data-reveal-load": "" })}
    >
      {content}
    </TagName>
  );
}
