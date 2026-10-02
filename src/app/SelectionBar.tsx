import type { Selection } from '../engine/Engine';
import type { LinkModel, PageModel } from '../engine/model/types';

interface SelectionBarProps {
  selection: Selection;
  pages: PageModel[];
  onLink: (link: LinkModel | undefined) => void;
  onEditLabel: () => void;
  onDelete: () => void;
}

const NONE = '';
const URL_OPTION = '__url__';

/**
 * Barre de la sélection (SPEC §14.1) : lien vers une page ou une URL, édition du texte (F2),
 * suppression (Suppr).
 */
export function SelectionBar({ selection, pages, onLink, onEditLabel, onDelete }: SelectionBarProps) {
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
      <button type="button" className="button" title="Modifier le texte (F2, ou double-clic)" onClick={onEditLabel}>
        Texte
      </button>
      <button type="button" className="button" title="Supprimer (Suppr)" onClick={onDelete}>
        Supprimer
      </button>
    </div>
  );
}
