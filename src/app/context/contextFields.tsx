import { matchesPreset } from '../../engine';
import type { LinkModel, PageModel, ShapeModel, StylePreset } from '../../engine';
import { useEnginePlugins } from '../pluginsContext';

/** Champs communs aux sections du panneau contextuel : texte, lien, suppression, styles. */

export function LabelRow({ label, name = 'Texte', onEdit }: { label: string; name?: string; onEdit: () => void }) {
  return (
    <div className="field-row">
      {name}
      <span className="field-value label-value" data-tip={label}>
        {label || 'aucun'}
      </span>
      <button
        type="button"
        className="button"
        data-tip="Modifier le texte dans le plan (F2, ou double-clic)"
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
export function LinkField({
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

export function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button type="button" className="button danger-button" data-tip="Supprimer (Suppr)" onClick={onDelete}>
      Supprimer
    </button>
  );
}

export function StyleGrid({
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
          data-tip={preset.name}
          aria-label={`Style ${preset.name}`}
          onClick={() => onApply(preset)}
        >
          <StylePreview shape={shape} preset={preset} />
        </button>
      ))}
    </div>
  );
}

/** Aperçu de la forme sélectionnée avec ce style : le dessin déclaré par sa forme, aux couleurs du style. */
function StylePreview({ shape, preset }: { shape: ShapeModel; preset: StylePreset }) {
  const plugins = useEnginePlugins();
  const text = preset.fontColor ?? '#000000';
  return (
    <svg viewBox="0 0 40 28" aria-hidden="true">
      <g
        fill={preset.fillColor}
        stroke={preset.strokeColor}
        dangerouslySetInnerHTML={{ __html: plugins.shapes.swatch(shape) }}
      />
      <text x="20" y="17.5" textAnchor="middle" fill={text}>
        Aa
      </text>
    </svg>
  );
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}
