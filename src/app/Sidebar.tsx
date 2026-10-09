import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from '../engine';
import type { PanelsSettings, SidePanelSettings } from '../engine';

/**
 * Barre latérale de l'appli (palette à gauche, panneaux à droite) : repliable en une bande verticale
 * qui porte son nom, et redimensionnable par une poignée sur son bord intérieur. La disposition est
 * enregistrée dans les paramètres (`panels`).
 */

type Side = 'left' | 'right';

/** Pas des flèches du clavier sur la poignée. */
const KEY_STEP = 16;

/** Durée du glissement de la barre vers son bord ou depuis lui (passage page ↔ vue graphe, sujet 363). */
const SLIDE_MS = 200;

/** Glissement de la barre : `in` arrive depuis son bord, `out` y part (et y reste jusqu'à son retrait). */
export type SidebarSlide = 'in' | 'out';

const ARROWS = { left: { collapse: '«', expand: '»' }, right: { collapse: '»', expand: '«' } } as const;

const CollapseContext = createContext<{ side: Side; collapse: () => void } | undefined>(undefined);

/** Bouton « Replier le panneau », placé par chaque panneau en haut de la barre qui le contient. */
export function CollapseButton() {
  const context = useContext(CollapseContext);
  if (!context) return null;
  return (
    <button
      type="button"
      className="icon-button sidebar-collapse"
      onClick={context.collapse}
      data-tip="Replier le panneau"
      aria-label="Replier le panneau"
      aria-expanded="true"
    >
      {ARROWS[context.side].collapse}
    </button>
  );
}

interface SidebarProps {
  side: Side;
  /** Nom affiché sur la bande quand la barre est repliée. */
  label: string;
  layout: SidePanelSettings;
  /** Sens du nom sur la bande repliée. */
  stripText: PanelsSettings['stripText'];
  /** Largeur que le plan garde toujours quand on élargit la barre (paramètre `panels.minCanvas`). */
  minCanvas: number;
  onChange: (patch: Partial<SidePanelSettings>) => void;
  /** Glissement en cours ; la zone de dessin suit la place libérée ou prise. */
  slide?: SidebarSlide;
  children: ReactNode;
}

export function Sidebar({ side, label, layout, stripText, minCanvas, onChange, slide, children }: SidebarProps) {
  const { min, max } = SETTINGS_LIMITS[`panels.${side}.width`];
  const defaultWidth = DEFAULT_SETTINGS.panels[side].width;
  // Largeur suivie en direct pendant un glisser ; enregistrée seulement au lâcher.
  const [dragWidth, setDragWidth] = useState<number>();
  const drag = useRef<{ x: number; width: number; limit: number } | undefined>(undefined);
  const handle = useRef<HTMLDivElement>(null);
  const width = dragWidth ?? layout.width;
  useEffect(() => setDragWidth(undefined), [layout.width]);
  // Barre ou bande repliée : l'élément qui glisse.
  const root = useRef<HTMLElement | null>(null);
  const setRoot = (element: HTMLElement | null) => {
    root.current = element;
  };
  // Marge négative de la largeur de l'élément : il passe derrière son bord et la zone de dessin prend sa place.
  useLayoutEffect(() => {
    const element = root.current;
    if (!slide || !element) return;
    const margin = side === 'left' ? 'marginLeft' : 'marginRight';
    const shown = { [margin]: '0px' };
    const hidden = { [margin]: `${-element.offsetWidth}px` };
    const animation = element.animate(slide === 'in' ? [hidden, shown] : [shown, hidden], {
      duration: SLIDE_MS,
      easing: 'ease-out',
      fill: slide === 'out' ? 'forwards' : 'none',
    });
    return () => animation.cancel();
  }, [slide, side]);

  if (layout.collapsed) {
    return (
      <button
        ref={setRoot}
        type="button"
        className={`sidebar-strip sidebar-strip-${side} sidebar-strip-${stripText}`}
        onClick={() => onChange({ collapsed: false })}
        data-tip={`Afficher le panneau ${label}`}
        aria-label={`Afficher le panneau ${label}`}
        aria-expanded="false"
      >
        <span className="sidebar-strip-arrow" aria-hidden="true">
          {ARROWS[side].expand}
        </span>
        <span className="sidebar-strip-label">{label}</span>
      </button>
    );
  }

  /** Largeur maximale permise : bornes du réglage, et le plan garde `minCanvas`. */
  const limitFor = (current: number) => {
    const canvas = handle.current?.closest('.viewport')?.querySelector('.canvas-area');
    const room = canvas ? canvas.getBoundingClientRect().width - minCanvas : Infinity;
    return Math.min(max, Math.max(current, current + room));
  };
  const clamp = (value: number, limit: number) => Math.round(Math.min(limit, Math.max(min, value)));
  const direction = side === 'left' ? 1 : -1;

  return (
    <div ref={setRoot} className={`sidebar sidebar-${side}`} style={{ width }}>
      <CollapseContext.Provider value={{ side, collapse: () => onChange({ collapsed: true }) }}>
        {children}
      </CollapseContext.Provider>
      <div
        ref={handle}
        className="sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="Largeur du panneau"
        aria-valuenow={width}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        data-tip="Glisser pour changer la largeur (double-clic : largeur par défaut)"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, width, limit: limitFor(width) };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          setDragWidth(clamp(start.width + (event.clientX - start.x) * direction, start.limit));
        }}
        onPointerUp={() => {
          if (!drag.current) return;
          drag.current = undefined;
          if (dragWidth !== undefined && dragWidth !== layout.width) onChange({ width: dragWidth });
          else setDragWidth(undefined);
        }}
        onLostPointerCapture={() => {
          drag.current = undefined;
        }}
        onDoubleClick={() => onChange({ width: defaultWidth })}
        onKeyDown={(event) => {
          let next: number | undefined;
          // Les flèches déplacent le bord de la barre (à droite, ← l'élargit).
          if (event.key === 'ArrowRight') next = width + KEY_STEP * direction;
          else if (event.key === 'ArrowLeft') next = width - KEY_STEP * direction;
          else if (event.key === 'Home') next = defaultWidth;
          if (next === undefined) return;
          event.preventDefault();
          event.stopPropagation();
          onChange({ width: clamp(next, limitFor(width)) });
        }}
      />
    </div>
  );
}
