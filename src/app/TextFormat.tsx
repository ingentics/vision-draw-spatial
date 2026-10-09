import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import {
  fontStyleBits,
  fitTextMode,
  fontStyleValue,
  isHexColor,
  isMonospace,
  LABEL_PLACES,
  labelPlaceName,
  labelPlaceOf,
  labelPlacePatch,
  matchesTextPreset,
  styleNumber,
} from '../engine';
import type { LabelPlace, TextPreset } from '../engine';
import type { SelectionFormat, ToggleMark } from './LabelEditor';
import { Section } from './PanelSection';
import { useTooltip } from './Tooltip';

/** Action du panneau de format : sur la sélection dans le texte, sinon sur tout le texte. */
export type TextAction =
  | { type: 'toggle'; mark: ToggleMark }
  | { type: 'size'; size: number }
  | { type: 'color'; color: string | undefined }
  | { type: 'preset'; preset: TextPreset }
  | { type: 'align'; key: 'align' | 'verticalAlign'; value: string }
  | { type: 'place'; place: LabelPlace }
  | { type: 'fit'; on: boolean };

/** Texte en cours d'édition en place, vu par le panneau de format. */
export interface TextEdit {
  /** Style draw.io de la cellule du texte (format de tout le texte). */
  style: Record<string, string>;
  /** Format de la sélection dans le texte ; absent : pas de sélection, le format vaut pour tout le texte. */
  selection?: SelectionFormat;
  /** Faux tant que le texte n'existe pas (début / fin d'une flèche à créer) : seule la sélection se formate. */
  canFormat: boolean;
  /** Texte d'une flèche (l'alignement fixe le côté du texte qui reste sur son point). */
  onEdge: boolean;
  /** Taille obtenue en mode « Ajuster » (`fitText=1`), mesurée par l'éditeur ; absente hors de ce mode. */
  fittedSize?: number;
  presets: TextPreset[];
  onAction: (action: TextAction) => void;
  /** Valide la saisie et revient au panneau de l'élément qui porte le texte (forme ou flèche). */
  onOwner?: () => void;
  /**
   * Commentaire de l'élément (édité dans l'encart du rendu) : ni alignement, ni position, ni ajustement ; `onEdge` dit
   * alors si l'élément est une flèche.
   */
  comment?: boolean;
}

const DEFAULT_SIZE = 11;
const SIZE_LIMITS = { min: 4, max: 128 };
/** Couleurs de texte rapides : noir, gris, blanc, puis les contours des styles draw.io. */
const TEXT_COLORS = [
  '#000000',
  '#333333',
  '#808080',
  '#ffffff',
  '#6c8ebf',
  '#82b366',
  '#d79b00',
  '#b85450',
  '#9673a6',
  '#1a73e8',
];
const MARKS: Array<{ mark: ToggleMark; label: string; tip: string; content: ReactNode }> = [
  {
    mark: 'bold',
    label: 'Gras',
    tip: 'Gras (Ctrl+B) : la sélection, sinon tout le texte (fontStyle)',
    content: <strong>B</strong>,
  },
  {
    mark: 'italic',
    label: 'Italique',
    tip: 'Italique (Ctrl+I) : la sélection, sinon tout le texte (fontStyle)',
    content: <em>I</em>,
  },
  {
    mark: 'underline',
    label: 'Souligné',
    tip: 'Souligné (Ctrl+U) : la sélection, sinon tout le texte (fontStyle)',
    content: <u>U</u>,
  },
  { mark: 'strike', label: 'Barré', tip: 'Barré : la sélection, sinon tout le texte (fontStyle)', content: <s>S</s> },
];
/** Alignement du texte : nom (lecteur d'écran) et infobulle. */
const ALIGNS: Record<'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom', [string, string]> = {
  left: ['À gauche', 'À gauche : lignes calées à gauche (align=left)'],
  center: ['Centré', 'Centré : lignes centrées (align=center)'],
  right: ['À droite', 'À droite : lignes calées à droite (align=right)'],
  top: ['En haut', 'En haut : texte calé en haut (verticalAlign=top)'],
  middle: ['Au milieu', 'Au milieu : texte centré en hauteur (verticalAlign=middle)'],
  bottom: ['En bas', 'En bas : texte calé en bas (verticalAlign=bottom)'],
};

