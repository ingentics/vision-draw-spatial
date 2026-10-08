import { ANCHORINGS, JUMP_STYLES } from '../engine';
import type { Anchoring, JumpStyle } from '../engine';
import type { ChoiceOption } from './ChoiceGroup';

/** Icônes et noms des réglages des flèches (sujet 318), partagés par le panneau de contexte et les paramètres. */

/** Icône 16 × 16 : `under` en retrait (trait croisé), `fill` plein, le reste en trait. */
function Icon({ line, under, fill, mirror }: { line: string; under?: string; fill?: string; mirror?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <g transform={mirror ? 'matrix(-1 0 0 1 16 0)' : undefined}>
        {under && <path className="icon-under" d={under} />}
        <path d={line} />
        {fill && <path className="icon-fill" d={fill} />}
      </g>
    </svg>
  );
}

export type EdgeLine = 'straight' | 'sharp' | 'rounded' | 'curved';

/** Tracés d'une flèche (coudes), dans l'ordre des boutons. */
export const EDGE_LINE_OPTIONS: Array<ChoiceOption<EdgeLine>> = [
  {
    value: 'straight',
    label: 'Droite',
    title: 'Droite : un segment direct de la source à la cible, sans coude',
    icon: <Icon line="M2 13L14 5" />,
  },
  {
    value: 'sharp',
    label: 'Angles droits',
    title: 'Angles droits : coudes à 90° (edgeStyle=orthogonalEdgeStyle)',
    icon: <Icon line="M2 13V5h12" />,
  },
  {
    value: 'rounded',
    label: 'Arrondi',
    title: 'Arrondi : coudes à 90° aux angles arrondis (rounded=1)',
    icon: <Icon line="M2 13V8a3 3 0 0 1 3-3h9" />,
  },
  {
    value: 'curved',
    label: 'Courbe',
    title: 'Courbe : tracé lissé qui passe près des coudes (curved=1)',
    icon: <Icon line="M2 13C2 7 7 5 14 5" />,
  },
];

/** Sauts aux croisements (`jumpStyle`). */
export const JUMP_LABELS: Record<JumpStyle | 'none', string> = {
  none: 'Aucun',
  arc: 'Arc',
  gap: 'Coupure',
  sharp: 'Marche',
  line: 'Ligne',
};

/** Le trait du dessus saute le trait vertical, comme `jumpPieces` (`render/edges/jumps.ts`) : demi-saut de 2,5. */
const JUMP_PATHS: Record<JumpStyle | 'none', string> = {
  none: 'M2 8h12',
  // Points de contrôle à 1,3 × la demi-longueur, comme draw.io.
  arc: 'M2 8h3.5C5.5 4.75 10.5 4.75 10.5 8H14',
  gap: 'M2 8h3.5M10.5 8H14',
  sharp: 'M2 8h3.5V5.5h5V8H14',
  line: 'M2 8h3.5M10.5 8H14M5.5 5.5v5M10.5 5.5v5',
};

/** Ce que fait chaque saut, pour l'infobulle. */
const JUMP_HINTS: Record<JumpStyle | 'none', string> = {
  none: 'la flèche croise l’autre sans marque',
  arc: 'la flèche saute l’autre par un petit arc',
  gap: 'la flèche s’interrompt au-dessus de l’autre',
  sharp: 'la flèche passe l’autre par un créneau carré',
  line: 'la flèche s’interrompt, la coupure bordée de deux petits traits',
};

export const JUMP_OPTIONS: Array<ChoiceOption<JumpStyle | 'none'>> = (['none', ...JUMP_STYLES] as const).map(
  (value) => ({
    value,
    label: JUMP_LABELS[value],
    title: `${JUMP_LABELS[value]} : ${JUMP_HINTS[value]} (jumpStyle=${value})`,
    icon: <Icon under="M8 2v12" line={JUMP_PATHS[value]} />,
  }),
);

/** Ancrages des flèches d'une page (`spatial.anchoring`). */
export const ANCHORING_LABELS: Record<Anchoring, string> = { manual: 'Manuel', auto: 'Automatique', pcb: 'Typon' };

const SHAPE = 'M2 10h12v4H2z';
const ANCHORING_ICONS: Record<Anchoring, { line: string; fill?: string; hint: string }> = {
  // Une flèche sur un point d'attache fixe.
  manual: {
    line: 'M5 2v8',
    fill: 'M5 10m-1.4 0a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0 -2.8 0',
    hint: 'on choisit le point d’attache de chaque flèche',
  },
  // Des flèches réparties sur le côté.
  auto: { line: 'M4.5 2v8M8 2v8M11.5 2v8', hint: 'on choisit le côté, les flèches y sont réparties sans se croiser' },
  // Pistes à 45°.
  pcb: {
    line: 'M1.5 2.5H4l3.5 3.5V10M14.5 2.5H13l-2.5 2.5V10',
    hint: 'comme l’automatique, tracé à 45° comme les pistes d’un circuit imprimé',
  },
};

