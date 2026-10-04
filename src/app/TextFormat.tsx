import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { LABEL_PLACES, labelPlaceName, labelPlaceOf } from '../engine/edit/labelPosition';
import type { LabelPlace } from '../engine/edit/labelPosition';
import { matchesTextPreset } from '../engine/edit/styles';
import type { TextPreset } from '../engine/edit/styles';
import { isMonospace } from '../engine/format/richText';
import type { SelectionFormat, ToggleMark } from './LabelEditor';
import { Section } from './PanelSection';

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
}

const DEFAULT_SIZE = 11;
export const SIZE_LIMITS = { min: 4, max: 128 };
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
const MARKS: Array<{ mark: ToggleMark; label: string; content: ReactNode }> = [
  { mark: 'bold', label: 'Gras (Ctrl+B)', content: <strong>B</strong> },
  { mark: 'italic', label: 'Italique (Ctrl+I)', content: <em>I</em> },
  { mark: 'underline', label: 'Souligné (Ctrl+U)', content: <u>U</u> },
  { mark: 'strike', label: 'Barré', content: <s>S</s> },
];
const BITS: Record<ToggleMark, number> = { bold: 1, italic: 2, underline: 4, strike: 8 };

/**
 * Format du texte en cours d'édition (panneau latéral). Avec une partie du texte sélectionnée : gras,
 * italique, souligné, barré, taille, couleur et styles de texte s'appliquent à la sélection ; sans
 * sélection, à tout le texte. Les boutons ne prennent pas le focus : la saisie continue.
 */
export function TextFormatSections({ edit }: { edit: TextEdit }) {
  const { style, selection, canFormat, onEdge, fittedSize, presets, onAction } = edit;
  // « Ajuster » : texte d'une forme seulement ; la taille réglée devient la taille maximale.
  const canFit = canFormat && !onEdge;
  const fit = canFit && style.fitText === '1';
  const bits = Number(style.fontStyle) || 0;
  const whole = {
    bold: (bits & 1) !== 0,
    italic: (bits & 2) !== 0,
    underline: (bits & 4) !== 0,
    strike: (bits & 8) !== 0,
    fontSize: Number(style.fontSize) || DEFAULT_SIZE,
    color: /^#[0-9a-f]{6}$/i.test(style.fontColor ?? '') ? style.fontColor!.toLowerCase() : '#000000',
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
      <p className="panel-hint format-target">
        {selection
          ? 'Appliqué à la sélection.'
          : 'Appliqué à tout le texte (sélectionnez une partie pour la formater).'}
      </p>
      <Section title="Style">
        <fieldset className="text-format" disabled={!enabled}>
          <div className="text-presets">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="style-swatch text-preset"
                title={`${preset.name} : ${preset.fontSize} px${preset.fontFamily ? `, ${preset.fontFamily}` : ''}`}
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
              {MARKS.map(({ mark, label, content }) => (
                <FormatButton
                  key={mark}
                  label={label}
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
                <span className="size-fitted" title="Taille ajustée à la forme (au plus la taille réglée)">
                  {formatSize(fittedSize ?? whole.fontSize)}
                </span>
              ) : (
                <>
                  <FormatButton label="Plus petit" onClick={() => setSize(current.fontSize - 1)}>
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
                  <FormatButton label="Plus grand" onClick={() => setSize(current.fontSize + 1)}>
                    +
                  </FormatButton>
                </>
              )}
              {canFit && (
                <FormatButton
                  label="Ajuster : réduire le texte pour qu’il tienne dans la forme"
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
                title={swatch}
                aria-label={`Couleur ${swatch}`}
                aria-pressed={swatch === current.color}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onAction({ type: 'color', color: swatch === '#000000' ? undefined : swatch })}
              />
            ))}
          </div>
        </fieldset>
      </Section>
      <Section title="Alignement">
        <fieldset className="text-format" disabled={!canFormat}>
          <div className="field-row">
            Horizontal
            <span className="button-group">
              {(['left', 'center', 'right'] as const).map((value) => (
                <FormatButton
                  key={value}
                  label={{ left: 'À gauche', center: 'Centré', right: 'À droite' }[value]}
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
                    label={{ top: 'En haut', middle: 'Au milieu', bottom: 'En bas' }[value]}
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
      <p className="panel-hint">
        {canFormat
          ? 'Ctrl+Entrée ou clic ailleurs : valider · Échap : annuler.'
          : 'Sélectionnez une partie du texte pour la formater ; le format de tout le texte sera disponible une fois ce texte créé.'}
      </p>
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
      const bits = (Number(style.fontStyle) || 0) ^ BITS[action.mark];
      return { patch: { fontStyle: bits === 0 ? undefined : String(bits) }, clear: [action.mark] };
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
              title={name}
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
    </div>
  );
}

function FormatButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="group-button format-button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
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
