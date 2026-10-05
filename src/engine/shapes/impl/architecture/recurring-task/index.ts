import type { Point } from '../../../../model/types';
import { stencilBox, stencilRound } from '../../../generic/stencil';
import type { ShapeDefinition } from '../../../types';

/**
 * Flèche circulaire ↻ du coin haut droit (coordonnées du stencil 120 × 60) : arc de rayon `radius` autour du centre,
 * parcouru dans le sens horaire de `from` à `to` (degrés, y vers le bas), ouvert en haut ; pointe ouverte au bout.
 */
const ARROW = { cx: 104, cy: 14, radius: 7, from: -30, to: 260, segments: 24, head: 3.5 };

const at = (radius: number, degrees: number): Point => {
  const a = (degrees * Math.PI) / 180;
  return { x: ARROW.cx + radius * Math.cos(a), y: ARROW.cy + radius * Math.sin(a) };
};
const round = (p: Point): Point => ({ x: stencilRound(p.x), y: stencilRound(p.y) });

const arc: Point[] = Array.from({ length: ARROW.segments + 1 }, (_, k) =>
  round(at(ARROW.radius, ARROW.from + ((ARROW.to - ARROW.from) * k) / ARROW.segments)),
);

/** Pointe : deux branches derrière le bout, de part et d'autre de l'arc (tangente au bout, sens horaire). */
const head: Point[] = (() => {
  const end = at(ARROW.radius, ARROW.to);
  const a = (ARROW.to * Math.PI) / 180;
  const tangent = { x: -Math.sin(a), y: Math.cos(a) };
  const normal = { x: Math.cos(a), y: Math.sin(a) };
  const back = (side: number) => ({
    x: end.x - ARROW.head * tangent.x + side * ARROW.head * normal.x,
    y: end.y - ARROW.head * tangent.y + side * ARROW.head * normal.y,
  });
  return [back(1), end, back(-1)].map(round);
})();

const RECURRING_TASK = stencilBox({
  name: 'recurring-task',
  width: 120,
  height: 60,
  outline: [
    { x: 0, y: 0 },
    { x: 120, y: 0 },
    { x: 120, y: 60 },
    { x: 0, y: 60 },
  ],
  parts: [
    { points: arc, closed: false },
    { points: head, closed: false },
  ],
});

/** Valeur de `shape=` de la tâche récurrente (stencil embarqué). */
export const RECURRING_TASK_SHAPE = RECURRING_TASK.shape;

/**
 * Tâche récurrente : stencil embarqué (`stencil:recurring-task`), rectangle à la flèche circulaire dans le coin haut
 * droit. Prisme du rectangle en iso / 3D, flèche sur le dessus.
 */
export const definition: ShapeDefinition = {
  id: 'recurring-task',
  kinds: ['stencil:recurring-task'],
  ...RECURRING_TASK.box,
  swatch: () => '<path d="M6 5h28v18H6zM31.5 8.5a3.5 3.5 0 1 1-3-1.5M27 5.5l1.5 1.5-1.5 1.5"/>',
  palette: {
    name: 'Tâche récurrente',
    category: 'architecture',
    order: 88,
    keywords: ['tâche', 'récurrente', 'recurring', 'cron', 'planifiée', 'scheduled', 'batch', 'périodique'],
    style: `shape=${RECURRING_TASK_SHAPE};whiteSpace=wrap;html=1;`,
    value: '',
    width: 120,
    height: 60,
    icon: '<path d="M4 6h32v16H4zM33 10a4 4 0 1 1-3.5-2M28 6.5l1.5 1.5-1.5 1.5"/>',
  },
};
