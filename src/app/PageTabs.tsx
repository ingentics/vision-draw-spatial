import { useState } from 'react';
import type { PageModel } from '../engine/model/types';

interface PageTabsProps {
  pages: PageModel[];
  currentPageId: string | undefined;
  /** Onglet « Vue graphe » (plusieurs pages). */
  graphActive: boolean;
  onShowGraph: () => void;
  onSelect: (pageId: string) => void;
  /** Absents : pages non modifiables (ancien format). */
  onAdd?: () => void;
  onRename?: (pageId: string, name: string) => void;
  onRemove?: (pageId: string) => void;
}

/**
 * Onglets des pages (SPEC §14.1) : double-clic pour renommer, × pour retirer la page affichée
 * (avec confirmation), + pour ajouter une page.
 */
export function PageTabs({
  pages,
  currentPageId,
  graphActive,
  onShowGraph,
  onSelect,
  onAdd,
  onRename,
  onRemove,
}: PageTabsProps) {
  const [editing, setEditing] = useState<string>();

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
        if (editing === page.id && onRename) {
          return (
            <input
              key={page.id}
              className="tab tab-input"
              defaultValue={page.name}
              aria-label="Nom de la page"
              autoFocus
              onFocus={(event) => event.target.select()}
              onBlur={(event) => {
                onRename(page.id, event.target.value);
                setEditing(undefined);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') setEditing(undefined);
              }}
            />
          );
        }
        return (
          <span key={page.id} className={active ? 'tab-wrap active' : 'tab-wrap'}>
            <button
              className={active ? 'tab active' : 'tab'}
              title={onRename ? 'Double-clic : renommer' : undefined}
              onClick={() => onSelect(page.id)}
              onDoubleClick={() => onRename && setEditing(page.id)}
            >
              {page.name}
            </button>
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
