import type { Point } from '../../../../model/types';
import { stencilBox, stencilRound } from '../../../generic/stencil';
import type { ShapeDefinition } from '../../../types';

/** Engrenage du coin haut droit (coordonnées du stencil 120 × 60) : centre, rayons aux dents et au creux, moyeu. */
const GEAR = { cx: 104, cy: 14, outer: 9, inner: 7, hub: 3, teeth: 8 };
/** Demi-largeur angulaire d'une dent, en fraction du pas : en haut, puis au pied. */
const TOOTH_TOP = 0.18;
const TOOTH_BASE = 0.3;
const HUB_SEGMENTS = 16;

const polar = (radius: number, angle: number): Point => ({
  x: stencilRound(GEAR.cx + radius * Math.cos(angle)),
  y: stencilRound(GEAR.cy + radius * Math.sin(angle)),
});

/** Contour de l'engrenage : à chaque dent, pied, sommet, sommet, pied. */
const gear: Point[] = Array.from({ length: GEAR.teeth }, (_, k) => {
  const step = (2 * Math.PI) / GEAR.teeth;
  const a = k * step;
  return [
    polar(GEAR.inner, a - TOOTH_BASE * step),
    polar(GEAR.outer, a - TOOTH_TOP * step),
    polar(GEAR.outer, a + TOOTH_TOP * step),
    polar(GEAR.inner, a + TOOTH_BASE * step),
  ];
}).flat();

const hub: Point[] = Array.from({ length: HUB_SEGMENTS }, (_, k) => polar(GEAR.hub, (k * 2 * Math.PI) / HUB_SEGMENTS));

const BACKGROUND_TASK = stencilBox({
  name: 'background-task',
  width: 120,
  height: 60,
  outline: [
    { x: 0, y: 0 },
    { x: 120, y: 0 },
    { x: 120, y: 60 },
    { x: 0, y: 60 },
  ],
  parts: [
    { points: gear, closed: true },
    { points: hub, closed: true },
  ],
});

/** Valeur de `shape=` de la tâche de fond (stencil embarqué). */
export const BACKGROUND_TASK_SHAPE = BACKGROUND_TASK.shape;

/**
 * Tâche de fond : stencil embarqué (`stencil:background-task`), rectangle à l'engrenage dans le coin haut droit.
 * Prisme du rectangle en iso / 3D, engrenage sur le dessus.
 */
export const definition: ShapeDefinition = {
  id: 'background-task',
  kinds: ['stencil:background-task'],
  ...BACKGROUND_TASK.box,
  swatch: () =>
    '<path d="M6 5h28v18H6z"/><circle cx="29" cy="10" r="2.5"/><path d="M29 6v1.5M29 12.5V14M25 10h1.5M31.5 10H33"/>',
  palette: {
    name: 'Tâche de fond',
    category: 'architecture',
    order: 86,
    keywords: ['tâche', 'fond', 'background', 'worker', 'job', 'daemon', 'asynchrone', 'async'],
    style: `shape=${BACKGROUND_TASK_SHAPE};whiteSpace=wrap;html=1;`,
    value: '',
    width: 120,
    height: 60,
    icon: '<path d="M4 6h32v16H4z"/><circle cx="30" cy="11" r="2.5"/><path d="M30 7v1.5M30 13.5V15M26 11h1.5M32.5 11H34"/>',
  },
};
