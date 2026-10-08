import { RESERVED_CODES, SETTINGS_LIMITS } from '../engine';
import type {
  FollowLinkGesture,
  FollowLinkKey,
  MultiSelectKey,
  PluginSetting,
  PluginValues,
  Settings,
  SettingsPatch,
  Shortcuts,
} from '../engine';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CommentSettingsSection } from './comment';
import { ChoiceGroup } from './ChoiceGroup';
import type { ChoiceOption } from './ChoiceGroup';
import { desktop } from './desktop';
import { ANCHORING_OPTIONS, EDGE_LINE_OPTIONS, JUMP_OPTIONS } from './edgeIcons';
import { ColorField, Slider } from './SettingsFields';
import { IsoIcon, IsoSettings } from './IsoSettings';
import { Section, Subsection, Subsubsection } from './PanelSection';
import { usePlugins } from './pluginsContext';
import {
  BackgroundPreview,
  EdgeEndTextsPreview,
  EdgeLabelPreview,
  GraphPreview,
  LoopPreview,
  MinimapPreview,
  PlaceholderPreview,
  SelectionPreview,
  SidebarPreview,
  SplitEdgePreview,
  TransitionPreview,
  VolumePreview,
} from './settingsPreviews';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (patch: SettingsPatch) => void;
  onReset: () => void;
  onResetOrientation: () => void;
  onClose: () => void;
}

/** Touches de sélection multiple, telles qu'affichées. */
export const MULTI_SELECT_LABELS: Record<MultiSelectKey, string> = {
  ctrl: 'Ctrl',
  meta: '⌘ / Windows',
  shift: 'Maj',
  alt: 'Alt / ⌥',
};

/** Touches pour suivre un lien au double-clic, telles qu'affichées. */
const FOLLOW_LINK_LABELS: Record<FollowLinkKey, string> = {
  space: 'Espace',
  ...MULTI_SELECT_LABELS,
  none: 'Aucune (double-clic seul)',
};

const FOLLOW_LINK_GESTURE_LABELS: Record<FollowLinkGesture, string> = { click: 'Clic', doubleClick: 'Double-clic' };

const SHORTCUT_LABELS: Record<keyof Shortcuts, string> = {
  toggleViewMode: 'Basculer 2D ↔ iso',
  toggle3d: 'Basculer vers / depuis la 3D',
  toggleGraph: 'Vue graphe ↔ dernière page',
  toggleMinimap: 'Afficher / masquer la mini-carte',
  toggleFlatten: 'Aplatir / rétablir les volumes (iso, 3D)',
  overview: 'Vue globale ↔ 1:1',
  deleteSelection: 'Supprimer la sélection (Suppr aussi)',
  placementVariant: 'Variante de placement d’une flèche (ancrage manuel)',
  editComment: 'Éditer le commentaire (sélectionné, sinon survolé)',
};

/**
 * Nœud de l'arbre des catégories : une section, l'une de ses sous-sections, ou l'un des groupes d'une sous-section
 * (rangs dans le panneau).
 */
interface SettingsNode {
  section: number;
  subsection?: number;
  group?: number;
}

/** Arbre des catégories, lu sur les titres affichés ; `shown` : nœud gardé par la recherche. */
interface TreeNode {
  title: string;
  shown: boolean;
}
interface TreeSection extends TreeNode {
  subsections: Array<TreeNode & { groups: TreeNode[] }>;
}

/** Clé d'un nœud dépliable : la section, ou la sous-section (« 3.1 »). */
const keyOf = (section: number, subsection?: number) =>
  subsection === undefined ? `${section}` : `${section}.${subsection}`;

