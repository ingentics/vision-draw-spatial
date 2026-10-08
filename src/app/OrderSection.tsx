import type { ReactElement } from 'react';
import type { OrderMove } from '../engine';
import { Section } from './PanelSection';
import { useTooltip } from './Tooltip';

/**
 * Ordre de dessin, comme « Disposition » de draw.io : parmi les éléments de même parent (calque, conteneur).
 * Boutons-icônes (ticket 355), du plus haut au plus bas.
 */
export function OrderSection({ onOrder }: { onOrder: (move: OrderMove) => void }) {
  const { hover, tooltip } = useTooltip();
  return (
    <Section title="Disposition">
      <div className="arrange-buttons">
        {ACTIONS.map(({ move, title, icon }) => (
          <button
            key={move}
            type="button"
            className="button arrange-button order-button"
            aria-label={title}
            {...hover(title)}
            onClick={() => onOrder(move)}
          >
            {icon}
          </button>
        ))}
      </div>
      {tooltip}
    </Section>
  );
}

/** Carré en contour, plein de la couleur du bouton : il cache ce qu'il recouvre. */
const other = (x: number, y: number, size: number) => (
  <rect className="order-other" x={x} y={y} width={size} height={size} rx="1" />
);
/** L'élément déplacé, en couleur d'accent. */
const moved = (x: number, y: number, size: number) => (
  <rect className="order-moved" x={x} y={y} width={size} height={size} rx="1" />
);

/**
 * Icônes en 18 × 18 : trois carrés en escalier pour « devant / derrière tout », l'accent au-dessus ou en dessous des
 * deux autres ; deux carrés et une flèche pour « d'un cran ».
 */
const ACTIONS: Array<{ move: OrderMove; title: string; icon: ReactElement }> = [
  {
    move: 'front',
    title: 'Premier plan : passer au-dessus de tout (Ctrl / ⌘ + Maj + F)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        {other(1, 1, 8)}
        {other(9, 9, 8)}
        {moved(4.5, 4.5, 9)}
      </svg>
    ),
  },
  {
    move: 'forward',
    title: 'Avancer : monter d’un cran (Alt + Maj + F)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        {other(1, 7, 10)}
        {moved(6, 2, 10)}
        <path className="order-arrow" d="M3.5 4.5 V1 M1.8 2.7 L3.5 1 L5.2 2.7" />
      </svg>
    ),
  },
  {
    move: 'backward',
    title: 'Reculer : descendre d’un cran (Alt + Maj + B)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        {moved(6, 2, 10)}
        {other(1, 7, 10)}
        <path className="order-arrow" d="M14.5 13.5 V17 M12.8 15.3 L14.5 17 L16.2 15.3" />
      </svg>
    ),
  },
  {
    move: 'back',
    title: 'Arrière-plan : passer sous tout (Ctrl / ⌘ + Maj + B)',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        {moved(4.5, 4.5, 9)}
        {other(1, 1, 8)}
        {other(9, 9, 8)}
      </svg>
    ),
  },
];