export const ANCHORING_OPTIONS: Array<ChoiceOption<Anchoring>> = ANCHORINGS.map((value) => ({
  value,
  label: ANCHORING_LABELS[value],
  title: `${ANCHORING_LABELS[value]} : ${ANCHORING_ICONS[value].hint} (spatial.anchoring=${value})`,
  icon: <Icon under={SHAPE} line={ANCHORING_ICONS[value].line} fill={ANCHORING_ICONS[value].fill} />,
}));

/**
 * Bouts de flèche (`startArrow`, `endArrow`) que l'appli dessine, s'ils peuvent être vides, et leur icône, pointe en
 * x = 15 : `shape` (pleine si `fillable` et la case cochée), `line` le trait jusqu'au bout.
 */
export const MARKERS: Array<{ value: string; label: string; fillable: boolean; shape?: string; line?: string }> = [
  { value: 'none', label: 'Aucun', fillable: false, line: 'M1 8H15' },
  { value: 'classic', label: 'Classique', fillable: true, shape: 'M15 8L8.5 4.5L10.5 8L8.5 11.5Z', line: 'M1 8H10.5' },
  { value: 'classicThin', label: 'Classique fine', fillable: true, shape: 'M15 8L8.5 6L10 8L8.5 10Z', line: 'M1 8H10' },
  { value: 'block', label: 'Triangle', fillable: true, shape: 'M15 8L9 4.5V11.5Z', line: 'M1 8H9' },
  { value: 'blockThin', label: 'Triangle fin', fillable: true, shape: 'M15 8L9 6V10Z', line: 'M1 8H9' },
  { value: 'open', label: 'Ouverte', fillable: false, shape: 'M9.5 4.5L15 8L9.5 11.5' },
  { value: 'openThin', label: 'Ouverte fine', fillable: false, shape: 'M9.5 6L15 8L9.5 10' },
  {
    value: 'oval',
    label: 'Rond',
    fillable: true,
    shape: 'M10 8a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0',
    line: 'M1 8H10',
  },
  { value: 'diamond', label: 'Losange', fillable: true, shape: 'M15 8L11.5 4.5L8 8L11.5 11.5Z', line: 'M1 8H8' },
  { value: 'diamondThin', label: 'Losange fin', fillable: true, shape: 'M15 8L11.5 6L8 8L11.5 10Z', line: 'M1 8H8' },
  // Cardinalités des diagrammes entité-relation (sujet 265).
  { value: 'ERone', label: 'ER : un', fillable: false, shape: 'M12 4.5v7' },
  { value: 'ERmandOne', label: 'ER : un et un seul', fillable: false, shape: 'M12 4.5v7M9.5 4.5v7' },
  {
    value: 'ERzeroToOne',
    label: 'ER : zéro ou un',
    fillable: false,
    shape: 'M12.5 4.5v7M6.5 8a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    line: 'M1 8H6.5M10.5 8H15',
  },
  { value: 'ERmany', label: 'ER : plusieurs', fillable: false, shape: 'M15 4.5L10.5 8L15 11.5' },
  { value: 'ERoneToMany', label: 'ER : un ou plusieurs', fillable: false, shape: 'M15 4.5L10.5 8L15 11.5M9 4.5v7' },
  {
    value: 'ERzeroToMany',
    label: 'ER : zéro ou plusieurs',
    fillable: false,
    shape: 'M15 4.5L10.5 8L15 11.5M5 8a2 2 0 1 0 4 0a2 2 0 1 0 -4 0',
    line: 'M1 8H5M9 8H15',
  },
];

/** Choix des bouts d'un côté : pointe vers la gauche au début ; pleine ou vide selon la case du côté. */
export function markerOptions(end: 'start' | 'end', filled: boolean): Array<ChoiceOption<string>> {
  return MARKERS.map(({ value, label, fillable, shape, line = 'M1 8H15' }) => {
    const full = fillable && filled;
    const look = fillable ? (filled ? ', pleine' : ', vide') : '';
    return {
      value,
      label,
      title: `${label}${look} (${end}Arrow=${value})`,
      icon: (
        <Icon
          line={full ? line : [line, shape].filter(Boolean).join('')}
          fill={full ? shape : undefined}
          mirror={end === 'start'}
        />
      ),
    };
  });
}
