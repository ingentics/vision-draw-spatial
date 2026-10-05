import { stencilBox } from '../../../generic/stencil';
import type { ShapeDefinition } from '../../../types';

/**
 * Event consumer, stencil de 120 × 60 : corps à droite (x 40 à 120), enveloppe à gauche et flèche de l'enveloppe
 * vers le corps (l'événement qui arrive).
 */
const EVENT_CONSUMER = stencilBox({
  name: 'event-consumer',
  width: 120,
  height: 60,
  outline: [
    { x: 40, y: 0 },
    { x: 120, y: 0 },
    { x: 120, y: 60 },
    { x: 40, y: 60 },
  ],
  parts: [
    // Enveloppe, remplie, et son rabat.
    {
      points: [
        { x: 0, y: 22 },
        { x: 24, y: 22 },
        { x: 24, y: 38 },
        { x: 0, y: 38 },
      ],
      closed: true,
      filled: true,
      ground: true,
    },
    {
      points: [
        { x: 0, y: 22 },
        { x: 12, y: 31 },
        { x: 24, y: 22 },
      ],
      closed: false,
      ground: true,
    },
    // Flèche vers le corps, pointe ouverte.
    {
      points: [
        { x: 24, y: 30 },
        { x: 40, y: 30 },
      ],
      closed: false,
      ground: true,
    },
    {
      points: [
        { x: 34, y: 26 },
        { x: 40, y: 30 },
        { x: 34, y: 34 },
      ],
      closed: false,
      ground: true,
    },
  ],
});

/** Valeur de `shape=` de l'event consumer (stencil embarqué). */
export const EVENT_CONSUMER_SHAPE = EVENT_CONSUMER.shape;

/**
 * Event consumer : pas de forme native dans draw.io, stencil embarqué (`stencil:event-consumer`). Prisme du corps en
 * iso / 3D, enveloppe et flèche au sol devant lui ; se clique sur toutes ses bornes, flèches sur les bornes.
 */
export const definition: ShapeDefinition = {
  id: 'event-consumer',
  kinds: ['stencil:event-consumer'],
  ...EVENT_CONSUMER.box,
  contains: () => true,
  swatch: () => '<path d="M15 5h20v18H15zM3 11h8v6H3zM3 11l4 3 4-3M11 14h4"/>',
  palette: {
    name: 'Event consumer',
    category: 'architecture',
    order: 84,
    keywords: ['event', 'événement', 'consumer', 'consommateur', 'listener', 'subscriber', 'message'],
    // Texte centré sur le corps (draw.io le place dans les bornes entières).
    style: `shape=${EVENT_CONSUMER_SHAPE};whiteSpace=wrap;html=1;spacingLeft=40;`,
    value: '',
    width: 120,
    height: 60,
    icon: '<path d="M14 6h22v16H14zM2 11h8v6H2zM2 11l4 3 4-3M10 14h4M12 12l2 2-2 2"/>',
  },
};
