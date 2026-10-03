import { matchesPreset } from '../engine/edit/styles';
import type { StylePreset } from '../engine/edit/styles';
import type { EdgeModel, PageModel, ShapeModel } from '../engine/model/types';
import type { StyleSettings } from '../engine/settings';
import { Section } from './PanelSection';

interface ContextPanelProps {
  page: PageModel;
  /** Formes et flèches sélectionnées sur la page (vides : panneau de la page). */
  shapes: ShapeModel[];
  edges: EdgeModel[];
  styles: StyleSettings;
  onApplyStyle: (preset: StylePreset) => void;
  /** Renommer la page ; absent si les pages ne sont pas modifiables. */
  onRenamePage?: (name: string) => void;
}

/**
 * Panneau contextuel à droite, comme le panneau Format de draw.io : toujours ouvert sur une page,
 * il montre la forme sélectionnée, sinon la flèche sélectionnée, sinon la page. Les paramètres et
 * les diagnostics prennent sa place le temps d'être ouverts.
 */
export function ContextPanel({ page, shapes, edges, styles, onApplyStyle, onRenamePage }: ContextPanelProps) {
  const [title, body] =
    shapes.length > 0
      ? [
          shapes.length > 1 ? `${shapes.length} formes` : 'Forme',
          <ShapeSections key="shape" shapes={shapes} styles={styles} onApply={onApplyStyle} />,
        ]
      : edges.length > 0
        ? [
            edges.length > 1 ? `${edges.length} flèches` : 'Flèche',
            <EdgeSections key="edge" page={page} edges={edges} />,
          ]
        : ['Page', <PageSections key="page" page={page} onRename={onRenamePage} />];
  return (
    <aside className="side-panel card-panel context-panel" aria-label={title}>
      <header className="side-panel-header">
        <h2>{title}</h2>
      </header>
      <div className="side-panel-body">{body}</div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Page

function PageSections({ page, onRename }: { page: PageModel; onRename?: (name: string) => void }) {
  return (
    <Section title="Page">
      <label className="field-row">
        Nom
        <input
          key={`${page.id}:${page.name}`}
          type="text"
          defaultValue={page.name}
          readOnly={!onRename}
          onBlur={(event) => {
            const name = event.target.value.trim();
            if (name && name !== page.name) onRename?.(name);
            else event.target.value = page.name;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            else if (event.key === 'Escape') {
              event.currentTarget.value = page.name;
              event.currentTarget.blur();
            }
          }}
        />
      </label>
      <div className="field-row">
        Contenu
        <span className="field-value">
          {count(page.shapes.length, 'forme')}, {count(page.edges.length, 'flèche')}
        </span>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Flèche

function EdgeSections({ page, edges }: { page: PageModel; edges: EdgeModel[] }) {
  const edge = edges[edges.length - 1]!;
  const end = (id: string | undefined) => {
    const shape = id ? page.shapes.find((s) => s.id === id) : undefined;
    if (!shape) return 'point libre';
    return shape.label ? `« ${shape.label} »` : 'forme sans texte';
  };
  return (
    <Section title="Liaison">
      <div className="field-row">
        De
        <span className="field-value">{end(edge.sourceId)}</span>
      </div>
      <div className="field-row">
        Vers
        <span className="field-value">{end(edge.targetId)}</span>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Forme

function ShapeSections({
  shapes,
  styles,
  onApply,
}: {
  shapes: ShapeModel[];
  styles: StyleSettings;
  onApply: (preset: StylePreset) => void;
}) {
  // La dernière forme choisie sert d'aperçu et de style courant.
  const current = shapes[shapes.length - 1]!;
  const known = [...styles.base, ...styles.extended];
  return (
    <Section title="Style">
      <StyleGrid presets={styles.base} shape={current} onApply={onApply} />
      <StyleGrid presets={styles.extended} shape={current} onApply={onApply} />
      {known.every((preset) => !matchesPreset(current.style, preset)) && (
        <p className="panel-hint">Style actuel : couleurs personnalisées.</p>
      )}
    </Section>
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
      {presets.map((preset) => (
        <button
          key={`${preset.name}:${preset.fillColor}`}
          type="button"
          className="style-swatch"
          aria-pressed={matchesPreset(shape.style, preset)}
          title={preset.name}
          aria-label={`Style ${preset.name}`}
          onClick={() => onApply(preset)}
        >
          <StylePreview shape={shape} preset={preset} />
        </button>
      ))}
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

function count(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}