/** Clés des nœuds à déplier pour montrer `node` dans l'arbre, et ses enfants. */
const keysOf = ({ section, subsection }: SettingsNode) =>
  subsection === undefined ? [keyOf(section)] : [keyOf(section), keyOf(section, subsection)];

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
  const { controls, view, camera, background, transition, preload, minimap, selection, accessibility, debug, save } =
    settings;
  const { shapes, graph, edit } = settings;
  // Modes et effets du moteur affiché (sujet 290) ; aucun tant qu'il n'est pas créé.
  const plugins = usePlugins();
  const systemReduced = useSystemReducedMotion();
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

  const percent = (v: number) => `${Math.round(v * 100)} %`;
  const ms = (v: number) => (v === 0 ? 'instantané' : v < 1000 ? `${v} ms` : `${(v / 1000).toLocaleString('fr-FR')} s`);
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
        <button type="button" className="button" onClick={onReset} title="Revenir aux valeurs par défaut">
          Réinitialiser
        </button>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer" title="Fermer (Échap)">
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

            <Section title="Navigation">
              <Subsection title="Clavier">
                <Choice
                  label="Touches de déplacement"
                  value={controls.moveKeys}
                  options={[
                    ['all', 'Lettres + flèches'],
                    ['letters', 'ZQSD / WASD'],
                    ['arrows', 'Flèches'],
                  ]}
                  onChange={(moveKeys) => onChange({ controls: { moveKeys } })}
                />
                <Slider
                  label="Vitesse au clavier"
                  value={controls.moveSpeed}
                  limits={SETTINGS_LIMITS['controls.moveSpeed']}
                  format={(v) => `${v} px/s`}
                  onChange={(moveSpeed) => onChange({ controls: { moveSpeed } })}
                />
                <Slider
                  label="Rotation au clavier (A / E, iso et 3D)"
                  value={controls.rotateSpeed}
                  limits={SETTINGS_LIMITS['controls.rotateSpeed']}
                  format={(v) => `${v}°/s`}
                  onChange={(rotateSpeed) => onChange({ controls: { rotateSpeed } })}
                />
                <Slider
                  label="Glissade à l’arrêt"
                  value={controls.decelerationMs}
                  limits={SETTINGS_LIMITS['controls.decelerationMs']}
                  format={(v) => (v === 0 ? 'aucune' : `${v} ms`)}
                  onChange={(decelerationMs) => onChange({ controls: { decelerationMs } })}
                />
              </Subsection>
              <Subsection title="Glisser">
                <Slider
                  label="Déplacement au-delà duquel un clic devient un glisser"
                  value={controls.clickSlop}
                  limits={SETTINGS_LIMITS['controls.clickSlop']}
                  format={(v) => `${v} px`}
                  onChange={(clickSlop) => onChange({ controls: { clickSlop } })}
                />
                <Slider
                  label="Vitesse maximale au lâcher"
                  value={controls.maxReleaseSpeed}
                  limits={SETTINGS_LIMITS['controls.maxReleaseSpeed']}
                  format={(v) => `${v} px/s`}
                  onChange={(maxReleaseSpeed) => onChange({ controls: { maxReleaseSpeed } })}
                />
                <Slider
                  label="Mesure de la vitesse au lâcher, sur les dernières"
                  value={controls.releaseWindowMs}
                  limits={SETTINGS_LIMITS['controls.releaseWindowMs']}
                  format={(v) => `${v} ms`}
                  onChange={(releaseWindowMs) => onChange({ controls: { releaseWindowMs } })}
                />
                <Slider
                  label="Arrêt de la glissade sous"
                  value={controls.stopSpeed}
                  limits={SETTINGS_LIMITS['controls.stopSpeed']}
                  format={(v) => `${v} px/s`}
                  onChange={(stopSpeed) => onChange({ controls: { stopSpeed } })}
                />
                <p className="hint muted">
                  Un glisser rapide de la vue continue sur sa lancée (glissade à l’arrêt), à la vitesse mesurée juste
                  avant de lâcher.
                </p>
              </Subsection>
              <Subsection title="Souris">
                <Slider
                  label="Sensibilité de la molette (zoom)"
                  value={controls.zoomSpeed}
                  limits={SETTINGS_LIMITS['controls.zoomSpeed']}
                  format={(v) => `×${(v / 0.0015).toFixed(1)}`}
                  onChange={(zoomSpeed) => onChange({ controls: { zoomSpeed } })}
                />
                <Slider
                  label="Sensibilité de la rotation (clic droit, iso et 3D)"
                  value={controls.orbitSpeed}
                  limits={SETTINGS_LIMITS['controls.orbitSpeed']}
                  format={(v) => `${((v * 100 * 180) / Math.PI).toFixed(0)}° / 100 px`}
                  onChange={(orbitSpeed) => onChange({ controls: { orbitSpeed } })}
                />
              </Subsection>
            </Section>

            <Section title="Vue">
              <Subsection title="Modes">
                <Choice
                  label="Mode à l’ouverture"
                  value={view.defaultMode}
                  options={[
                    ['top', '2D'],
                    ['iso', 'Iso'],
                    ['3d', '3D'],
                  ]}
                  onChange={(defaultMode) => onChange({ view: { defaultMode } })}
                />
                <Slider
                  label="Durée de la bascule 2D ↔ iso ↔ 3D"
                  value={view.switchDurationMs}
                  limits={SETTINGS_LIMITS['view.switchDurationMs']}
                  format={(v) => (v === 0 ? 'instantanée' : `${v} ms`)}
                  onChange={(switchDurationMs) => onChange({ view: { switchDurationMs } })}
                />
              </Subsection>
              <Subsection
                title={
                  <>
                    <IsoIcon />
                    Vue isométrique
                  </>
                }
              >
                <IsoSettings
                  value={view}
                  onChange={(patch) => onChange({ view: patch })}
                  onResetOrientation={onResetOrientation}
                />
              </Subsection>
              <Subsection title="Vue 3D">
                <Slider
                  label="Champ de vision"
                  value={camera.fovDeg}
                  limits={SETTINGS_LIMITS['camera.fovDeg']}
                  format={(v) => `${v}°`}
                  onChange={(fovDeg) => onChange({ camera: { fovDeg } })}
                />
                <Slider
                  label="Inclinaison maximale"
                  value={camera.maxTilt3dDeg}
                  limits={SETTINGS_LIMITS['camera.maxTilt3dDeg']}
                  format={(v) => `${v}°`}
                  onChange={(maxTilt3dDeg) => onChange({ camera: { maxTilt3dDeg } })}
                />
                <Slider
                  label="Dézoom maximal (3D)"
                  value={camera.minZoom3d}
                  limits={SETTINGS_LIMITS['camera.minZoom3d']}
                  format={percent}
                  onChange={(minZoom3d) => onChange({ camera: { minZoom3d } })}
                />
                <Slider
                  label="Zoom maximal (3D)"
                  value={camera.maxZoom3d}
                  limits={SETTINGS_LIMITS['camera.maxZoom3d']}
                  format={percent}
                  onChange={(maxZoom3d) => onChange({ camera: { maxZoom3d } })}
                />
              </Subsection>
              <Subsection title="Volumes (iso et 3D)">
                <Toggle
                  label="Formes en volume"
                  checked={view.isoVolume}
                  onChange={(isoVolume) => onChange({ view: { isoVolume } })}
                />
                <Slider
                  label="Épaisseur par défaut"
                  value={view.isoDepth}
                  limits={SETTINGS_LIMITS['view.isoDepth']}
                  format={(v) => `${v} px`}
                  disabled={!view.isoVolume}
                  onChange={(isoDepth) => onChange({ view: { isoDepth } })}
                />
                <p className="hint muted">Par forme : style draw.io « spatial.height=… »</p>
                <Toggle
                  label="Étiquettes sur les façades (DB, QUEUE, CACHE)"
                  checked={view.facadeTags}
                  disabled={!view.isoVolume}
                  onChange={(facadeTags) => onChange({ view: { facadeTags } })}
                />
                <p className="hint muted">Par forme : style draw.io « spatial.tag=… » (vide = aucune).</p>
                <Slider
                  label="Luminosité de la face éclairée"
                  value={view.shadeLight}
                  limits={SETTINGS_LIMITS['view.shadeLight']}
                  format={percent}
                  disabled={!view.isoVolume}
                  onChange={(shadeLight) => onChange({ view: { shadeLight } })}
                />
                <Slider
                  label="Luminosité de la face à l’ombre"
                  value={view.shadeDark}
                  limits={SETTINGS_LIMITS['view.shadeDark']}
                  format={percent}
                  disabled={!view.isoVolume}
                  onChange={(shadeDark) => onChange({ view: { shadeDark } })}
                />
                <VolumePreview view={view} background={background} />
              </Subsection>
            </Section>

            <Section title="Caméra">
              <Subsection title="Zoom (2D et iso)">
                <Slider
                  label="Dézoom maximal"
                  value={camera.minZoom}
                  limits={SETTINGS_LIMITS['camera.minZoom']}
                  format={percent}
                  onChange={(minZoom) => onChange({ camera: { minZoom } })}
                />
                <Slider
                  label="Zoom maximal"
                  value={camera.maxZoom}
                  limits={SETTINGS_LIMITS['camera.maxZoom']}
                  format={percent}
                  onChange={(maxZoom) => onChange({ camera: { maxZoom } })}
                />
              </Subsection>
              <Subsection title="Animations de la caméra">
                <Slider
                  label="Durée (vue globale, réinitialiser la vue, aller à un élément)"
                  value={camera.animationMs}
                  limits={SETTINGS_LIMITS['camera.animationMs']}
                  format={ms}
                  onChange={(animationMs) => onChange({ camera: { animationMs } })}
                />
              </Subsection>
              <Subsection title="Aller à un élément (diagnostics, liens)">
                <Slider
                  label="Zoom maximal"
                  value={camera.focusMaxZoom}
                  limits={SETTINGS_LIMITS['camera.focusMaxZoom']}
                  format={percent}
                  onChange={(focusMaxZoom) => onChange({ camera: { focusMaxZoom } })}
                />
                <Slider
                  label="Marge autour de l’élément"
                  value={camera.focusPadding}
                  limits={SETTINGS_LIMITS['camera.focusPadding']}
                  format={(v) => `${v} px`}
                  onChange={(focusPadding) => onChange({ camera: { focusPadding } })}
                />
              </Subsection>
            </Section>

            <Section title="Fond et grille">
              <Subsection title="Fond">
                <ColorField
                  label="Couleur du fond"
                  value={background.color}
                  onChange={(color) => onChange({ background: { color } })}
                />
              </Subsection>
              <Subsection title="Grille">
                <Toggle
                  label="Afficher la grille"
                  checked={background.grid}
                  onChange={(grid) => onChange({ background: { grid } })}
                />
                <Toggle
                  label="Pas de la page draw.io quand elle en a un"
                  checked={background.gridFromPage}
                  disabled={!background.grid}
                  onChange={(gridFromPage) => onChange({ background: { gridFromPage } })}
                />
                <Slider
                  label={background.gridFromPage ? 'Pas par défaut' : 'Pas de la grille'}
                  value={background.gridSize}
                  limits={SETTINGS_LIMITS['background.gridSize']}
                  format={(v) => `${v} px`}
                  disabled={!background.grid}
                  onChange={(gridSize) => onChange({ background: { gridSize } })}
                />
                <Slider
                  label="Ligne principale"
                  value={background.majorEvery}
                  limits={SETTINGS_LIMITS['background.majorEvery']}
                  format={(v) => (v === 1 ? 'aucune' : `toutes les ${v} cases`)}
                  disabled={!background.grid}
                  onChange={(majorEvery) => onChange({ background: { majorEvery } })}
                />
                <ColorField
                  label="Couleur de la grille"
                  value={background.gridColor}
                  disabled={!background.grid}
                  onChange={(gridColor) => onChange({ background: { gridColor } })}
                />
                <Slider
                  label="Intensité des lignes secondaires"
                  value={background.minorStrength}
                  limits={SETTINGS_LIMITS['background.minorStrength']}
                  format={percent}
                  disabled={!background.grid || background.majorEvery === 1}
                  onChange={(minorStrength) => onChange({ background: { minorStrength } })}
                />
              </Subsection>
              <SectionPreview>
                <BackgroundPreview background={background} />
              </SectionPreview>
            </Section>

            <Section title="Sélection">
              <Subsection title="Mise en valeur">
                <Choice
                  label="Style"
                  value={selection.style}
                  options={[
                    ['veil', 'Voile sur le reste'],
                    ['outline', 'Contour'],
                  ]}
                  onChange={(style) => onChange({ selection: { style } })}
                />
                {(plugins?.modes.list() ?? [])
                  .filter((mode) => mode.selectionStyle)
                  .map((mode) => (
                    <p key={mode.id} className="panel-hint">
                      Pages « {mode.name} » : {mode.selectionStyle === 'outline' ? 'contour' : 'voile'} imposé.
                    </p>
                  ))}
                <ColorField
                  label="Couleur d’accent (contour, poignées, liens, mini-carte)"
                  value={selection.accentColor}
                  onChange={(accentColor) => onChange({ selection: { accentColor } })}
                />
              </Subsection>
              <Subsection title="Voile">
                <Slider
                  label="Intensité du voile"
                  value={selection.veilOpacity}
                  limits={SETTINGS_LIMITS['selection.veilOpacity']}
                  format={percent}
                  disabled={selection.style !== 'veil'}
                  onChange={(veilOpacity) => onChange({ selection: { veilOpacity } })}
                />
                <ColorField
                  label="Couleur du voile"
                  value={selection.veilColor}
                  disabled={selection.style !== 'veil'}
                  onChange={(veilColor) => onChange({ selection: { veilColor } })}
                />
                <Slider
                  label="Marge autour d’une flèche sélectionnée"
                  value={selection.veilPadding}
                  limits={SETTINGS_LIMITS['selection.veilPadding']}
                  format={(v) => `${v} px`}
                  disabled={selection.style !== 'veil'}
                  onChange={(veilPadding) => onChange({ selection: { veilPadding } })}
                />
              </Subsection>
              <Subsection title="Contour">
                <Toggle
                  label="Contour animé (les tirets défilent)"
                  checked={selection.animated}
                  disabled={selection.style !== 'outline'}
                  onChange={(animated) => onChange({ selection: { animated } })}
                />
                <Slider
                  label="Vitesse des tirets"
                  value={selection.speed}
                  limits={SETTINGS_LIMITS['selection.speed']}
                  format={(v) => `${v} px/s`}
                  disabled={selection.style !== 'outline' || !selection.animated}
                  onChange={(speed) => onChange({ selection: { speed } })}
                />
              </Subsection>
              <SectionPreview>
                <SelectionPreview selection={selection} background={background} />
              </SectionPreview>
            </Section>

            <Section title="Liens entre pages">
              <Subsection title="Transitions">
                <Toggle
                  label="Animer le passage par un lien"
                  checked={transition.enabled}
                  onChange={(enabled) => onChange({ transition: { enabled } })}
                />
                <Slider
                  label="Durée"
                  value={transition.durationMs}
                  limits={SETTINGS_LIMITS['transition.durationMs']}
                  format={(v) => `${(v / 1000).toFixed(2)} s`}
                  disabled={!transition.enabled}
                  onChange={(durationMs) => onChange({ transition: { durationMs } })}
                />
                <Choice
                  label="Courbe"
                  value={transition.easing}
                  options={[
                    ['ease-in-out', 'Douce'],
                    ['ease-out', 'Freinée'],
                    ['ease-in', 'Accélérée'],
                    ['linear', 'Linéaire'],
                  ]}
                  disabled={!transition.enabled}
                  onChange={(easing) => onChange({ transition: { easing } })}
                />
                <Slider
                  label="Début du fondu entre les pages"
                  value={transition.fadeStart}
                  limits={SETTINGS_LIMITS['transition.fadeStart']}
                  format={percent}
                  disabled={!transition.enabled}
                  onChange={(fadeStart) => onChange({ transition: { fadeStart } })}
                />
                <Slider
                  label="Fin du fondu entre les pages"
                  value={transition.fadeEnd}
                  limits={SETTINGS_LIMITS['transition.fadeEnd']}
                  format={percent}
                  disabled={!transition.enabled}
                  onChange={(fadeEnd) => onChange({ transition: { fadeEnd } })}
                />
                <TransitionPreview transition={transition} />
              </Subsection>
              <Subsection title="Préchargement">
                <Toggle
                  label="Préparer la page cible au clic sur un lien"
                  checked={preload.onClick}
                  onChange={(onClick) => onChange({ preload: { onClick } })}
                />
                <Toggle
                  label="Préparer au survol prolongé"
                  checked={preload.onHover}
                  onChange={(onHover) => onChange({ preload: { onHover } })}
                />
                <Slider
                  label="Délai de survol"
                  value={preload.hoverDelayMs}
                  limits={SETTINGS_LIMITS['preload.hoverDelayMs']}
                  format={(v) => `${v} ms`}
                  disabled={!preload.onHover}
                  onChange={(hoverDelayMs) => onChange({ preload: { hoverDelayMs } })}
                />
                <Slider
                  label="Pages gardées en mémoire"
                  value={preload.maxCachedPages}
                  limits={SETTINGS_LIMITS['preload.maxCachedPages']}
                  format={(v) => `${v} page${v > 1 ? 's' : ''}`}
                  onChange={(maxCachedPages) => onChange({ preload: { maxCachedPages } })}
                />
              </Subsection>
              <Subsection title="Vue graphe">
                <Slider
                  label="Largeur des cartes de pages"
                  value={graph.cardWidth}
                  limits={SETTINGS_LIMITS['graph.cardWidth']}
                  format={(v) => `${v} px`}
                  onChange={(cardWidth) => onChange({ graph: { cardWidth } })}
                />
                <Slider
                  label="Écart entre les colonnes"
                  value={graph.columnGap}
                  limits={SETTINGS_LIMITS['graph.columnGap']}
                  format={(v) => `${v} px`}
                  onChange={(columnGap) => onChange({ graph: { columnGap } })}
                />
                <Slider
                  label="Écart entre les cartes d’une colonne"
                  value={graph.rowGap}
                  limits={SETTINGS_LIMITS['graph.rowGap']}
                  format={(v) => `${v} px`}
                  onChange={(rowGap) => onChange({ graph: { rowGap } })}
                />
                <Slider
                  label="Écart entre l’aller et le retour d’un lien"
                  value={graph.pairOffset}
                  limits={SETTINGS_LIMITS['graph.pairOffset']}
                  format={(v) => `${v} px`}
                  onChange={(pairOffset) => onChange({ graph: { pairOffset } })}
                />
                <ColorField
                  label="Cadre des cartes"
                  value={graph.cardColor}
                  onChange={(cardColor) => onChange({ graph: { cardColor } })}
                />
                <ColorField
                  label="Page orpheline"
                  value={graph.orphanColor}
                  onChange={(orphanColor) => onChange({ graph: { orphanColor } })}
                />
                <ColorField
                  label="Page inaccessible"
                  value={graph.unreachableColor}
                  onChange={(unreachableColor) => onChange({ graph: { unreachableColor } })}
                />
                <ColorField
                  label="Liens entre pages"
                  value={graph.arcColor}
                  onChange={(arcColor) => onChange({ graph: { arcColor } })}
                />
                <ColorField
                  label="Titres des cartes"
                  value={graph.titleColor}
                  onChange={(titleColor) => onChange({ graph: { titleColor } })}
                />
                <p className="hint muted">La page de départ prend la couleur d’accent (Sélection).</p>
                <GraphPreview graph={graph} background={background} accent={selection.accentColor} />
              </Subsection>
            </Section>

            <Section title="Mini-carte">
              <Toggle
                label="Afficher la mini-carte"
                checked={minimap.visible}
                onChange={(visible) => onChange({ minimap: { visible } })}
              />
              <Slider
                label="Largeur de la mini-carte"
                value={minimap.size}
                limits={SETTINGS_LIMITS['minimap.size']}
                format={(v) => `${v} px`}
                disabled={!minimap.visible}
                onChange={(size) => onChange({ minimap: { size } })}
              />
              <ColorField
                label="Flèches"
                value={minimap.edgeColor}
                disabled={!minimap.visible}
                onChange={(edgeColor) => onChange({ minimap: { edgeColor } })}
              />
              <ColorField
                label="Contour des formes"
                value={minimap.outlineColor}
                disabled={!minimap.visible}
                onChange={(outlineColor) => onChange({ minimap: { outlineColor } })}
              />
              <MinimapPreview minimap={minimap} background={background} accent={selection.accentColor} />
            </Section>

            <CommentSettingsSection settings={settings} onChange={onChange} />

            <Section title="Barres latérales">
              <Choice
                label="Nom sur la bande d'une barre repliée"
                value={settings.panels.stripText}
                options={[
                  ['up', 'De bas en haut'],
                  ['down', 'De haut en bas'],
                ]}
                onChange={(stripText) => onChange({ panels: { stripText } })}
              />
              <Slider
                label="Ombre sur la zone de dessin"
                value={settings.panels.shadow}
                limits={SETTINGS_LIMITS['panels.shadow']}
                format={(v) => (v === 0 ? 'Aucune' : percent(v))}
                onChange={(shadow) => onChange({ panels: { shadow } })}
              />
              <Slider
                label="Largeur gardée à la zone de dessin"
                value={settings.panels.minCanvas}
                limits={SETTINGS_LIMITS['panels.minCanvas']}
                format={(v) => `${v} px`}
                onChange={(minCanvas) => onChange({ panels: { minCanvas } })}
              />
              <p className="hint muted">
                Replier : double flèche en haut de la barre ; largeur : glisser son bord (double-clic = par défaut).
              </p>
              <SidebarPreview panels={settings.panels} background={background} />
            </Section>

            <Section title="Formes et flèches">
              <Subsection title="Nouvelles formes et flèches">
                <Slider
                  label="Taille du texte"
                  value={shapes.textSize}
                  limits={SETTINGS_LIMITS['shapes.textSize']}
                  format={(v) => `${v} px`}
                  onChange={(textSize) => onChange({ shapes: { textSize } })}
                />
                <Choice
                  label="Tracé des flèches"
                  value={shapes.edgeLineStyle}
                  options={EDGE_LINE_OPTIONS}
                  onChange={(edgeLineStyle) => onChange({ shapes: { edgeLineStyle } })}
                />
                <Slider
                  label="Marge d’une boucle (flèche vers la même forme)"
                  value={shapes.edgeLoopMargin}
                  limits={SETTINGS_LIMITS['shapes.edgeLoopMargin']}
                  format={(v) => `${v} px`}
                  onChange={(edgeLoopMargin) => onChange({ shapes: { edgeLoopMargin } })}
                />
                <p className="hint muted">
                  Écrits dans le style draw.io des formes de la palette et des flèches tirées depuis une forme ; à
                  changer ensuite forme par forme dans le panneau de droite.
                </p>
                <LoopPreview shapes={shapes} background={background} />
              </Subsection>
              <Subsection title="Ancrage">
                <Choice
                  label="Ancrage des flèches"
                  value={shapes.edgeAnchoring}
                  options={ANCHORING_OPTIONS}
                  onChange={(edgeAnchoring) => onChange({ shapes: { edgeAnchoring } })}
                />
                <ul className="hint muted hint-list">
                  <li>
                    <strong>Manuel</strong> : on choisit le point d'attache, un point libre est toujours proposé entre
                    deux flèches.
                  </li>
                  <li>
                    <strong>Automatique</strong> : on choisit le côté, les flèches y sont réparties sans se croiser.
                  </li>
                  <li>
                    <strong>Typon</strong> : comme l'automatique, tracé à 45° comme les pistes d'un circuit imprimé.
                  </li>
                </ul>
                <p className="hint muted">Une page peut avoir son propre réglage (panneau Page).</p>
                <Subsubsection title="Automatique">
                  <Toggle
                    label="Contourner les formes et les flèches"
                    checked={shapes.edgeAutoRoute}
                    onChange={(edgeAutoRoute) => onChange({ shapes: { edgeAutoRoute } })}
                  />
                  <Slider
                    label="Écart aux formes"
                    value={shapes.edgeShapeClearance}
                    limits={SETTINGS_LIMITS['shapes.edgeShapeClearance']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgeAutoRoute}
                    onChange={(edgeShapeClearance) => onChange({ shapes: { edgeShapeClearance } })}
                  />
                  <Slider
                    label="Écart entre flèches"
                    value={shapes.edgeSpacing}
                    limits={SETTINGS_LIMITS['shapes.edgeSpacing']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgeAutoRoute}
                    onChange={(edgeSpacing) => onChange({ shapes: { edgeSpacing } })}
                  />
                  <Slider
                    label="Premier et dernier segments"
                    value={shapes.edgePortStub}
                    limits={SETTINGS_LIMITS['shapes.edgePortStub']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgeAutoRoute}
                    onChange={(edgePortStub) => onChange({ shapes: { edgePortStub } })}
                  />
                  <Slider
                    label="Détour pour éviter un croisement"
                    value={shapes.edgeCrossingDetour}
                    limits={SETTINGS_LIMITS['shapes.edgeCrossingDetour']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgeAutoRoute}
                    onChange={(edgeCrossingDetour) => onChange({ shapes: { edgeCrossingDetour } })}
                  />
                  <p className="hint muted">
                    Le tracé à angles droits contourne les formes et ne se superpose pas aux autres flèches ; il est
                    écrit en points intermédiaires, que draw.io suit tels quels. Appliqué à la prochaine modification de
                    la page. Sans contournement : la répartition seule, tracé de draw.io.
                  </p>
                </Subsubsection>
                <Subsubsection title="Typon">
                  <Toggle
                    label="Contourner les formes et les flèches"
                    checked={shapes.edgePcbAutoRoute}
                    onChange={(edgePcbAutoRoute) => onChange({ shapes: { edgePcbAutoRoute } })}
                  />
                  <Slider
                    label="Écart aux formes"
                    value={shapes.edgePcbShapeClearance}
                    limits={SETTINGS_LIMITS['shapes.edgePcbShapeClearance']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgePcbAutoRoute}
                    onChange={(edgePcbShapeClearance) => onChange({ shapes: { edgePcbShapeClearance } })}
                  />
                  <Slider
                    label="Écart entre flèches (pas de la grille)"
                    value={shapes.edgePcbSpacing}
                    limits={SETTINGS_LIMITS['shapes.edgePcbSpacing']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgePcbAutoRoute}
                    onChange={(edgePcbSpacing) => onChange({ shapes: { edgePcbSpacing } })}
                  />
                  <Slider
                    label="Premier et dernier segments"
                    value={shapes.edgePcbPortStub}
                    limits={SETTINGS_LIMITS['shapes.edgePcbPortStub']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgePcbAutoRoute}
                    onChange={(edgePcbPortStub) => onChange({ shapes: { edgePcbPortStub } })}
                  />
                  <Slider
                    label="Détour pour éviter un croisement"
                    value={shapes.edgePcbCrossingDetour}
                    limits={SETTINGS_LIMITS['shapes.edgePcbCrossingDetour']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgePcbAutoRoute}
                    onChange={(edgePcbCrossingDetour) => onChange({ shapes: { edgePcbCrossingDetour } })}
                  />
                  <Slider
                    label="Coût d’un coude à 45°"
                    value={shapes.edgePcbBend45}
                    limits={SETTINGS_LIMITS['shapes.edgePcbBend45']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgePcbAutoRoute}
                    onChange={(edgePcbBend45) => onChange({ shapes: { edgePcbBend45 } })}
                  />
                  <Slider
                    label="Coût d’un coude à 90°"
                    value={shapes.edgePcbBend90}
                    limits={SETTINGS_LIMITS['shapes.edgePcbBend90']}
                    format={(v) => `${v} px`}
                    disabled={!shapes.edgePcbAutoRoute}
                    onChange={(edgePcbBend90) => onChange({ shapes: { edgePcbBend90 } })}
                  />
                  <p className="hint muted">
                    Tracé à 0°, 45° et 90° sur une grille au pas de l'écart entre flèches ; un coude coûte autant qu'un
                    allongement de cette longueur. Appliqué à la prochaine modification de la page. Sans contournement :
                    tracé octilinéaire direct.
                  </p>
                </Subsubsection>
              </Subsection>
              <Subsection title="Textes de début et de fin">
                <Slider
                  label="Taille"
                  value={shapes.edgeEndTextSize}
                  limits={SETTINGS_LIMITS['shapes.edgeEndTextSize']}
                  format={(v) => `${v} px`}
                  onChange={(edgeEndTextSize) => onChange({ shapes: { edgeEndTextSize } })}
                />
                <ColorField
                  label="Couleur"
                  value={shapes.edgeEndTextColor}
                  onChange={(edgeEndTextColor) => onChange({ shapes: { edgeEndTextColor } })}
                />
                <Slider
                  label="Écart le long de la flèche"
                  value={shapes.edgeEndTextGapAlong}
                  limits={SETTINGS_LIMITS['shapes.edgeEndTextGapAlong']}
                  format={(v) => `${v} px`}
                  onChange={(edgeEndTextGapAlong) => onChange({ shapes: { edgeEndTextGapAlong } })}
                />
                <Slider
                  label="Écart depuis le trait"
                  value={shapes.edgeEndTextGapAcross}
                  limits={SETTINGS_LIMITS['shapes.edgeEndTextGapAcross']}
                  format={(v) => `${v} px`}
                  onChange={(edgeEndTextGapAcross) => onChange({ shapes: { edgeEndTextGapAcross } })}
                />
                <p className="hint muted">
                  Textes créés au début ou à la fin d'une flèche : contre leur bout (à ces écarts de la forme et du
                  trait), du côté et avec l'alignement qui les éloignent de la forme.
                </p>
                <EdgeEndTextsPreview shapes={shapes} background={background} />
              </Subsection>
              <Subsection title="Flèches">
                <ColorField
                  label="Couleur du texte des flèches"
                  value={shapes.edgeFontColor}
                  onChange={(edgeFontColor) => onChange({ shapes: { edgeFontColor } })}
                />
                <p className="hint muted">Quand le style draw.io de la flèche ne précise pas de couleur de texte.</p>
                <Choice
                  label="Croisements des flèches"
                  value={shapes.edgeJumpStyle}
                  options={JUMP_OPTIONS}
                  onChange={(edgeJumpStyle) => onChange({ shapes: { edgeJumpStyle } })}
                />
                {shapes.edgeJumpStyle !== 'none' && (
                  <Slider
                    label="Taille du saut"
                    value={shapes.edgeJumpSize}
                    limits={SETTINGS_LIMITS['shapes.edgeJumpSize']}
                    format={(v) => `${v} pt`}
                    onChange={(edgeJumpSize) => onChange({ shapes: { edgeJumpSize } })}
                  />
                )}
                <p className="hint muted">
                  Quand ni la flèche (panneau de la flèche) ni sa page (panneau de la page) n’ont le leur. draw.io ne
                  connaît que celui de la flèche : une flèche par défaut n’y saute pas.
                </p>
                <Choice
                  label="Fond du texte des flèches"
                  value={shapes.edgeLabelBackdrop}
                  options={[
                    ['halo', 'Halo'],
                    ['solid', 'Fond uni'],
                    ['none', 'Aucun'],
                  ]}
                  onChange={(edgeLabelBackdrop) => onChange({ shapes: { edgeLabelBackdrop } })}
                />
                <Slider
                  label="Épaisseur du halo"
                  value={shapes.edgeLabelHaloWidth}
                  limits={SETTINGS_LIMITS['shapes.edgeLabelHaloWidth']}
                  format={(v) => `${v.toLocaleString('fr-FR')} px`}
                  disabled={shapes.edgeLabelBackdrop !== 'halo'}
                  onChange={(edgeLabelHaloWidth) => onChange({ shapes: { edgeLabelHaloWidth } })}
                />
                <Slider
                  label="Flou du halo"
                  value={shapes.edgeLabelHaloBlur}
                  limits={SETTINGS_LIMITS['shapes.edgeLabelHaloBlur']}
                  format={(v) => (v === 0 ? 'net' : `${v.toLocaleString('fr-FR')} px`)}
                  disabled={shapes.edgeLabelBackdrop !== 'halo'}
                  onChange={(edgeLabelHaloBlur) => onChange({ shapes: { edgeLabelHaloBlur } })}
                />
                <p className="hint muted">
                  Halo : un contour de la couleur du fond autour de chaque lettre, lisible sur le trait sans cacher la
                  flèche. Fond uni : un rectangle de la couleur du fond. Une couleur de fond précisée dans le style
                  draw.io l'emporte.
                </p>
                <EdgeLabelPreview shapes={shapes} background={background} />
              </Subsection>
              <Subsection title="Flèches coupées">
                <Slider
                  label="Longueur visible d’un tronçon"
                  value={shapes.edgeSplitLength}
                  limits={SETTINGS_LIMITS['shapes.edgeSplitLength']}
                  format={(v) => `${v} px`}
                  onChange={(edgeSplitLength) => onChange({ shapes: { edgeSplitLength } })}
                />
                <Slider
                  label="Longueur du fondu"
                  value={shapes.edgeSplitFade}
                  limits={SETTINGS_LIMITS['shapes.edgeSplitFade']}
                  format={(v) => (v === 0 ? 'sans' : `${v} px`)}
                  onChange={(edgeSplitFade) => onChange({ shapes: { edgeSplitFade } })}
                />
                <Slider
                  label="Taille du texte de renvoi"
                  value={shapes.edgeSplitLabelSize}
                  limits={SETTINGS_LIMITS['shapes.edgeSplitLabelSize']}
                  format={(v) => `${v} pt`}
                  onChange={(edgeSplitLabelSize) => onChange({ shapes: { edgeSplitLabelSize } })}
                />
                <Slider
                  label="Marge du cadre de renvoi"
                  value={shapes.edgeSplitLabelPadding}
                  limits={SETTINGS_LIMITS['shapes.edgeSplitLabelPadding']}
                  format={(v) => `${v} px`}
                  onChange={(edgeSplitLabelPadding) => onChange({ shapes: { edgeSplitLabelPadding } })}
                />
                <p className="hint muted">
                  Une flèche coupée (case « Couper la flèche » de son panneau) ne montre qu’un tronçon au départ et un à
                  l’arrivée. Le fondu est compris dans la longueur visible ; un tronçon qui porte un texte de renvoi
                  s’arrête net sur son cadre.
                </p>
                <SplitEdgePreview shapes={shapes} background={background} />
              </Subsection>
              <Subsection title="Formes non supportées">
                <ColorField
                  label="Fond du placeholder"
                  value={shapes.placeholderFill}
                  onChange={(placeholderFill) => onChange({ shapes: { placeholderFill } })}
                />
                <ColorField
                  label="Bordure du placeholder"
                  value={shapes.placeholderStroke}
                  onChange={(placeholderStroke) => onChange({ shapes: { placeholderStroke } })}
                />
                <PlaceholderPreview shapes={shapes} background={background} />
              </Subsection>
            </Section>

            <Section title="Modes">
              {(plugins?.modes.list() ?? [])
                .filter((mode) => (mode.settings ?? []).length > 0)
                .map((mode) => (
                  <Subsection key={mode.id} title={mode.shortName ?? mode.name}>
                    <PluginSettingFields
                      settings={mode.settings!}
                      values={plugins!.modes.values(mode.id, settings.modes[mode.id])}
                      onChange={(key, value) => onChange({ modes: { [mode.id]: { [key]: value } } })}
                    />
                  </Subsection>
                ))}
            </Section>

            <Section title="Effets">
              {(plugins?.effects.list() ?? [])
                .filter((effect) => (effect.settings ?? []).length > 0)
                .map((effect) => (
                  <Subsection key={effect.id} title={effect.name}>
                    <PluginSettingFields
                      settings={effect.settings!}
                      values={plugins!.effects.values(effect.id, settings.effects[effect.id])}
                      onChange={(key, value) => onChange({ effects: { [effect.id]: { [key]: value } } })}
                    />
                    <p className="hint muted">{effect.description}</p>
                  </Subsection>
                ))}
            </Section>

            <Section title="Édition">
              <Subsection title="Clic">
                <Slider
                  label="Tolérance de clic sur une flèche"
                  value={edit.edgePickTolerance}
                  limits={SETTINGS_LIMITS['edit.edgePickTolerance']}
                  format={(v) => `${v} px`}
                  onChange={(edgePickTolerance) => onChange({ edit: { edgePickTolerance } })}
                />
                <Slider
                  label="Tolérance de clic sur une poignée"
                  value={edit.handlePickTolerance}
                  limits={SETTINGS_LIMITS['edit.handlePickTolerance']}
                  format={(v) => `${v} px`}
                  onChange={(handlePickTolerance) => onChange({ edit: { handlePickTolerance } })}
                />
                <Slider
                  label="Retrait d’un point de flèche remis dans l’alignement"
                  value={edit.edgePointAlignTolerance}
                  limits={SETTINGS_LIMITS['edit.edgePointAlignTolerance']}
                  format={(v) => (v === 0 ? 'jamais' : `à ${v} px`)}
                  onChange={(edgePointAlignTolerance) => onChange({ edit: { edgePointAlignTolerance } })}
                />
              </Subsection>
              <Subsection title="Poignées et redimensionnement">
                <Slider
                  label="Taille des poignées"
                  value={edit.handleSize}
                  limits={SETTINGS_LIMITS['edit.handleSize']}
                  format={(v) => `${v * 2} px`}
                  onChange={(handleSize) => onChange({ edit: { handleSize } })}
                />
                <Slider
                  label="Taille minimale d’une forme"
                  value={edit.minShapeSize}
                  limits={SETTINGS_LIMITS['edit.minShapeSize']}
                  format={(v) => `${v} px`}
                  onChange={(minShapeSize) => onChange({ edit: { minShapeSize } })}
                />
                <Slider
                  label="Écart des poignées de connexion"
                  value={edit.connectHandleOffset}
                  limits={SETTINGS_LIMITS['edit.connectHandleOffset']}
                  format={(v) => `${v} px`}
                  onChange={(connectHandleOffset) => onChange({ edit: { connectHandleOffset } })}
                />
                <Slider
                  label="Masquer les poignées du milieu sous"
                  value={edit.middleHandleMinSpan}
                  limits={SETTINGS_LIMITS['edit.middleHandleMinSpan']}
                  format={(v) => (v === 0 ? 'jamais' : `${v} px`)}
                  onChange={(middleHandleMinSpan) => onChange({ edit: { middleHandleMinSpan } })}
                />
              </Subsection>
              <Subsection title="Annuler, coller">
                <Slider
                  label="Étapes d’annulation gardées"
                  value={edit.undoLimit}
                  limits={SETTINGS_LIMITS['edit.undoLimit']}
                  format={(v) => `${v} px`}
                  onChange={(undoLimit) => onChange({ edit: { undoLimit } })}
                />
                <Slider
                  label="Décalage d’un collage sans grille"
                  value={edit.pasteOffset}
                  limits={SETTINGS_LIMITS['edit.pasteOffset']}
                  format={(v) => `${v} px`}
                  onChange={(pasteOffset) => onChange({ edit: { pasteOffset } })}
                />
                <p className="hint muted">
                  Coller et dupliquer décalent d’un pas de grille ; sur une page sans grille, de ce décalage.
                </p>
              </Subsection>
              <Subsection title="Déplacement au clavier">
                <Slider
                  label="Pas d’une flèche"
                  value={edit.nudgeStep}
                  limits={SETTINGS_LIMITS['edit.nudgeStep']}
                  format={(v) => `${v} px`}
                  onChange={(nudgeStep) => onChange({ edit: { nudgeStep } })}
                />
                <Slider
                  label="Pas avec Maj"
                  value={edit.nudgeCoarseStep}
                  limits={SETTINGS_LIMITS['edit.nudgeCoarseStep']}
                  format={(v) => (v === 0 ? 'grille' : `${v} px`)}
                  onChange={(nudgeCoarseStep) => onChange({ edit: { nudgeCoarseStep } })}
                />
                <p className="hint muted">
                  Les flèches du clavier déplacent la sélection ; avec Maj, d’un pas plus grand (à 0, un pas de grille,
                  calé sur la grille).
                </p>
              </Subsection>
            </Section>

            <Section title="Sauvegarde">
              <Toggle
                label="Sauvegarde automatique"
                checked={save.autosave}
                onChange={(autosave) => onChange({ save: { autosave } })}
              />
              <Slider
                label="Délai après la dernière modification"
                value={save.delayMs}
                limits={SETTINGS_LIMITS['save.delayMs']}
                format={ms}
                disabled={!save.autosave}
                onChange={(delayMs) => onChange({ save: { delayMs } })}
              />
              <p className="hint muted">
                {desktop
                  ? 'Le fichier est réécrit sur le disque. Un exemple est gardé dans la bibliothèque ; « Enregistrer sous » l’enregistre comme fichier.'
                  : 'Le fichier est enregistré dans la bibliothèque du navigateur ; ouvert depuis le disque (Chrome, Edge), il y est aussi réécrit, sinon « Enregistrer sous » le télécharge en plus.'}
              </p>
              <Slider
                label="Mémoriser la position de consultation (page, vue) après"
                value={save.viewStateDelayMs}
                limits={SETTINGS_LIMITS['save.viewStateDelayMs']}
                format={ms}
                onChange={(viewStateDelayMs) => onChange({ save: { viewStateDelayMs } })}
              />
              <Slider
                label="Fichiers récents listés à l’accueil"
                value={save.recentLimit}
                limits={SETTINGS_LIMITS['save.recentLimit']}
                format={(v) => `${v} px`}
                onChange={(recentLimit) => onChange({ save: { recentLimit } })}
              />
            </Section>

            <Section title="Raccourcis clavier">
              {(Object.keys(SHORTCUT_LABELS) as Array<keyof Shortcuts>).map((action) => (
                <ShortcutField
                  key={action}
                  label={SHORTCUT_LABELS[action]}
                  value={controls.shortcuts[action]}
                  taken={Object.entries(controls.shortcuts)
                    .filter(([other]) => other !== action)
                    .map(([, key]) => key.toLowerCase())}
                  onChange={(key) => onChange({ controls: { shortcuts: { [action]: key } } })}
                />
              ))}
              <p className="hint muted">
                Le déplacement (ZQSD / WASD, flèches), la rotation (A / E) et Espace ne sont pas attribuables. Remonter
                à la page parente : Alt+↑.
              </p>
              <Choice
                label="Sélection multiple : touche + clic"
                value={controls.multiSelectKey}
                options={(Object.keys(MULTI_SELECT_LABELS) as MultiSelectKey[]).map((key) => [
                  key,
                  MULTI_SELECT_LABELS[key],
                ])}
                onChange={(multiSelectKey) => onChange({ controls: { multiSelectKey } })}
              />
              <p className="hint muted">
                Maintenir la touche en cliquant ajoute l’élément à la sélection, ou l’en retire. Glisser une forme
                sélectionnée déplace toute la sélection.
              </p>
              <Choice
                label="Suivre un lien : touche"
                value={controls.followLinkKey}
                options={(Object.keys(FOLLOW_LINK_LABELS) as FollowLinkKey[]).map((key) => [
                  key,
                  FOLLOW_LINK_LABELS[key],
                ])}
                onChange={(followLinkKey) => onChange({ controls: { followLinkKey } })}
              />
              <Choice
                label="Suivre un lien : touche +"
                value={controls.followLinkKey === 'none' ? 'doubleClick' : controls.followLinkGesture}
                options={(Object.keys(FOLLOW_LINK_GESTURE_LABELS) as FollowLinkGesture[]).map((gesture) => [
                  gesture,
                  FOLLOW_LINK_GESTURE_LABELS[gesture],
                ])}
                disabled={controls.followLinkKey === 'none'}
                onChange={(followLinkGesture) => onChange({ controls: { followLinkGesture } })}
              />
              <p className="hint muted">
                Maintenir la touche fait ressortir les zones liées (« Mode navigation » en bas à droite). Avec Espace,
                glisser déplace toujours la vue : seul un clic sans glisser suit le lien. Sans touche, le double-clic
                sur une forme liée modifie son texte. Dans la vue graphe, le double-clic seul plonge dans la page.
              </p>
            </Section>

            <Section title="Accessibilité">
              <Choice
                label="Réduire les animations"
                value={accessibility.reducedMotion}
                options={[
                  ['system', 'Comme le système'],
                  ['always', 'Toujours'],
                  ['never', 'Jamais'],
                ]}
                onChange={(reducedMotion) => onChange({ accessibility: { reducedMotion } })}
              />
              <p className="hint muted">
                Système : {systemReduced ? 'animations réduites demandées' : 'animations normales'}. Réduites =
                transitions, bascule iso, vue globale et glissade instantanées.
              </p>
            </Section>

            <Section title="Diagnostics">
              <Toggle
                label="Bouton « Diagnostics » (erreurs, non supportés, avertissements)"
                checked={debug.showUnsupportedPanel}
                onChange={(showUnsupportedPanel) => onChange({ debug: { showUnsupportedPanel } })}
              />
            </Section>
          </div>
        </div>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Recherche

