import type { AlignMove, AlignReference, DistributeMove } from '../engine';
import { ChoiceGroup } from './ChoiceGroup';
import type { ChoiceOption } from './ChoiceGroup';
import { Section } from './PanelSection';

/**
 * Aligner et répartir la sélection (ticket 136), comme « Arrange › Align / Distribute » de draw.io : avec au moins
 * deux formes ; la répartition à partir de trois. La référence de l'alignement est un réglage de l'appli.
 */
export function ArrangeSection({
  shapeCount,
  reference,
  onReference,
  onAlign,
  onDistribute,
}: {
  /** Formes de la sélection (les flèches ne comptent pas). */
  shapeCount: number;
  reference: AlignReference;
  onReference: (reference: AlignReference) => void;
  onAlign: (move: AlignMove) => void;
  onDistribute: (move: DistributeMove) => void;
}) {
  if (shapeCount < 2) return null;
  const canDistribute = shapeCount >= 3;
  return (
    <Section title="Aligner">
      <div className="field-row">
        <span title="Forme de référence de l’alignement, qui ne bouge pas">Par rapport à</span>
        <ChoiceGroup
          label="Référence de l’alignement"
          value={reference}
          options={REFERENCE_OPTIONS}
          onChange={(value) => value && onReference(value)}
        />
      </div>
      {[ALIGN_ACTIONS.slice(0, 5), ALIGN_ACTIONS.slice(5)].map((actions, row) => (
        <div key={row} className="arrange-buttons">
          {actions.map(({ move, title, icon }) => (
            <button
              key={move}
              type="button"
              className="button arrange-button"
              title={title}
              onClick={() => onAlign(move)}
            >
              <ArrangeIcon parts={icon} vertical={row === 1} />
            </button>
          ))}
        </div>
      ))}
      <h4 className="arrange-title">Répartir</h4>
      {[DISTRIBUTE_ACTIONS.slice(0, 4), DISTRIBUTE_ACTIONS.slice(4)].map((actions, row) => (
        <div key={row} className="arrange-buttons">
          {actions.map(({ move, title, icon }) => (
            <button
              key={move}
              type="button"
              className="button arrange-button"
              title={canDistribute ? title : `${title} (à partir de trois formes)`}
              disabled={!canDistribute}
              onClick={() => onDistribute(move)}
            >
              <ArrangeIcon parts={icon} vertical={row === 1} />
            </button>
          ))}
        </div>
      ))}
    </Section>
  );
}

/**
 * Icône en 18 × 18, dessinée pour la ligne horizontale (« vertical » la transpose) : `bar` = forme pleine,
 * `ref` = forme de référence (contour), `mark` = trait d'alignement (couleur d'accent).
 */
type IconPart =
  | { kind: 'bar' | 'ref'; x: number; y: number; w: number; h: number }
  | { kind: 'mark'; x1: number; y1: number; x2: number; y2: number };

const bar = (x: number, y: number, w: number, h: number): IconPart => ({ kind: 'bar', x, y, w, h });
const ref = (x: number, y: number, w: number, h: number): IconPart => ({ kind: 'ref', x, y, w, h });
const mark = (x1: number, y1: number, x2: number, y2: number): IconPart => ({ kind: 'mark', x1, y1, x2, y2 });
/** Deux formes empilées (8 et 12 de large) dont le bord gauche est en `x8` et `x12`. */
const pair = (x8: number, x12: number) => [bar(x8, 4, 8, 4), bar(x12, 10, 12, 4)];
/** Trois formes côte à côte. */
const row3 = [bar(1, 5, 3, 9), bar(7.5, 3, 3, 12), bar(14, 6, 3, 7)];

/** Deux formes de la sélection, la référence en contour : cadre englobant, première forme, dernière forme. */
const REFERENCE_OPTIONS: Array<ChoiceOption<AlignReference>> = (
  [
    [
      'selection',
      'Sélection',
      'les formes s’alignent sur le cadre englobant de la sélection',
      [bar(2.5, 3, 6, 6), bar(10.5, 8, 5, 7), ref(1, 1.5, 16, 15)],
    ],
    [
      'first',
      'Premier sélectionné',
      'la première forme choisie reste en place, les autres s’alignent sur elle',
      [ref(2.5, 3, 6, 6), bar(10.5, 8, 5, 7)],
    ],
    [
      'last',
      'Dernier sélectionné',
      'la dernière forme choisie reste en place, les autres s’alignent sur elle',
      [bar(2.5, 3, 6, 6), ref(10.5, 8, 5, 7)],
    ],
  ] as const
).map(([value, label, hint, parts]) => ({
  value,
  label,
  title: `${label} : ${hint}`,
  icon: <ArrangeIcon parts={parts} vertical={false} />,
}));

