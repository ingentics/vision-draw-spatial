import { endLabelOf } from '../engine/edit/edgeLabels';
import type { EdgeEnd } from '../engine/edit/edgeLabels';
import { matchesPreset } from '../engine/edit/styles';
import type { StylePreset } from '../engine/edit/styles';
import type { EdgeModel, LinkModel, PageModel, ShapeModel } from '../engine/model/types';
import type { StyleSettings } from '../engine/settings';
import { SPATIAL, spatialNumber } from '../engine/spatial';
import { Section } from './PanelSection';

export interface ContextPanelProps {
  page: PageModel;
  /** Toutes les pages, pour les liens. */
  pages: PageModel[];
  /** Formes et flèches sélectionnées sur la page (vides : panneau de la page). */
  shapes: ShapeModel[];
  edges: EdgeModel[];
  styles: StyleSettings;
  /** Épaisseur par défaut des volumes (réglage), affichée quand la forme n'a pas la sienne. */
  defaultDepth: number;
  /** Libellé de la touche de sélection multiple (ex. « Ctrl »), pour l'aide. */
  multiSelectKey: string;
  onApplyStyle: (preset: StylePreset) => void;
  /** Renommer la page ; absent si les pages ne sont pas modifiables. */
  onRenamePage?: (name: string) => void;
  /** Lien de l'élément sélectionné (vers une page ou une URL) ; undefined = retiré. */
  onLink: (link: LinkModel | undefined) => void;
  /** Attribut spatial de la forme sélectionnée (épaisseur, élévation) ; undefined = valeur par défaut. */
  onSpatial: (key: string, value: number | undefined) => void;
  /** Édition du texte (du milieu, pour une flèche) dans le plan. */
  onEditLabel: () => void;
  /** Texte de début ou de fin d'une flèche (vide = retiré). */
  onEndLabel: (end: EdgeEnd, text: string) => void;
  onDelete: () => void;
}

/**
 * Panneau contextuel à droite, comme le panneau Format de draw.io : toujours ouvert sur une page,
 * il montre la forme sélectionnée, sinon la flèche, sinon la page, avec tous leurs réglages (styles,
 * texte, volume, lien, suppression). Les paramètres et les diagnostics prennent sa place le temps
 * d'être ouverts.
 */
