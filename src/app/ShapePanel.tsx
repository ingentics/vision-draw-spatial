import { matchesPreset } from '../engine/edit/styles';
import type { StylePreset } from '../engine/edit/styles';
import type { ShapeModel } from '../engine/model/types';
import type { StyleSettings } from '../engine/settings';

interface ShapePanelProps {
  /** Formes sélectionnées ; la dernière choisie sert d'aperçu et de style courant. */
  shapes: ShapeModel[];
  styles: StyleSettings;
  onApplyStyle: (preset: StylePreset) => void;
  onClose: () => void;
}

/**
 * Panneau « Forme » (comme le panneau Format de draw.io) : réglages de la forme sélectionnée,
 * appliqués à toutes les formes de la sélection. Première section : les styles (fond, contour).
 */
export function ShapePanel({ shapes, styles, onApplyStyle, onClose }: ShapePanelProps) {
  const current = shapes[shapes.length - 1];
  if (!current) return null;
  const known = [...styles.base, ...styles.extended];
  return (
    <aside className="side-panel shape-panel" aria-label="Forme">
      <header className="side-panel-header">
        <h2>{shapes.length > 1 ? `${shapes.length} formes` : 'Forme'}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </header>
      <div className="side-panel-body">
        <section className="shape-section">
          <h3>Style</h3>
          <StyleGrid presets={styles.base} shape={current} onApply={onApplyStyle} />
          <StyleGrid presets={styles.extended} shape={current} onApply={onApplyStyle} />
          {known.every((preset) => !matchesPreset(current.style, preset)) && (
            <p className="shape-hint">Style actuel : couleurs personnalisées.</p>
          )}
        </section>
      </div>
    </aside>
  );
}

function StyleGrid({
  presets,
  shape,
  onApply,
}: {
  presets: StylePreset[];
  shape: ShapeModel;
  onApply: (preset: StylePreset) => void;
}) {
  return (
    <div className="style-grid">
      {presets.map((preset) => {
        const active = matchesPreset(shape.style, preset);
        return (
          <button
            key={`${preset.name}:${preset.fillColor}`}
            type="button"
            className="style-swatch"
            aria-pressed={active}
            title={preset.name}
            aria-label={`Style ${preset.name}`}
            onClick={() => onApply(preset)}
          >
            <StylePreview shape={shape} preset={preset} />
          </button>
        );
      })}
    </div>
  );
}

/** Aperçu de la forme sélectionnée (rectangle, arrondi, ellipse, cylindre…) avec ce style. */
function StylePreview({ shape, preset }: { shape: ShapeModel; preset: StylePreset }) {
  const paint = { fill: preset.fillColor, stroke: preset.strokeColor };
  const text = preset.fontColor ?? '#000000';
  const kind = shape.kind;
  let body;
  if (kind === 'ellipse') body = <ellipse cx="20" cy="14" rx="15" ry="10" {...paint} />;
  else if (kind === 'cylinder3' && shape.style.direction === 'south')
    body = <path d="M10 6h20a3 8 0 0 1 0 16H10a3 8 0 0 1 0-16zM30 6a3 8 0 0 0 0 16" {...paint} />;
  else if (kind === 'cylinder3' || kind === 'cylinder' || kind === 'datastore')
    body = <path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0" {...paint} />;
  else body = <rect x="5" y="5" width="30" height="18" rx={shape.style.rounded === '1' ? 4 : 0} {...paint} />;
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true">
      {body}
      <text x="20" y="17.5" textAnchor="middle" fill={text}>
        Aa
      </text>
    </svg>
  );
}
