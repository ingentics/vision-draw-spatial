import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Infobulle au survol (noms des formes de la palette, choix par icônes) : plus visible et plus rapide que `title`. */

/** Infobulle affichée, placée sous l'élément survolé (`anchor` : son cadre dans la fenêtre). */
interface Tip {
  text: string;
  anchor: DOMRect;
  visible: boolean;
  /** Où la rendre : le dialogue modal ouvert qui contient l'élément, sinon la racine du document. */
  host: HTMLElement;
}

/** Écart entre l'infobulle et l'élément, et marge minimale aux bords de la fenêtre. */
const TOOLTIP_GAP = 4;

/**
 * Position de l'infobulle : centrée sous l'élément, décalée pour rester dans la fenêtre, et au-dessus de l'élément
 * s'il n'y a pas la place en dessous dans la zone visible (`area` : ex. la liste des formes de la palette, dont le
 * bas peut être bordé par la barre des onglets).
 */
function tooltipPosition(
  anchor: Pick<DOMRect, 'left' | 'width' | 'top' | 'bottom'>,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  area: { top: number; bottom: number } = { top: 0, bottom: viewport.height },
): { left: number; top: number } {
  const centered = anchor.left + anchor.width / 2 - size.width / 2;
  const left = Math.max(TOOLTIP_GAP, Math.min(centered, viewport.width - size.width - TOOLTIP_GAP));
  const below = anchor.bottom + TOOLTIP_GAP;
  const bottom = Math.min(area.bottom, viewport.height);
  const top = below + size.height + TOOLTIP_GAP <= bottom ? below : anchor.top - TOOLTIP_GAP - size.height;
  return { left, top: Math.max(Math.max(area.top, 0) + TOOLTIP_GAP, top) };
}

/**
 * Infobulle d'un composant : `hover(text)` donne les gestionnaires de survol d'un élément, `tooltip` est à rendre
 * dans le composant (portail à la racine du document : au premier plan, ni coupé par un défilement ni recouvert ; dans
 * le dialogue modal qui contient l'élément, sans quoi le dialogue, au-dessus de tout le document, la cacherait, ex.
 * Paramètres).
 * `area` : zone visible où la garder, si elle est plus petite que la fenêtre.
 */
export function useTooltip(area?: () => { top: number; bottom: number } | undefined) {
  const [tip, setTip] = useState<Tip | null>(null);
  const element = useRef<HTMLDivElement>(null);
  // Placée une fois sa taille connue, avant l'affichage.
  useLayoutEffect(() => {
    if (!tip || !element.current) return;
    const { left, top } = tooltipPosition(
      tip.anchor,
      { width: element.current.offsetWidth, height: element.current.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      area?.(),
    );
    element.current.style.left = `${left}px`;
    element.current.style.top = `${top}px`;
  }, [tip]); // eslint-disable-line react-hooks/exhaustive-deps -- `area` n'est lue qu'au placement
  // Le texte reste en place pendant le fondu de sortie.
  const hide = () => setTip((current) => current && { ...current, visible: false });
  const show = (text: string, target: HTMLElement) =>
    setTip({
      text,
      anchor: target.getBoundingClientRect(),
      visible: true,
      host: target.closest<HTMLElement>('dialog[open]') ?? document.body,
    });
  const hover = (text: string | undefined) =>
    text
      ? {
          onMouseEnter: (event: { currentTarget: HTMLElement }) => show(text, event.currentTarget),
          onMouseLeave: hide,
        }
      : {};
  const tooltip: ReactNode =
    tip &&
    createPortal(
      <div key={tip.text} ref={element} className={`tooltip${tip.visible ? ' visible' : ''}`} role="tooltip">
        {tip.text}
      </div>,
      tip.host,
    );
  return { hover, show, hide, tooltip };
}

/**
 * Infobulles déclarées par l'attribut `data-tip` (sujet 393), à la place du `title` natif : une seule couche pour
 * toute l'appli, posée à sa racine, qui montre celle de l'élément survolé le plus proche (même rendu et même
 * placement que `useTooltip`). L'infobulle d'un ancêtre ne s'ajoute donc jamais à celle d'un élément.
 */
export function TooltipLayer() {
  const { show, hide, tooltip } = useTooltip();
  useEffect(() => {
    let current: HTMLElement | null = null;
    const over = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-tip]') : null;
      if (target === current) return;
      current = target;
      const text = target?.dataset.tip;
      if (target && text) show(text, target);
      else hide();
    };
    document.addEventListener('mouseover', over);
    return () => document.removeEventListener('mouseover', over);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- `show` et `hide` ne changent que d'identité
  return tooltip;
}
