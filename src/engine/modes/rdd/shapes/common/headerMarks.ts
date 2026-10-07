import { Group } from 'three';
import type { Color } from 'three';
import type { Point, ShapeModel } from '../../../../core/model/types';
import { strokeMesh } from '../../../../core/render/meshes';
import { PART_ORDER } from '../../../../core/render/types';
import type { HeaderMark } from '../../tables/tableKinds';
import { TABLE, tableScale } from '../../tables/tableLayout';

/** Icônes d'entête des tables RDD (sujets 220 à 223) : tracés dans leur cadre de 14 × 9, et leur dessin. */

/** Arc de cercle de `from` à `to` (radians, repère page : −π/2 vers le haut), en polygone. */
function arc(cx: number, cy: number, r: number, from: number, to: number, segments = 8): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = from + ((to - from) * i) / segments;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

/** Cercle en polygone. */
const circle = (cx: number, cy: number, r: number) => arc(cx, cy, r, 0, 2 * Math.PI, 16).slice(0, -1);

/**
 * Câble de la prise (sujet 223) dans le cadre de 14 × 9 : part du haut à gauche, fait un S (boucle à droite puis à
 * gauche) et file vers la prise, en bas à droite.
 */
function plugCable(): Point[] {
  return [
    { x: 1.8, y: 1.2 },
    { x: 3.4, y: 1.2 },
    ...arc(3.4, 2.6, 1.4, -Math.PI / 2, Math.PI / 2).slice(1),
    { x: 2.6, y: 4 },
    ...arc(2.6, 5.4, 1.4, -Math.PI / 2, -(3 * Math.PI) / 2).slice(1),
    { x: 6.6, y: 6.8 },
  ];
}

/** Tracés d'une icône d'entête dans son cadre de 14 × 9 : [points, fermé]. */
export const MARK_PATHS: Record<HeaderMark, Array<[Point[], boolean]>> = {
  // Deux oculaires ronds, leurs corps resserrés vers le haut, le pont.
  binoculars: [
    [circle(3.5, 6.2, 2.6), true],
    [circle(10.5, 6.2, 2.6), true],
    [
      [
        { x: 1, y: 5.5 },
        { x: 2.3, y: 0.8 },
        { x: 5, y: 0.8 },
        { x: 6, y: 5.5 },
      ],
      false,
    ],
    [
      [
        { x: 8, y: 5.5 },
        { x: 9, y: 0.8 },
        { x: 11.7, y: 0.8 },
        { x: 13, y: 5.5 },
      ],
      false,
    ],
    [
      [
        { x: 5.6, y: 3 },
        { x: 8.4, y: 3 },
      ],
      false,
    ],
  ],
  // Trois puces rondes et leurs lignes.
  list: [1.2, 4.5, 7.8].flatMap((y): Array<[Point[], boolean]> => [
    [circle(2.2, y, 0.9), true],
    [
      [
        { x: 4.6, y },
        { x: 13, y },
      ],
      false,
    ],
  ]),
  // Prise électrique : câble en S, corps rétréci côté câble, deux broches vers la droite.
  plug: [
    [plugCable(), false],
    [
      [
        { x: 6.6, y: 6 },
        { x: 7.6, y: 5.1 },
        { x: 9.6, y: 5.1 },
        { x: 9.6, y: 8.5 },
        { x: 7.6, y: 8.5 },
        { x: 6.6, y: 7.6 },
      ],
      true,
    ],
    [
      [
        { x: 9.6, y: 6 },
        { x: 11.6, y: 6 },
      ],
      false,
    ],
    [
      [
        { x: 9.6, y: 7.6 },
        { x: 11.6, y: 7.6 },
      ],
      false,
    ],
  ],
};

/**
 * Icône d'entête (sujets 220 à 222 : jumelles de la vue, liste de l'énumération, prise de l'embedded), en haut à
 * droite de l'entête, dans un cadre de 14 × 9 agrandi 1,5 fois (à l'échelle), au trait fin de la couleur de la bordure ; rien sans
 * bordure (`strokeColor=none`).
 */
export function headerMark(shape: ShapeModel, mark: HeaderMark, header: number, color: Color | null): Group {
  const group = new Group();
  group.name = 'header-mark';
  group.userData.mark = mark;
  if (!color) return group;
  const scale = tableScale(shape);
  const { width, height, zoom, margin } = TABLE.mark;
  const left = shape.bounds.x + shape.bounds.width - (margin + width * zoom) * scale;
  const top = shape.bounds.y + (header - height * zoom * scale) / 2;
  for (const [points, closed] of MARK_PATHS[mark]) {
    const path = points.map((p) => ({ x: left + p.x * zoom * scale, y: top + p.y * zoom * scale }));
    const mesh = strokeMesh(path, color, 1, { width: scale, closed });
    if (!mesh) continue;
    mesh.renderOrder = PART_ORDER.stroke;
    group.add(mesh);
  }
  return group;
}