/** Texte comparable : minuscules, sans accents ni apostrophes typographiques. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .trim();
}

/**
 * Masque les sections dont le texte ne contient pas la recherche. Dans une section dont le titre
 * ne correspond pas, seules les sous-sections qui correspondent restent (avec le reste de la
 * section si lui-même correspond). Renvoie vrai si au moins une section reste affichée.
 */
function filterSections(root: HTMLElement, query: string): boolean {
  const needle = normalizeSearch(query);
  const matches = (element: Element | null) => !!element && normalizeSearch(searchText(element)).includes(needle);
  let any = false;
  for (const section of sectionsOf(root)) {
    const subsections = subsectionsOf(section);
    // L'aperçu d'une section suit la section, son texte (dessin) n'est pas cherché.
    const loose = looseOf(section).filter((child) => !isSectionPreview(child));
    const whole = !needle || matches(section.querySelector(':scope > h3'));
    const looseMatch = loose.some((child) => matches(child));
    let shown = whole || looseMatch;
    for (const subsection of subsections) {
      const visible = whole || matches(subsection);
      subsection.hidden = !visible;
      shown ||= visible;
      // Groupes : tous si la section ou le titre de la sous-section correspond, sinon ceux qui correspondent.
      const all = whole || matches(subsection.querySelector(':scope > h4'));
      const inner = looseOf(subsection);
      const innerMatch = inner.some((child) => matches(child));
      for (const group of groupsOf(subsection)) group.hidden = !(all || matches(group));
      if (groupsOf(subsection).length > 0) for (const child of inner) child.hidden = !(all || innerMatch);
    }
    for (const child of loose) child.hidden = !(whole || looseMatch);
    for (const child of looseOf(section).filter(isSectionPreview)) child.hidden = !shown;
    section.hidden = !shown;
    any ||= shown;
  }
  return any;
}

