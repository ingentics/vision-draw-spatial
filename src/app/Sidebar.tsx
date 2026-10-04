import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from '../engine/settings';
import type { PanelsSettings, SidePanelSettings } from '../engine/settings';

/**
 * Barre latérale de l'appli (palette à gauche, panneaux à droite) : repliable en une bande verticale
 * qui porte son nom, et redimensionnable par une poignée sur son bord intérieur. La disposition est
 * enregistrée dans les paramètres (`panels`).
 */

type Side = 'left' | 'right';

/** Le plan garde toujours au moins cette largeur quand on élargit une barre. */
const MIN_CANVAS = 320;
/** Pas des flèches du clavier sur la poignée. */
const KEY_STEP = 16;

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
      title="Replier le panneau"
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
  onChange: (patch: Partial<SidePanelSettings>) => void;
  children: ReactNode;
}

export function Sidebar({ side, label, layout, stripText, onChange, children }: SidebarProps) {
  const { min, max } = SETTINGS_LIMITS[`panels.${side}.width`];
  const defaultWidth = DEFAULT_SETTINGS.panels[side].width;
  // Largeur suivie en direct pendant un glisser ; enregistrée seulement au lâcher.
  const [dragWidth, setDragWidth] = useState<number>();
  const drag = useRef<{ x: number; width: number; limit: number } | undefined>(undefined);
  const handle = useRef<HTMLDivElement>(null);
  const width = dragWidth ?? layout.width;
  useEffect(() => setDragWidth(undefined), [layout.width]);

  if (layout.collapsed) {
    return (
      <button
        type="button"
        className={`sidebar-strip sidebar-strip-${side} sidebar-strip-${stripText}`}
        onClick={() => onChange({ collapsed: false })}
        title={`Afficher le panneau ${label}`}
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

  /** Largeur maximale permise : bornes du réglage, et le plan garde `MIN_CANVAS`. */
  const limitFor = (current: number) => {
    const canvas = handle.current?.closest('.viewport')?.querySelector('.canvas-area');
    const room = canvas ? canvas.getBoundingClientRect().width - MIN_CANVAS : Infinity;
    return Math.min(max, Math.max(current, current + room));
  };
  const clamp = (value: number, limit: number) => Math.round(Math.min(limit, Math.max(min, value)));
  const direction = side === 'left' ? 1 : -1;

  return (
    <div className={`sidebar sidebar-${side}`} style={{ width }}>
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
        title="Glisser pour changer la largeur (double-clic : largeur par défaut)"
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