/**
 * Format du texte en cours d'édition (panneau latéral). Avec une partie du texte sélectionnée : gras,
 * italique, souligné, barré, taille, couleur et styles de texte s'appliquent à la sélection ; sans
 * sélection, à tout le texte. Les boutons ne prennent pas le focus : la saisie continue.
 */
export function TextFormatSections({ edit }: { edit: TextEdit }) {
  const { style, selection, canFormat, onEdge, fittedSize, presets, onAction, onOwner, comment } = edit;
  const { hover, tooltip } = useTooltip();
  // « Ajuster » : texte d'une forme seulement ; la taille réglée devient la taille maximale. « Remplir » (post-it,
  // sujet 411) : imposé par la forme, ni réglage de taille ni bouton.
  const fitMode = fitTextMode(style);
  const canFit = canFormat && !onEdge && !comment && fitMode !== 'fill';
  const fit = canFormat && !onEdge && !comment && fitMode !== 'off';
  const whole = {
    ...fontStyleBits(style),
    fontSize: styleNumber(style, 'fontSize', DEFAULT_SIZE) || DEFAULT_SIZE,
    color: isHexColor(style.fontColor) ? style.fontColor.toLowerCase() : '#000000',
    fontFamily: style.fontFamily,
  };
  const current = selection ?? whole;
  const enabled = canFormat || selection !== undefined;
  const setSize = (next: number) => {
    if (!Number.isFinite(next)) return;
    onAction({ type: 'size', size: Math.round(Math.min(SIZE_LIMITS.max, Math.max(SIZE_LIMITS.min, next))) });
  };
  const align = style.align === 'left' || style.align === 'right' ? style.align : 'center';
  const vertical = style.verticalAlign === 'top' || style.verticalAlign === 'bottom' ? style.verticalAlign : 'middle';
  // Police de la sélection : la police calculée de l'éditeur (« Roboto ») vaut la police par défaut.
  const family = selection ? (isMonospace(current.fontFamily) ? current.fontFamily : undefined) : whole.fontFamily;

  return (
    <>
      {onOwner && (
        <button
          type="button"
          className="link-button format-owner"
          data-tip={`Valider le ${comment ? 'commentaire' : 'texte'} et revenir au panneau de la ${onEdge ? 'flèche' : 'forme'}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onOwner}
        >
          ← {onEdge ? 'Flèche' : 'Forme'}
        </button>
      )}
      <p className="panel-hint format-target">
        {selection
          ? 'Appliqué à la sélection.'
          : `Appliqué à tout le ${comment ? 'commentaire' : 'texte'} (sélectionnez une partie pour la formater).`}
      </p>
      <Section title="Style">
        <fieldset className="text-format" disabled={!enabled}>
          <div className="text-presets">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="style-swatch text-preset"
                data-tip={`${preset.name} : ${preset.fontSize} px${preset.fontFamily ? `, ${preset.fontFamily}` : ''}`}
                aria-label={`Style de texte ${preset.name}`}
                aria-pressed={matchesTextPreset(
                  { fontSize: current.fontSize, fontColor: current.color, fontFamily: family },
                  preset,
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onAction({ type: 'preset', preset })}
              >
                <span
                  style={{
                    color: preset.fontColor ?? '#000000',
                    fontSize: Math.min(Math.max(preset.fontSize, 9), 12),
                    fontFamily: preset.fontFamily ? "'Roboto Mono', monospace" : undefined,
                  }}
                >
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      </Section>
      <Section title="Police">
        <fieldset className="text-format" disabled={!enabled}>
          <div className="field-row">
            Style
            <span className="button-group">
              {MARKS.map(({ mark, label, tip, content }) => (
                <FormatButton
                  key={mark}
                  label={label}
                  tip={tip}
                  pressed={current[mark]}
                  onClick={() => onAction({ type: 'toggle', mark })}
                >
                  {content}
                </FormatButton>
              ))}
            </span>
          </div>
          <div className="field-row">
            Taille
            <span className="button-group">
              {fit ? (
                <span
                  className="size-fitted"
                  data-tip={
                    fitMode === 'fill'
                      ? 'Taille qui remplit la forme (6 au minimum, puis « … ») : imposée par la forme'
                      : 'Taille ajustée à la forme (au plus la taille réglée)'
                  }
                >
                  {formatSize(fittedSize ?? whole.fontSize)}
                </span>
              ) : (
                <>
                  <FormatButton
                    label="Plus petit"
                    tip="Plus petit : taille − 1 (fontSize)"
                    onClick={() => setSize(current.fontSize - 1)}
                  >
                    −
                  </FormatButton>
                  <input
                    key={current.fontSize}
                    type="number"
                    className="size-input"
                    aria-label="Taille du texte"
                    min={SIZE_LIMITS.min}
                    max={SIZE_LIMITS.max}
                    defaultValue={current.fontSize}
                    onBlur={(event) => {
                      if (Number(event.target.value) !== current.fontSize) setSize(Number(event.target.value));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') setSize(Number(event.currentTarget.value));
                    }}
                  />
                  <FormatButton
                    label="Plus grand"
                    tip="Plus grand : taille + 1 (fontSize)"
                    onClick={() => setSize(current.fontSize + 1)}
                  >
                    +
                  </FormatButton>
                </>
              )}
              {canFit && (
                <FormatButton
                  label="Ajuster"
                  tip="Ajuster : réduire le texte pour qu’il tienne dans la forme, la taille réglée devient un maximum (fitText=1)"
                  pressed={fit}
                  onClick={() => onAction({ type: 'fit', on: !fit })}
                >
                  Ajuster
                </FormatButton>
              )}
            </span>
          </div>
          <div className="field-row color-row">
            Couleur
            <ColorInput
              key={current.color}
              value={current.color}
              onChange={(color) => onAction({ type: 'color', color })}
            />
          </div>
          <div className="text-colors">
            {TEXT_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className="text-color"
                style={{ background: swatch }}
                aria-label={`Couleur ${swatch}`}
                {...hover(`Couleur ${swatch} : la sélection, sinon tout le texte (fontColor)`)}
                aria-pressed={swatch === current.color}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onAction({ type: 'color', color: swatch === '#000000' ? undefined : swatch })}
              />
            ))}
          </div>
        </fieldset>
      </Section>
      {!comment && (
        <Section title="Alignement">
          <fieldset className="text-format" disabled={!canFormat}>
            <div className="field-row">
              Horizontal
              <span className="button-group">
                {(['left', 'center', 'right'] as const).map((value) => (
                  <FormatButton
                    key={value}
                    label={ALIGNS[value][0]}
                    tip={ALIGNS[value][1]}
                    pressed={align === value}
                    onClick={() => onAction({ type: 'align', key: 'align', value })}
                  >
                    <AlignIcon kind={value} />
                  </FormatButton>
                ))}
              </span>
            </div>
            {
              <div className="field-row">
                Vertical
                <span className="button-group">
                  {(['top', 'middle', 'bottom'] as const).map((value) => (
                    <FormatButton
                      key={value}
                      label={ALIGNS[value][0]}
                      tip={ALIGNS[value][1]}
                      pressed={vertical === value}
                      onClick={() => onAction({ type: 'align', key: 'verticalAlign', value })}
                    >
                      <AlignIcon kind={value} />
                    </FormatButton>
                  ))}
                </span>
              </div>
            }
            {/* Texte d'une forme : dans la forme ou autour (comme le menu « Position » de draw.io). */}
            {canFit && (
              <LabelPlaceGrid current={labelPlaceOf(style)} onPlace={(place) => onAction({ type: 'place', place })} />
            )}
          </fieldset>
        </Section>
      )}
      <p className="panel-hint">
        {canFormat
          ? 'Ctrl+Entrée ou clic ailleurs : valider · Échap : annuler.'
          : 'Sélectionnez une partie du texte pour la formater ; le format de tout le texte sera disponible une fois ce texte créé.'}
      </p>
      {tooltip}
    </>
  );
}

/** Taille affichée : entière, ou au dixième. */
function formatSize(size: number): string {
  return String(Math.round(size * 10) / 10);
}

/** Clés de style de tout le texte pour une action, et mises en forme partielles qu'elle remplace. */
export function wholeTextChange(
  action: Exclude<TextAction, { type: 'align' } | { type: 'place' } | { type: 'fit' }>,
  style: Record<string, string>,
): {
  patch: Record<string, string | undefined>;
  clear: Array<'bold' | 'italic' | 'underline' | 'strike' | 'fontSize' | 'color' | 'fontFamily'>;
} {
  switch (action.type) {
    case 'toggle': {
      const marks = fontStyleBits(style);
      const value = fontStyleValue({ ...marks, [action.mark]: !marks[action.mark] });
      return { patch: { fontStyle: value === 0 ? undefined : String(value) }, clear: [action.mark] };
    }
    case 'size':
      return {
        patch: { fontSize: action.size === DEFAULT_SIZE ? undefined : String(action.size) },
        clear: ['fontSize'],
      };
    case 'color':
      return { patch: { fontColor: action.color }, clear: ['color'] };
    case 'preset':
      return {
        patch: {
          fontSize: String(action.preset.fontSize),
          fontColor: action.preset.fontColor,
          fontFamily: action.preset.fontFamily,
        },
        clear: ['fontSize', 'color', 'fontFamily'],
      };
  }
}

/** Bouton de format : ne prend pas le focus (la saisie et la sélection restent dans le texte). */
/** Petite forme au centre de chaque case, et trait du texte à sa place (dedans ou autour). */
const PLACE_X = { left: [1, 4], center: [6, 10], right: [12, 15] } as const;
const PLACE_Y = { top: 2, middle: 8, bottom: 14 } as const;

/** Position du texte : grille 3 × 3, au milieu dans la forme ou collé à un côté ou un coin. */
function LabelPlaceGrid({ current, onPlace }: { current: LabelPlace; onPlace: (place: LabelPlace) => void }) {
  const { hover, tooltip } = useTooltip();
  return (
    <div className="field-row">
      Position
      <span className="label-place-grid" role="radiogroup" aria-label="Position du texte">
        {LABEL_PLACES.map((place) => {
          const [x1, x2] = PLACE_X[place.horizontal];
          const y = PLACE_Y[place.vertical];
          const name = labelPlaceName(place);
          const checked = place.horizontal === current.horizontal && place.vertical === current.vertical;
          return (
            <button
              key={`${place.vertical}-${place.horizontal}`}
              type="button"
              role="radio"
              className="group-button format-button"
              aria-checked={checked}
              aria-label={name}
              {...hover(placeTip(place))}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (!checked) onPlace(place);
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <rect x="5" y="5" width="6" height="6" className="label-place-shape" />
                <path d={`M${x1} ${y}H${x2}`} className="label-place-text" />
              </svg>
            </button>
          );
        })}
      </span>
      {tooltip}
    </div>
  );
}

/** Infobulle d'une position du texte : où il va, et les clés draw.io écrites (`labelPlacePatch`). */
function placeTip(place: LabelPlace): string {
  const name = labelPlaceName(place);
  if (place.horizontal === 'center' && place.vertical === 'middle') {
    return `${name} : texte dans la forme (labelPosition, verticalLabelPosition, align et verticalAlign retirés)`;
  }
  const keys = Object.entries(labelPlacePatch(place))
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
  return `${name} : texte hors de la forme, collé à ce côté (${keys})`;
}

/** `label` : nom du bouton (lecteur d'écran) ; `tip` : ce qu'il fait, au survol. */
function FormatButton({
  label,
  tip,
  pressed,
  onClick,
  children,
}: {
  label: string;
  tip: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const { hover, tooltip } = useTooltip();
  return (
    <>
      <button
        type="button"
        className="group-button format-button"
        aria-label={label}
        aria-pressed={pressed}
        {...hover(tip)}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      >
        {children}
      </button>
      {tooltip}
    </>
  );
}

/** Sélecteur de couleur : appliqué à la fermeture du sélecteur (événement natif `change`). */
function ColorInput({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const listener = () => onChangeRef.current(input.value.toLowerCase());
    input.addEventListener('change', listener);
    return () => input.removeEventListener('change', listener);
  }, []);
  return <input ref={ref} type="color" aria-label="Couleur du texte" defaultValue={value} />;
}

function AlignIcon({ kind }: { kind: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' }) {
  const lines: Record<typeof kind, string> = {
    left: 'M2 3.5h12M2 6.5h8M2 9.5h12M2 12.5h8',
    center: 'M2 3.5h12M4 6.5h8M2 9.5h12M4 12.5h8',
    right: 'M2 3.5h12M6 6.5h8M2 9.5h12M6 12.5h8',
    top: 'M2 2.5h12M5 5.5h6M5 8h6',
    middle: 'M2 8h12M5 5h6M5 11h6',
    bottom: 'M2 13.5h12M5 8h6M5 10.5h6',
  };
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={lines[kind]} />
    </svg>
  );
}