const ALIGN_ACTIONS: Array<{ move: AlignMove; title: string; icon: IconPart[] }> = [
  {
    move: 'leftOf',
    title: 'Placer à gauche de la référence',
    icon: [...pair(2, 0), mark(12, 1, 12, 17), ref(13.5, 5, 3.5, 8)],
  },
  { move: 'left', title: 'Aligner à gauche', icon: [...pair(4, 4), mark(3, 1, 3, 17)] },
  { move: 'center', title: 'Centrer horizontalement', icon: [...pair(5, 3), mark(9, 1, 9, 17)] },
  { move: 'right', title: 'Aligner à droite', icon: [...pair(6, 2), mark(15, 1, 15, 17)] },
  {
    move: 'rightOf',
    title: 'Placer à droite de la référence',
    icon: [...pair(7, 7), mark(6, 1, 6, 17), ref(1, 5, 3.5, 8)],
  },
  {
    move: 'above',
    title: 'Placer au-dessus de la référence',
    icon: [...pair(2, 0), mark(12, 1, 12, 17), ref(13.5, 5, 3.5, 8)],
  },
  { move: 'top', title: 'Aligner en haut', icon: [...pair(4, 4), mark(3, 1, 3, 17)] },
  { move: 'middle', title: 'Centrer verticalement', icon: [...pair(5, 3), mark(9, 1, 9, 17)] },
  { move: 'bottom', title: 'Aligner en bas', icon: [...pair(6, 2), mark(15, 1, 15, 17)] },
  {
    move: 'below',
    title: 'Placer en dessous de la référence',
    icon: [...pair(7, 7), mark(6, 1, 6, 17), ref(1, 5, 3.5, 8)],
  },
];

const DISTRIBUTE_ACTIONS: Array<{ move: DistributeMove; title: string; icon: IconPart[] }> = [
  {
    move: 'left',
    title: 'Répartir les bords gauches',
    icon: [...row3, ...[1, 7.5, 14].map((x) => mark(x, 0.5, x, 17.5))],
  },
  {
    move: 'center',
    title: 'Répartir les centres',
    icon: [...row3, ...[2.5, 9, 15.5].map((x) => mark(x, 0.5, x, 17.5))],
  },
  {
    move: 'right',
    title: 'Répartir les bords droits',
    icon: [...row3, ...[4, 10.5, 17].map((x) => mark(x, 0.5, x, 17.5))],
  },
  { move: 'spacingX', title: 'Espacer également', icon: [...row3, mark(4.5, 9, 7, 9), mark(11, 9, 13.5, 9)] },
  { move: 'top', title: 'Répartir les hauts', icon: [...row3, ...[1, 7.5, 14].map((x) => mark(x, 0.5, x, 17.5))] },
  {
    move: 'middle',
    title: 'Répartir les milieux',
    icon: [...row3, ...[2.5, 9, 15.5].map((x) => mark(x, 0.5, x, 17.5))],
  },
  { move: 'bottom', title: 'Répartir les bas', icon: [...row3, ...[4, 10.5, 17].map((x) => mark(x, 0.5, x, 17.5))] },
  {
    move: 'spacingY',
    title: 'Espacer également en hauteur',
    icon: [...row3, mark(4.5, 9, 7, 9), mark(11, 9, 13.5, 9)],
  },
];

function ArrangeIcon({ parts, vertical }: { parts: readonly IconPart[]; vertical: boolean }) {
  return (
    <svg className="arrange-icon" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      {parts.map((part, i) => {
        if (part.kind === 'mark') {
          const [x1, y1, x2, y2] = vertical
            ? [part.y1, part.x1, part.y2, part.x2]
            : [part.x1, part.y1, part.x2, part.y2];
          return <line key={i} className="arrange-mark" x1={x1} y1={y1} x2={x2} y2={y2} />;
        }
        const [x, y, width, height] = vertical ? [part.y, part.x, part.h, part.w] : [part.x, part.y, part.w, part.h];
        return <rect key={i} className={`arrange-${part.kind}`} x={x} y={y} width={width} height={height} />;
      })}
    </svg>
  );
}