/** Texte cherché d'un élément : sans celui des aperçus (sujets 320, 321), qui ne sont que des dessins. */
function searchText(element: Element): string {
  if (!element.querySelector('.settings-preview')) return element.textContent ?? '';
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('.settings-preview').forEach((preview) => preview.remove());
  return copy.textContent ?? '';
}

const sectionsOf = (root: HTMLElement | null) => [
  ...(root?.querySelectorAll<HTMLElement>(':scope > .settings-section') ?? []),
];
const subsectionsOf = (section: HTMLElement | undefined) => [
  ...(section?.querySelectorAll<HTMLElement>(':scope > .settings-subsection') ?? []),
];
const groupsOf = (subsection: HTMLElement | undefined) => [
  ...(subsection?.querySelectorAll<HTMLElement>(':scope > .settings-subsubsection') ?? []),
];
/**
 * Contenu d'une section (ou d'une sous-section) hors sous-sections (ou groupes) et titre : réglages posés directement
 * dedans.
 */
const looseOf = (parent: HTMLElement) =>
  [...parent.children].filter(
    (child) =>
      !child.classList.contains('settings-subsection') &&
      !child.classList.contains('settings-subsubsection') &&
      child.tagName !== 'H3' &&
      child.tagName !== 'H4',
  ) as HTMLElement[];

