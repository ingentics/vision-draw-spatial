import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { fontStyleValue } from './LabelEditor';
import { Section } from './PanelSection';

/** Texte en cours d'édition en place, vu par le panneau de format. */
export interface TextEdit {
  /** Style draw.io de la cellule du texte. */
  style: Record<string, string>;
  /** Faux tant que le texte n'existe pas (début / fin d'une flèche à créer) : rien à formater. */
  canFormat: boolean;
  /** Texte d'une flèche : pas d'alignement vertical (centré sur le tracé). */
  onEdge: boolean;
  /** Écrit des clés de style (undefined = retirée), une étape d'annulation. */
  onFormat: (patch: Record<string, string | undefined>) => void;
}

const DEFAULT_SIZE = 11;
const SIZE_LIMITS = { min: 4, max: 128 };
/** Couleurs de texte rapides : noir, gris, blanc, puis les contours des styles draw.io. */
const TEXT_COLORS = [
  '#000000',
  '#333333',
  '#666666',
  '#ffffff',
  '#6c8ebf',
  '#82b366',
  '#d79b00',
  '#b85450',
  '#9673a6',
  '#1a73e8',
];

/**
 * Format du texte en cours d'édition (panneau latéral) : gras, italique, taille, couleur, alignement.
 * S'applique tout de suite à tout le texte (clés du style draw.io de la cellule), l'édition continue :
 * les boutons ne prennent pas le focus.
 */
export function TextFormatSections({ edit }: { edit: TextEdit }) {
  const { style, canFormat, onEdge, onFormat } = edit;
  const bits = Number(style.fontStyle) || 0;
  const size = Number(style.fontSize) || DEFAULT_SIZE;
  const color = /^#[0-9a-f]{6}$/i.test(style.fontColor ?? '') ? style.fontColor!.toLowerCase() : '#000000';
  const setSize = (next: number) => {
    if (!Number.isFinite(next)) return;
    const value = Math.round(Math.min(SIZE_LIMITS.max, Math.max(SIZE_LIMITS.min, next)));
    onFormat({ fontSize: value === DEFAULT_SIZE ? undefined : String(value) });
  };
  const align = style.align === 'left' || style.align === 'right' ? style.align : 'center';
  const vertical = style.verticalAlign === 'top' || style.verticalAlign === 'bottom' ? style.verticalAlign : 'middle';

  return (
    <>
      <Section title="Police">
        <fieldset className="text-format" disabled={!canFormat}>
          <div className="field-row">
            Style
            <span className="button-group">
              <FormatButton
                label="Gras (Ctrl+B)"
                pressed={(bits & 1) !== 0}
                onClick={() => onFormat({ fontStyle: fontStyleValue(bits ^ 1) })}
              >
                <strong>B</strong>
              </FormatButton>
              <FormatButton
                label="Italique (Ctrl+I)"
                pressed={(bits & 2) !== 0}
                onClick={() => onFormat({ fontStyle: fontStyleValue(bits ^ 2) })}
              >
                <em>I</em>
              </FormatButton>
            </span>
          </div>
          <div className="field-row">
            Taille
            <span className="button-group">
              <FormatButton label="Plus petit" onClick={() => setSize(size - 1)}>
                −
              </FormatButton>
              <input
                key={size}
                type="number"
                className="size-input"
                aria-label="Taille du texte"
                min={SIZE_LIMITS.min}
                max={SIZE_LIMITS.max}
                defaultValue={size}
                onBlur={(event) => setSize(Number(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setSize(Number(event.currentTarget.value));
                }}
              />
              <FormatButton label="Plus grand" onClick={() => setSize(size + 1)}>
                +
              </FormatButton>
            </span>
          </div>
          <div className="field-row color-row">
            Couleur
            <ColorInput key={color} value={color} onChange={(next) => onFormat({ fontColor: next })} />
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
                aria-pressed={swatch === color}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onFormat({ fontColor: swatch === '#000000' ? undefined : swatch })}
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
                  onClick={() => onFormat({ align: value })}
                >
                  <AlignIcon kind={value} />
                </FormatButton>
              ))}
            </span>
          </div>
          {!onEdge && (
            <div className="field-row">
              Vertical
              <span className="button-group">
                {(['top', 'middle', 'bottom'] as const).map((value) => (
                  <FormatButton
                    key={value}
                    label={{ top: 'En haut', middle: 'Au milieu', bottom: 'En bas' }[value]}
                    pressed={vertical === value}
                    onClick={() => onFormat({ verticalAlign: value })}
                  >
                    <AlignIcon kind={value} />
                  </FormatButton>
                ))}
              </span>
            </div>
          )}
        </fieldset>
      </Section>
      <p className="panel-hint">
        {canFormat
          ? 'Ctrl+Entrée ou clic ailleurs : valider · Échap : annuler.'
          : 'Le format sera disponible une fois ce texte créé (Ctrl+Entrée pour valider).'}
      </p>
    </>
  );
}

/** Bouton de format : ne prend pas le focus (la saisie continue dans le texte). */
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
