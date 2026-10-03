import type { Selection } from '../engine/Engine';
import { endLabelOf } from '../engine/edit/edgeLabels';
import type { EdgeEnd } from '../engine/edit/edgeLabels';
import type { EdgeModel, LinkModel, PageModel } from '../engine/model/types';
import { SPATIAL, spatialNumber } from '../engine/spatial';

interface SelectionBarProps {
  selection: Selection;
  pages: PageModel[];
  onLink: (link: LinkModel | undefined) => void;
  /** Attribut spatial d'une forme (épaisseur, élévation) ; undefined = valeur par défaut. */
  onSpatial: (key: string, value: number | undefined) => void;
  /** Épaisseur par défaut des volumes (réglage), affichée quand la forme n'a pas la sienne. */
  defaultDepth: number;
  onEditLabel: () => void;
  /** Texte de début ou de fin d'une flèche (vide = retiré). */
  onEndLabel: (end: EdgeEnd, text: string) => void;
  onDelete: () => void;
  /** Libellé de la touche de sélection multiple (ex. « Ctrl »), pour l'aide. */
  multiSelectKey: string;
}

const NONE = '';
const URL_OPTION = '__url__';

/**
 * Barre de la sélection (SPEC §14.1) : lien vers une page ou une URL, édition du texte (F2),
 * suppression (Suppr). En sélection multiple : nombre d'éléments et suppression seulement.
 */
export function SelectionBar({
  selection,
  pages,
  onLink,
  onSpatial,
  defaultDepth,
  onEditLabel,
  onEndLabel,
  onDelete,
  multiSelectKey,
}: SelectionBarProps) {
  if (selection.items.length > 1) {
    const shapes = selection.items.filter((item) => item.type === 'shape').length;
    const edges = selection.items.length - shapes;
    const parts = [
      shapes > 0 && `${shapes} forme${shapes > 1 ? 's' : ''}`,
      edges > 0 && `${edges} flèche${edges > 1 ? 's' : ''}`,
    ].filter(Boolean);
    return (
      <div className="selection-bar" role="toolbar" aria-label="Sélection">
        <span className="selection-name" title={`${multiSelectKey} + clic : ajouter ou retirer un élément`}>
          <strong>{selection.items.length} éléments</strong> ({parts.join(', ')})
        </span>
        <button type="button" className="button" title="Supprimer les éléments sélectionnés (Suppr)" onClick={onDelete}>
          Supprimer
        </button>
      </div>
    );
  }
  const { element, type } = selection.picked;
  const link = element.link;
  const value = link?.type === 'page' ? `page:${link.pageId}` : link?.type === 'url' ? URL_OPTION : NONE;

  return (
    <div className="selection-bar" role="toolbar" aria-label="Sélection">
      <span className="selection-name" title={element.label}>
        {type === 'edge' ? 'Flèche' : 'Forme'}
        {element.label && <strong> « {element.label} »</strong>}
      </span>
      <label className="selection-link">
        Lien
        <select
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            if (next === NONE) onLink(undefined);
            else if (next === URL_OPTION) {
              const href = window.prompt(
                'Adresse du lien (https://…, mailto:…)',
                link?.type === 'url' ? link.href : '',
              );
              if (href?.trim()) onLink({ type: 'url', href: href.trim() });
            } else onLink({ type: 'page', pageId: next.slice('page:'.length) });
          }}
        >
          <option value={NONE}>Aucun</option>
          {pages
            .filter((page) => page.id !== selection.pageId)
            .map((page) => (
              <option key={page.id} value={`page:${page.id}`}>
                → {page.name}
              </option>
            ))}
          <option value={URL_OPTION}>{link?.type === 'url' ? `URL : ${link.href}` : 'URL…'}</option>
        </select>
      </label>
      {type === 'shape' && (
        <>
          <SpatialField
            key={`h:${element.id}:${spatialNumber(element, SPATIAL.height) ?? ''}`}
            label="Épaisseur"
            title="Épaisseur du volume en vue iso (spatial.height) ; vide = réglage par défaut"
            value={spatialNumber(element, SPATIAL.height)}
            placeholder={String(defaultDepth)}
            onCommit={(value) => onSpatial(SPATIAL.height, value)}
          />
          <SpatialField
            key={`e:${element.id}:${spatialNumber(element, SPATIAL.elevation) ?? ''}`}
            label="Élévation"
            title="Hauteur au-dessus du sol ou du conteneur en vue iso (spatial.elevation)"
            value={spatialNumber(element, SPATIAL.elevation)}
            placeholder="0"
            onCommit={(value) => onSpatial(SPATIAL.elevation, value)}
          />
        </>
      )}
      {type === 'edge' &&
        (['start', 'end'] as const).map((end) => {
          const current = endLabelOf(element as EdgeModel, end)?.label ?? '';
          return (
            <TextField
              key={`${end}:${element.id}:${current}`}
              label={end === 'start' ? 'Début' : 'Fin'}
              title={
                end === 'start'
                  ? 'Texte près du début de la flèche (côté source) ; vide = aucun'
                  : 'Texte près de la fin de la flèche (côté pointe) ; vide = aucun'
              }
              value={current}
              onCommit={(text) => onEndLabel(end, text)}
            />
          );
        })}
      <button type="button" className="button" title="Modifier le texte (F2, ou double-clic)" onClick={onEditLabel}>
        {type === 'edge' ? 'Texte du milieu' : 'Texte'}
      </button>
      <button type="button" className="button" title="Supprimer (Suppr)" onClick={onDelete}>
        Supprimer
      </button>
    </div>
  );
}

/** Champ texte (début / fin d'une flèche) : validé à Entrée ou en quittant le champ, Échap annule. */
function TextField({
  label,
  title,
  value,
  onCommit,
}: {
  label: string;
  title: string;
  value: string;
  onCommit: (text: string) => void;
}) {
  return (
    <label className="selection-field" title={title}>
      {label}
      <input
        type="text"
        className="selection-text"
        defaultValue={value}
        placeholder="aucun"
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

/** Champ numérique d'un attribut spatial : validé à Entrée ou en quittant le champ. */
function SpatialField({
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
    <label className="selection-field" title={title}>
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