/** Aperçu commun aux sous-sections d'une section (sujet 320), posé en bas de la section. */
function SectionPreview({ children }: { children: ReactNode }) {
  return <div className="settings-section-preview">{children}</div>;
}

const isSectionPreview = (element: HTMLElement) => element.classList.contains('settings-section-preview');

/** N'affiche que le nœud choisi : la section entière, ou une seule de ses sous-sections. Vrai s'il existe. */
function showNode(root: HTMLElement, node: SettingsNode): boolean {
  let found = false;
  sectionsOf(root).forEach((section, i) => {
    const subsections = subsectionsOf(section);
    const visible =
      i === node.section &&
      (node.subsection === undefined ||
        (node.subsection < subsections.length &&
          (node.group === undefined || node.group < groupsOf(subsections[node.subsection]).length)));
    section.hidden = !visible;
    found ||= visible;
    subsections.forEach((subsection, j) => {
      subsection.hidden = node.subsection !== undefined && j !== node.subsection;
      // Sous-sous-sections : chacune sur sa page seulement ; la page de leur sous-section n'a que ses propres réglages.
      const chosen = j === node.subsection && node.group !== undefined;
      groupsOf(subsection).forEach((group, k) => {
        group.hidden = !chosen || k !== node.group;
      });
      if (groupsOf(subsection).length > 0) for (const child of looseOf(subsection)) child.hidden = chosen;
    });
    // L'aperçu de la section (sujet 320) reste sous chacune de ses sous-sections.
    for (const child of looseOf(section)) child.hidden = node.subsection !== undefined && !isSectionPreview(child);
  });
  return found;
}