export function ContextPanel(props: ContextPanelProps) {
  const { shapes, edges } = props;
  const count = shapes.length + edges.length;
  let title: string;
  let body;
  if (count === 0) {
    title = 'Page';
    body = <PageSections page={props.page} onRename={props.onRenamePage} />;
  } else if (count > 1) {
    title = edges.length === 0 ? `${count} formes` : shapes.length === 0 ? `${count} flèches` : `${count} éléments`;
    body = <MultiSections {...props} />;
  } else if (shapes.length === 1) {
    title = 'Forme';
    body = <ShapeSections {...props} shape={shapes[0]!} />;
  } else {
    title = 'Flèche';
    body = <EdgeSections {...props} edge={edges[0]!} />;
  }
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
      <TextField
        key={`name:${page.id}:${page.name}`}
        label="Nom"
        title={onRename ? 'Nom de la page (Entrée pour valider)' : 'Nom de la page'}
        value={page.name}
        readOnly={!onRename}
        onCommit={(name) => {
          if (name.trim()) onRename?.(name.trim());
        }}
      />
      <div className="field-row">
        Contenu
        <span className="field-value">
          {plural(page.shapes.length, 'forme')}, {plural(page.edges.length, 'flèche')}
        </span>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Forme

function ShapeSections({ shape, ...props }: ContextPanelProps & { shape: ShapeModel }) {
  const known = [...props.styles.base, ...props.styles.extended];
  return (
    <>
      <Section title="Texte">
        <LabelRow label={shape.label} onEdit={props.onEditLabel} />
      </Section>
      <Section title="Style">
        <StyleGrid presets={props.styles.base} shape={shape} onApply={props.onApplyStyle} />
        <StyleGrid presets={props.styles.extended} shape={shape} onApply={props.onApplyStyle} />
        {known.every((preset) => !matchesPreset(shape.style, preset)) && (
          <p className="panel-hint">Style actuel : couleurs personnalisées.</p>
        )}
      </Section>
      <Section title="Volume">
        <NumberField
          key={`h:${shape.id}:${spatialNumber(shape, SPATIAL.height) ?? ''}`}
          label="Épaisseur"
          title="Épaisseur du volume en vue iso (spatial.height) ; vide = réglage par défaut"
          value={spatialNumber(shape, SPATIAL.height)}
          placeholder={String(props.defaultDepth)}
          onCommit={(value) => props.onSpatial(SPATIAL.height, value)}
        />
        <NumberField
          key={`e:${shape.id}:${spatialNumber(shape, SPATIAL.elevation) ?? ''}`}
          label="Élévation"
          title="Hauteur au-dessus du sol ou du conteneur en vue iso (spatial.elevation)"
          value={spatialNumber(shape, SPATIAL.elevation)}
          placeholder="0"
          onCommit={(value) => props.onSpatial(SPATIAL.elevation, value)}
        />
      </Section>
      <Section title="Lien">
        <LinkField link={shape.link} pageId={props.page.id} pages={props.pages} onLink={props.onLink} />
      </Section>
      <DeleteButton onDelete={props.onDelete} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Flèche

function EdgeSections({ edge, ...props }: ContextPanelProps & { edge: EdgeModel }) {
  const end = (id: string | undefined) => {
    const shape = id ? props.page.shapes.find((s) => s.id === id) : undefined;
    if (!shape) return 'point libre';
    return shape.label ? `« ${shape.label} »` : 'forme sans texte';
  };
  return (
    <>
      <Section title="Texte">
        <LabelRow label={edge.label} name="Milieu" onEdit={props.onEditLabel} />
        {(['start', 'end'] as const).map((which) => {
          const current = endLabelOf(edge, which)?.label ?? '';
          return (
            <TextField
              key={`${which}:${edge.id}:${current}`}
              label={which === 'start' ? 'Début' : 'Fin'}
              title={
                which === 'start'
                  ? 'Texte près du début de la flèche (côté source) ; vide = aucun'
                  : 'Texte près de la fin de la flèche (côté pointe) ; vide = aucun'
              }
              value={current}
              placeholder="aucun"
              onCommit={(text) => props.onEndLabel(which, text)}
            />
          );
        })}
      </Section>
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
      <Section title="Lien">
        <LinkField link={edge.link} pageId={props.page.id} pages={props.pages} onLink={props.onLink} />
      </Section>
      <DeleteButton onDelete={props.onDelete} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Sélection multiple

function MultiSections(props: ContextPanelProps) {
  const { shapes, edges } = props;
  // La dernière forme choisie sert d'aperçu et de style courant.
  const current = shapes[shapes.length - 1];
  return (
    <>
      <Section title="Sélection">
        <div className="field-row">
          Contenu
          <span className="field-value">
            {[shapes.length > 0 && plural(shapes.length, 'forme'), edges.length > 0 && plural(edges.length, 'flèche')]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>
        <p className="panel-hint">{props.multiSelectKey} + clic : ajouter ou retirer un élément.</p>
      </Section>
      {current && (
        <Section title="Style">
          <StyleGrid presets={props.styles.base} shape={current} onApply={props.onApplyStyle} />
          <StyleGrid presets={props.styles.extended} shape={current} onApply={props.onApplyStyle} />
          {edges.length > 0 && <p className="panel-hint">Appliqué aux formes de la sélection.</p>}
        </Section>
      )}
      <DeleteButton onDelete={props.onDelete} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Champs

function LabelRow({ label, name = 'Texte', onEdit }: { label: string; name?: string; onEdit: () => void }) {
  return (
    <div className="field-row">
      {name}
      <span className="field-value label-value" title={label}>
        {label || 'aucun'}
      </span>
      <button
        type="button"
        className="button"
        title="Modifier le texte dans le plan (F2, ou double-clic)"
        onClick={onEdit}
      >
        Modifier
      </button>
    </div>
  );
}

const NONE = '';
const URL_OPTION = '__url__';

/** Lien vers une autre page ou une URL (SPEC §14.1). */
function LinkField({
  link,
  pageId,
  pages,
  onLink,
}: {
  link: LinkModel | undefined;
  pageId: string;
  pages: PageModel[];
  onLink: (link: LinkModel | undefined) => void;
}) {
  const value = link?.type === 'page' ? `page:${link.pageId}` : link?.type === 'url' ? URL_OPTION : NONE;
  return (
    <label className="field-row">
      Vers
      <select
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (next === NONE) onLink(undefined);
          else if (next === URL_OPTION) {
            const href = window.prompt('Adresse du lien (https://…, mailto:…)', link?.type === 'url' ? link.href : '');
            if (href?.trim()) onLink({ type: 'url', href: href.trim() });
          } else onLink({ type: 'page', pageId: next.slice('page:'.length) });
        }}
      >
        <option value={NONE}>Aucun</option>
        {pages
          .filter((page) => page.id !== pageId)
          .map((page) => (
            <option key={page.id} value={`page:${page.id}`}>
              → {page.name}
            </option>
          ))}
        <option value={URL_OPTION}>{link?.type === 'url' ? `URL : ${link.href}` : 'URL…'}</option>
      </select>
    </label>
  );
}

/** Champ texte : validé à Entrée ou en quittant le champ, Échap annule. */
function TextField({
  label,
  title,
  value,
  placeholder,
  readOnly,
  onCommit,
}: {
  label: string;
  title: string;
  value: string;
  placeholder?: string;
  readOnly?: boolean;
  onCommit: (text: string) => void;
}) {
  return (
    <label className="field-row" title={title}>
      {label}
      <input
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onBlur={(event) => {
          if (event.target.value !== value) onCommit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          else if (event.key === 'Escape') {
            event.currentTarget.value = value;
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

/** Champ numérique d'un attribut spatial : validé à Entrée ou en quittant le champ ; vide = défaut. */
function NumberField({
  label,
  title,
  value,
  placeholder,
  onCommit,
}: {
  label: string;
  title: string;
  value: number | undefined;
  placeholder: string;
  onCommit: (value: number | undefined) => void;
}) {
  const commit = (text: string) => {
    const trimmed = text.trim();
    const next = trimmed === '' ? undefined : Number(trimmed.replace(',', '.'));
    if (next === undefined || (Number.isFinite(next) && next >= 0)) onCommit(next);
  };
  return (
    <label className="field-row" title={title}>
      {label}
      <input
        type="number"
        min={0}
        step={1}
        defaultValue={value ?? ''}
        placeholder={placeholder}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
      />
    </label>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button type="button" className="button danger-button" title="Supprimer (Suppr)" onClick={onDelete}>
      Supprimer
    </button>
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

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}
