import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ShapeModel } from '../engine';
import { Section } from './PanelSection';
import { isHexColor } from '../engine';
import { useTooltip } from './Tooltip';

/** Style du trait : plein, tirets ou pointillés (clés draw.io `dashed`, `dashPattern`). */
type LineStyle = 'solid' | 'dashed' | 'dotted';

const LINE_STYLES: Record<LineStyle, { label: string; tip: string; patch: Record<string, string | undefined> }> = {
  solid: {
    label: 'Plein',
    tip: 'Plein : trait continu (dashed et dashPattern retirés)',
    patch: { dashed: undefined, dashPattern: undefined },
  },
  dashed: {
    label: 'Tirets',
    tip: 'Tirets : trait en tirets (dashed=1)',
    patch: { dashed: '1', dashPattern: undefined },
  },
  dotted: {
    label: 'Pointillés',
    tip: 'Pointillés : trait en points (dashed=1, dashPattern=1 2)',
    patch: { dashed: '1', dashPattern: '1 2' },
  },
};

/** Couleurs de bordure rapides : noir, gris, puis les contours des styles draw.io. */
const STROKE_COLORS = [
  '#000000',
  '#666666',
  '#b3b3b3',
  '#6c8ebf',
  '#82b366',
  '#d79b00',
  '#d6b656',
  '#b85450',
  '#9673a6',
];
const WIDTH_LIMITS = { min: 0.5, max: 20 };

/**
 * Bordure des formes sélectionnées (la dernière choisie donne les valeurs affichées) : le trait 2D, qui
 * est aussi les arêtes du volume en iso / 3D. Couleur (ou aucune), épaisseur, style du trait, puis les réglages
 * propres à la forme ; écrit dans les clés du style draw.io.
 */
export function BorderSection({
  shape,
  onChange,
  children,
}: {
  shape: ShapeModel;
  onChange: (patch: Record<string, string | undefined>) => void;
  /** Réglages de bordure propres à la forme (ex. coins arrondis), déclarés par sa définition. */
  children?: ReactNode;
}) {
  const { style } = shape;
  const none = style.strokeColor === 'none';
  const color = isHexColor(style.strokeColor) ? style.strokeColor.toLowerCase() : '#000000';
  const width = Number(style.strokeWidth) || 1;
  const { hover, tooltip } = useTooltip();
  const line: LineStyle =
    style.dashed !== '1' ? 'solid' : /^1(\s|$)/.test(style.dashPattern ?? '') ? 'dotted' : 'dashed';
  const setWidth = (next: number) => {
    if (!Number.isFinite(next)) return;
    const value = Math.round(Math.min(WIDTH_LIMITS.max, Math.max(WIDTH_LIMITS.min, next)) * 2) / 2;
    onChange({ strokeWidth: value === 1 ? undefined : String(value) });
  };

  return (
    <Section title="Bordure">
      <div className="field-row color-row">
        Couleur
        <ColorInput key={color} value={color} onChange={(next) => onChange({ strokeColor: next })} />
      </div>
      <div className="text-colors">
        <button
          type="button"
          className="text-color no-color"
          aria-label="Aucune bordure"
          {...hover('Aucune bordure : trait non dessiné (strokeColor=none)')}
          aria-pressed={none}
          onClick={() => onChange({ strokeColor: 'none' })}
        />
        {STROKE_COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className="text-color"
            style={{ background: swatch }}
            aria-label={`Bordure ${swatch}`}
            {...hover(`Bordure ${swatch} (strokeColor)`)}
            aria-pressed={!none && swatch === color}
            onClick={() => onChange({ strokeColor: swatch })}
          />
        ))}
      </div>
      <fieldset className="text-format" disabled={none}>
        <div className="field-row">
          Épaisseur
          <span className="button-group">
            <button
              type="button"
              className="group-button format-button"
              aria-label="Plus fine"
              {...hover('Plus fine : épaisseur − 0,5 (strokeWidth)')}
              onClick={() => setWidth(width - 0.5)}
            >
              −
            </button>
            <input
              key={width}
              type="number"
              className="size-input"
              aria-label="Épaisseur de la bordure"
              min={WIDTH_LIMITS.min}
              max={WIDTH_LIMITS.max}
              step={0.5}
              defaultValue={width}
              onBlur={(event) => {
                if (Number(event.target.value) !== width) setWidth(Number(event.target.value));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setWidth(Number(event.currentTarget.value));
              }}
            />
            <button
              type="button"
              className="group-button format-button"
              aria-label="Plus épaisse"
              {...hover('Plus épaisse : épaisseur + 0,5 (strokeWidth)')}
              onClick={() => setWidth(width + 0.5)}
            >
              +
            </button>
          </span>
        </div>
        <div className="field-row">
          Trait
          <span className="button-group" role="radiogroup" aria-label="Style du trait">
            {(Object.keys(LINE_STYLES) as LineStyle[]).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                className="group-button format-button"
                aria-checked={line === value}
                aria-pressed={line === value}
                aria-label={LINE_STYLES[value].label}
                {...hover(LINE_STYLES[value].tip)}
                onClick={() => onChange(LINE_STYLES[value].patch)}
              >
                <LineIcon kind={value} />
              </button>
            ))}
          </span>
        </div>
        {children}
      </fieldset>
      {tooltip}
    </Section>
  );
}

function LineIcon({ kind }: { kind: LineStyle }) {
  const dash = kind === 'solid' ? undefined : kind === 'dashed' ? '4 2.5' : '1.2 2';
  return (
    <svg viewBox="0 0 20 8" aria-hidden="true" className="line-icon">
      <path d="M1 4h18" strokeDasharray={dash} />
    </svg>
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
  return <input ref={ref} type="color" aria-label="Couleur de la bordure" defaultValue={value} />;
}
