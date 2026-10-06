import type { PageModel } from '../engine/model/types';
import type { PageModeDefinition } from '../engine/modes/types';
import { InlineEdit } from './InlineEdit';

interface PageTabsProps {
  pages: PageModel[];
  currentPageId: string | undefined;
  /** Onglet « Vue graphe » (plusieurs pages). */
  graphActive: boolean;
  onShowGraph: () => void;
  onSelect: (pageId: string) => void;
  /** Mode de la page (nom et icône), pour l'icône de son onglet. */
  modeOf?: (page: PageModel) => Pick<PageModeDefinition, 'name' | 'icon'> | undefined;
  /** Absents : pages non modifiables (ancien format). */
  onAdd?: () => void;
  onRename?: (pageId: string, name: string) => void;
  onRemove?: (pageId: string) => void;
}

/**
 * Onglets des pages (SPEC §14.1) : double-clic pour renommer, × pour retirer la page affichée
 * (avec confirmation), + pour ajouter une page. Une page en mode montre l'icône du mode devant son nom (sujet 197).
 */
export function PageTabs({
  pages,
  currentPageId,
  graphActive,
  onShowGraph,
  onSelect,
  modeOf,
  onAdd,
  onRename,
  onRemove,
}: PageTabsProps) {
  return (
    <nav className="tabs">
      {pages.length > 1 && (
        <button
          className={graphActive ? 'tab graph-tab active' : 'tab graph-tab'}
          title="Vue d’ensemble des pages et de leurs liens (touche G)"
          onClick={onShowGraph}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4.5h3M9 11.5h3M5.5 6 10 10M4 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 10a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8.5 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
          </svg>
          Vue graphe
        </button>
      )}
      {pages.map((page) => {
        const active = page.id === currentPageId;
        const mode = modeOf?.(page);
        return (
          <span key={page.id} className={active ? 'tab-wrap active' : 'tab-wrap'}>
            <InlineEdit
              value={page.name}
              label="Nom de la page"
              trigger="doubleClick"
              className={active ? 'tab active' : 'tab'}
              inputClassName="tab tab-input"
              title={onRename ? 'Double-clic : renommer' : undefined}
              onClick={() => onSelect(page.id)}
              onCommit={onRename && ((name) => onRename(page.id, name))}
            >
              {mode?.icon && (
                <svg className="tab-mode-icon" viewBox="0 0 16 16" role="img" aria-label={`Mode ${mode.name}`}>
                  <title>{`Mode ${mode.name}`}</title>
                  <path d={mode.icon} />
                </svg>
              )}
              {page.name}
            </InlineEdit>
            {active && onRemove && pages.length > 1 && (
              <button
                type="button"
                className="tab-remove"
                aria-label={`Supprimer la page « ${page.name} »`}
                title="Supprimer la page"
                onClick={() => {
                  if (window.confirm(`Supprimer la page « ${page.name} » ?`)) onRemove(page.id);
                }}
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      {onAdd && (
        <button type="button" className="tab tab-add" title="Nouvelle page" aria-label="Nouvelle page" onClick={onAdd}>
          +
        </button>
      )}
    </nav>
  );
}
