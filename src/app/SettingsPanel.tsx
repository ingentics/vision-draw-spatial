import type { Settings, SettingsPatch } from '../engine';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CommentSettingsSection } from './comment';
import { AccessibilitySettings } from './settings/AccessibilitySettings';
import { EditSettings } from './settings/EditSettings';
import { ExportSettings } from './settings/ExportSettings';
import { LinkSettings } from './settings/LinkSettings';
import { NavigationSettings } from './settings/NavigationSettings';
import { MinimapSettings, SidebarSettings } from './settings/PanelSettings';
import { PluginSections } from './settings/PluginSections';
import { SelectionSettings } from './settings/SelectionSettings';
import { ShapeEdgeSettings } from './settings/ShapeEdgeSettings';
import { ShortcutSettings } from './settings/ShortcutSettings';
import { BackgroundSettings, CameraSettings, ViewSettings } from './settings/ViewSettings';
import {
  TreeRow,
  filterSections,
  groupsOf,
  keyOf,
  keysOf,
  normalizeSearch,
  readTree,
  sectionsOf,
  showNode,
  subsectionsOf,
} from './settings/settingsTree';
import type { SettingsNode, TreeSection } from './settings/settingsTree';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: SettingsPatch) => void;
  onReset: () => void;
  onResetOrientation: () => void;
  onClose: () => void;
}

/** Dernier nœud choisi, repris à la réouverture des paramètres. */
let lastNode: SettingsNode = { section: 0 };

/**
 * Paramètres (SPEC §13), dans une fenêtre modale : l'arbre des catégories (sections dépliables
 * sur leurs sous-sections) à gauche, les réglages du nœud choisi à droite ; tout s'applique
 * immédiatement et est mémorisé. La recherche, au-dessus de l'arbre, porte sur tous les réglages :
 * à droite ne restent que les sections (ou sous-sections) dont le texte contient la recherche,
 * et l'arbre ne garde que celles-là. Croix ou Échap : fermer.
 */
