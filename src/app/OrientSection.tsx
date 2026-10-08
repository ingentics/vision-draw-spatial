import type { ReactElement } from 'react';
import type { OrientAction, ShapeModel } from '../engine';
import { Section } from './PanelSection';
import { useEnginePlugins } from './pluginsContext';
import { useTooltip } from './Tooltip';

/**
 * Retourner et pivoter les formes (sujet 335) : les boutons sont ceux que permettent les formes de la sélection (leur
 * définition le déclare, le panneau ne connaît aucune forme) ; la section disparaît si aucune ne permet rien.
 * Seule la forme change, le texte garde son sens.
 */
export function OrientSection({
  shapes,
  onOrient,
}: {
  shapes: readonly ShapeModel[];
  onOrient: (action: OrientAction) => void;
}) {
  const plugins = useEnginePlugins();
  const { hover, tooltip } = useTooltip();
  const can = shapes.map((shape) => plugins.shapes.orientable(shape));
  const buttons = ACTIONS.filter(({ allowed }) => can.some(allowed));
  if (buttons.length === 0) return null;
  return (
    <Section title="Orientation">
      <div className="arrange-buttons">
        {buttons.map(({ action, title, icon }) => (
          <button
            key={action}
            type="button"
            className="button arrange-button orient-button"
            aria-label={title}
            {...hover(title)}
            onClick={() => onOrient(action)}
          >
            {icon}
          </button>
        ))}
      </div>
      {tooltip}
    </Section>
  );
}

type Can = ReturnType<ReturnType<typeof useEnginePlugins>['shapes']['orientable']>;

/** Icônes en 18 × 18 : forme en trait, flèche d'accent. À remplacer par les icônes dessinées. */
const ACTIONS: Array<{ action: OrientAction; title: string; allowed: (can: Can) => boolean; icon: ReactElement }> = [
  {
    action: 'flipHorizontal',
    title: 'Retourner horizontalement (miroir gauche ↔ droite)',
    allowed: (can) => can.flipHorizontal,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M7 3 L7 15 L2 15 Z" />
        <path d="M11 3 L11 15 L16 15 Z" />
        <line className="orient-mark" x1="9" y1="1.5" x2="9" y2="16.5" />
      </svg>
    ),
  },
  {
    action: 'flipVertical',
    title: 'Retourner verticalement (miroir haut ↔ bas)',
    allowed: (can) => can.flipVertical,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M3 7 L15 7 L15 2 Z" />
        <path d="M3 11 L15 11 L15 16 Z" />
        <line className="orient-mark" x1="1.5" y1="9" x2="16.5" y2="9" />
      </svg>
    ),
  },
  {
    action: 'rotateLeft',
    title: 'Pivoter de 90° à gauche',
    allowed: (can) => can.rotate,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <rect x="3" y="8" width="8" height="7" />
        <path className="orient-mark" d="M5 5 H11 A3 3 0 0 1 14 8" />
        <path className="orient-mark" d="M7 3 L5 5 L7 7" />
      </svg>
    ),
  },
  {
    action: 'rotateRight',
    title: 'Pivoter de 90° à droite',
    allowed: (can) => can.rotate,
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <rect x="7" y="8" width="8" height="7" />
        <path className="orient-mark" d="M13 5 H7 A3 3 0 0 0 4 8" />
        <path className="orient-mark" d="M11 3 L13 5 L11 7" />
      </svg>
    ),
  },
];
