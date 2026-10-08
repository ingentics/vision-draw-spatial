import type { PageModeDefinition, PageModel } from '../engine';
import { InlineEdit } from './InlineEdit';
import { ModeIcon } from './ModeIcon';

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
            <path d="M5.3 7.1 11.3 3.8M5.2 9 9.5 11.4" />
            <circle cx="12.8" cy="3" r="1.7" />
            <circle cx="11.5" cy="12.5" r="2.3" />
            <circle className="graph-tab-hub" cx="3.5" cy="8" r="2" />
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
              {mode && <ModeIcon mode={mode} className="tab-mode-icon" label={`Mode ${mode.name}`} />}
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