export function SettingsPanel({ settings, onChange, onReset, onResetOrientation, onClose }: SettingsPanelProps) {
  const [query, setQuery] = useState('');
  const [node, setNode] = useState(lastNode);
  const [expanded, setExpanded] = useState(() => new Set(keysOf(lastNode)));
  const [tree, setTree] = useState<TreeSection[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(false);
  const searching = normalizeSearch(query) !== '';

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  // Nœud affiché, ou filtrage sur le texte affiché (titres, libellés, choix, aides) : rien à maintenir à la main.
  useLayoutEffect(() => {
    if (!body.current) return;
    setEmpty(!(searching ? filterSections(body.current, query) : showNode(body.current, node)));
    const next = readTree(body.current, searching);
    setTree((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
  }, [query, searching, node, settings]);

  useLayoutEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [node, searching]);

  const choose = (next: SettingsNode) => {
    if (searching) {
      // Recherche : tous les résultats restent affichés, on va jusqu'au nœud.
      const section = sectionsOf(body.current)[next.section];
      const subsection = next.subsection === undefined ? undefined : subsectionsOf(section)[next.subsection];
      const target = next.group === undefined ? (subsection ?? section) : groupsOf(subsection)[next.group];
      target?.scrollIntoView({ block: 'start' });
      return;
    }
    lastNode = next;
    setNode(next);
    setExpanded((open) => new Set([...open, ...keysOf(next)]));
  };
  const toggle = (key: string) =>
    setExpanded((open) => {
      const next = new Set(open);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  const isNode = (section: number, subsection?: number, group?: number) =>
    !searching && node.section === section && node.subsection === subsection && node.group === group;

  const current = tree[node.section];
  const currentSub = node.subsection === undefined ? undefined : current?.subsections[node.subsection];
  const currentGroup = node.group === undefined ? undefined : currentSub?.groups[node.group];

  return (
    <dialog
      ref={dialog}
      className="settings-dialog"
      aria-label="Paramètres"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Les touches tapées dans les paramètres n'agissent pas sur la vue derrière.
      onKeyDown={(event) => event.stopPropagation()}
      onKeyUp={(event) => event.stopPropagation()}
    >
      <header className="settings-dialog-header">
        <h2>Paramètres</h2>
        <button type="button" className="button" onClick={onReset} data-tip="Revenir aux valeurs par défaut">
          Réinitialiser
        </button>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer" data-tip="Fermer (Échap)">
          ×
        </button>
      </header>
      <div className="settings-dialog-main">
        <nav className="settings-nav" aria-label="Catégories des paramètres">
          <div className="settings-search">
            <input
              type="search"
              placeholder="Rechercher un paramètre…"
              aria-label="Rechercher un paramètre"
              value={query}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && query) {
                  // Échap vide d'abord la recherche ; la fenêtre ne se ferme qu'au suivant.
                  event.preventDefault();
                  event.stopPropagation();
                  setQuery('');
                }
              }}
            />
          </div>
          <ul className="settings-tree">
            {tree.map(
              (section, i) =>
                section.shown && (
                  <li key={i}>
                    <TreeRow
                      title={section.title}
                      selected={isNode(i)}
                      expandable={section.subsections.length > 0}
                      expanded={searching || expanded.has(keyOf(i))}
                      searching={searching}
                      onToggle={() => toggle(keyOf(i))}
                      onChoose={() => choose({ section: i })}
                    />
                    {(searching || expanded.has(keyOf(i))) && section.subsections.length > 0 && (
                      <ul>
                        {section.subsections.map(
                          (subsection, j) =>
                            subsection.shown && (
                              <li key={j}>
                                <TreeRow
                                  title={subsection.title}
                                  selected={isNode(i, j)}
                                  expandable={subsection.groups.length > 0}
                                  expanded={searching || expanded.has(keyOf(i, j))}
                                  searching={searching}
                                  onToggle={() => toggle(keyOf(i, j))}
                                  onChoose={() => choose({ section: i, subsection: j })}
                                />
                                {(searching || expanded.has(keyOf(i, j))) && subsection.groups.length > 0 && (
                                  <ul>
                                    {subsection.groups.map(
                                      (group, k) =>
                                        group.shown && (
                                          <li key={k}>
                                            <TreeRow
                                              title={group.title}
                                              selected={isNode(i, j, k)}
                                              searching={searching}
                                              onChoose={() => choose({ section: i, subsection: j, group: k })}
                                            />
                                          </li>
                                        ),
                                    )}
                                  </ul>
                                )}
                              </li>
                            ),
                        )}
                      </ul>
                    )}
                  </li>
                ),
            )}
          </ul>
        </nav>

        <div className="settings-content">
          <p className="settings-breadcrumb">
            {searching ? (
              'Résultats de la recherche'
            ) : currentSub ? (
              <>
                <button type="button" className="link-button" onClick={() => choose({ section: node.section })}>
                  {current?.title}
                </button>
                <span aria-hidden="true"> › </span>
                {currentGroup ? (
                  <>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => choose({ section: node.section, subsection: node.subsection })}
                    >
                      {currentSub.title}
                    </button>
                    <span aria-hidden="true"> › </span>
                    {currentGroup.title}
                  </>
                ) : (
                  currentSub.title
                )}
              </>
            ) : (
              current?.title
            )}
          </p>
          <div
            className={[
              'settings-body',
              searching && 'searching',
              !searching && currentSub && 'single',
              !searching && currentGroup && 'single-group',
            ]
              .filter(Boolean)
              .join(' ')}
            ref={body}
          >
            {empty && <p className="hint muted">Aucun paramètre ne correspond à « {query} ».</p>}

            <NavigationSettings settings={settings} onChange={onChange} />
            <ViewSettings settings={settings} onChange={onChange} onResetOrientation={onResetOrientation} />
            <CameraSettings settings={settings} onChange={onChange} />
            <BackgroundSettings settings={settings} onChange={onChange} />
            <SelectionSettings settings={settings} onChange={onChange} />
            <LinkSettings settings={settings} onChange={onChange} />
            <MinimapSettings settings={settings} onChange={onChange} />
            <CommentSettingsSection settings={settings} onChange={onChange} />
            <SidebarSettings settings={settings} onChange={onChange} />
            <ShapeEdgeSettings settings={settings} onChange={onChange} />
            <ExportSettings settings={settings} onChange={onChange} />
            <PluginSections settings={settings} onChange={onChange} />
            <EditSettings settings={settings} onChange={onChange} />
            <ShortcutSettings settings={settings} onChange={onChange} />
            <AccessibilitySettings settings={settings} onChange={onChange} />
          </div>
        </div>
      </div>
    </dialog>
  );
}