/** Arbre des catégories d'après les titres affichés ; avec une recherche, les nœuds masqués par elle. */
function readTree(root: HTMLElement, searching: boolean): TreeSection[] {
  const title = (element: Element | null) => element?.textContent?.trim() ?? '';
  return sectionsOf(root).map((section) => ({
    title: title(section.querySelector(':scope > h3')),
    shown: !searching || !section.hidden,
    subsections: subsectionsOf(section).map((subsection) => ({
      title: title(subsection.querySelector(':scope > h4')),
      shown: !searching || !subsection.hidden,
      groups: groupsOf(subsection).map((group) => ({
        title: title(group.querySelector(':scope > h5')),
        shown: !searching || !group.hidden,
      })),
    })),
  }));
}

/** Ligne de l'arbre des catégories : flèche pour déplier (si le nœud a des enfants) et titre à choisir. */
function TreeRow({
  title,
  selected,
  expandable = false,
  expanded = false,
  searching,
  onToggle,
  onChoose,
}: {
  title: string;
  selected: boolean;
  expandable?: boolean;
  expanded?: boolean;
  searching: boolean;
  onToggle?: () => void;
  onChoose: () => void;
}) {
  return (
    <div className={selected ? 'settings-tree-row selected' : 'settings-tree-row'}>
      {expandable ? (
        <button
          type="button"
          className="settings-tree-toggle"
          aria-expanded={expanded}
          aria-label={expanded ? 'Replier' : 'Déplier'}
          disabled={searching}
          onClick={onToggle}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>
      ) : (
        <span className="settings-tree-toggle" />
      )}
      <button type="button" className="settings-tree-label" aria-current={selected} onClick={onChoose}>
        {title}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Champs

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={disabled ? 'field toggle disabled' : 'field toggle'}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

/** Adresse saisie librement : validée à Entrée ou en quittant le champ, Échap annule (refusée si pas http(s)). */
function UrlField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={disabled ? 'field disabled' : 'field'}>
      <span>{label}</span>
      <input
        key={value}
        type="url"
        className="url-input"
        defaultValue={value}
        placeholder="http://localhost:8080"
        disabled={disabled}
        spellCheck={false}
        onBlur={(event) => {
          const next = event.target.value.trim();
          if (next !== value) onChange(next);
          // Adresse refusée : le champ reprend la valeur gardée.
          event.target.value = value;
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.value = value;
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

/** Choix par boutons, en texte (`[valeur, nom]`) ou en icônes (`ChoiceOption`, nom en infobulle). */
function Choice<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<[T, string] | ChoiceOption<T>>;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className={disabled ? 'field disabled' : 'field'}>
      <span className="field-row">{label}</span>
      <ChoiceGroup
        className="choice"
        label={label}
        value={value}
        options={options.map((option) => (Array.isArray(option) ? { value: option[0], label: option[1] } : option))}
        disabled={disabled}
        onChange={(next) => next && onChange(next)}
      />
    </div>
  );
}

/** Capture d'une touche : cliquer, puis appuyer sur la nouvelle touche (Échap annule). */
function ShortcutField({
  label,
  value,
  taken,
  onChange,
}: {
  label: string;
  value: string;
  taken: string[];
  onChange: (key: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      // Capture : la touche ne doit pas aussi déclencher une action de la vue.
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        setListening(false);
        return;
      }
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) return;
      if (RESERVED_CODES.includes(event.code)) {
        setProblem('Touche réservée au déplacement.');
        return;
      }
      if (taken.includes(event.key.toLowerCase())) {
        setProblem('Déjà utilisée par un autre raccourci.');
        return;
      }
      setProblem(undefined);
      setListening(false);
      onChange(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, taken, onChange]);

  return (
    <div className="field">
      <span className="field-row">
        <span>{label}</span>
        <button
          type="button"
          className={listening ? 'key-button listening' : 'key-button'}
          onClick={() => {
            setProblem(undefined);
            setListening((on) => !on);
          }}
          title="Cliquer, puis appuyer sur la nouvelle touche (Échap pour annuler)"
        >
          {listening ? 'Appuyez sur une touche…' : keyLabel(value)}
        </button>
      </span>
      {problem && <span className="hint error-text">{problem}</span>}
    </div>
  );
}

const KEY_NAMES: Record<string, string> = {
  Enter: 'Entrée',
  Backspace: 'Retour arrière',
  Escape: 'Échap',
  Tab: 'Tab',
  Delete: 'Suppr',
  Home: 'Début',
  End: 'Fin',
  PageUp: 'Page préc.',
  PageDown: 'Page suiv.',
};

export function keyLabel(key: string): string {
  return KEY_NAMES[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

function useSystemReducedMotion(): boolean {
  const [query] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)'));
  const [reduced, setReduced] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, [query]);
  return reduced;
}

/**
 * Réglages déclarés par un plugin, mode (ticket 283) ou effet (sujet 287), dans l'ordre : titre de groupe avant le
 * premier réglage d'un groupe, aide sous un réglage.
 */
function PluginSettingFields({
  settings,
  values,
  onChange,
}: {
  settings: PluginSetting[];
  values: PluginValues;
  onChange: (key: string, value: PluginValues[string]) => void;
}) {
  return settings.map((setting) => (
    <Fragment key={setting.key}>
      {setting.group && <h5 className="settings-group">{setting.group}</h5>}
      {setting.groupHint && <p className="hint muted">{setting.groupHint}</p>}
      {setting.type === 'number' ? (
        <Slider
          label={setting.label}
          value={values[setting.key] as number}
          limits={setting}
          format={(v) =>
            v === 0 && setting.zero
              ? setting.zero
              : setting.unit === '%'
                ? `${Math.round(v * 100)} %`
                : `${v.toLocaleString('fr-FR')} ${setting.unit ?? ''}`.trim()
          }
          onChange={(value) => onChange(setting.key, value)}
        />
      ) : setting.type === 'toggle' ? (
        <Toggle
          label={setting.label}
          checked={values[setting.key] as boolean}
          onChange={(value) => onChange(setting.key, value)}
        />
      ) : setting.type === 'choice' ? (
        <Choice
          label={setting.label}
          value={values[setting.key] as string}
          options={setting.options.map(({ value, label }) => [value, label])}
          onChange={(value) => onChange(setting.key, value)}
        />
      ) : setting.type === 'url' ? (
        <UrlField
          label={setting.label}
          value={values[setting.key] as string}
          disabled={setting.when !== undefined && values[setting.when.key] !== setting.when.value}
          onChange={(value) => onChange(setting.key, value)}
        />
      ) : (
        <ColorField
          label={setting.label}
          value={values[setting.key] as string}
          onChange={(value) => onChange(setting.key, value)}
        />
      )}
      {setting.hint && <p className="hint muted">{setting.hint}</p>}
    </Fragment>
  ));
}
