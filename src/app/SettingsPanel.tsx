import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RESERVED_CODES } from '../engine/interaction/controls';
import type { Shortcuts } from '../engine/interaction/controls';
import type { MultiSelectKey } from '../engine/interaction/selection';
import { SETTINGS_LIMITS } from '../engine/settings';
import type { Settings, SettingsPatch } from '../engine/settings';
import { desktop } from './desktop';
import { IsoIcon, IsoSettings } from './IsoSettings';

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

const SHORTCUT_LABELS: Record<keyof Shortcuts, string> = {
  toggleViewMode: 'Basculer 2D ↔ iso',
  toggle3d: 'Basculer vers / depuis la 3D',
  toggleGraph: 'Vue graphe ↔ dernière page',
  toggleMinimap: 'Afficher / masquer la mini-carte',
  overview: 'Vue globale ↔ 1:1',
  back: 'Retour (Alt+← aussi)',
  deleteSelection: 'Supprimer la sélection (Suppr aussi)',
};

/**
 * Raccourcis qui peuvent partager une touche : supprimer agit seulement s'il y a une sélection,
 * sinon la touche garde son autre action (Backspace : supprimer, ou Retour).
 */
const SHARED_KEYS: Array<[keyof Shortcuts, keyof Shortcuts]> = [['deleteSelection', 'back']];
const canShare = (a: keyof Shortcuts, b: keyof Shortcuts) =>
  SHARED_KEYS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/**
 * Panneau de paramètres (SPEC §13) : tous les réglages de l'application, par section et
 * sous-section ; tout s'applique immédiatement et est mémorisé. La recherche en haut ne garde
 * que les sections (ou sous-sections) dont le texte contient la recherche.
 */
export function SettingsPanel({ settings, onChange, onReset, onResetOrientation, onClose }: SettingsPanelProps) {
  const { controls, view, camera, background, transition, preload, minimap, selection, accessibility, debug, save } =
    settings;
  const { shapes, graph, edit } = settings;
  const systemReduced = useSystemReducedMotion();
  const [query, setQuery] = useState('');
  const body = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(false);

  // Filtrage sur le texte affiché (titres, libellés, choix, aides) : rien à maintenir à la main.
  useLayoutEffect(() => {
    if (body.current) setEmpty(!filterSections(body.current, query));
  }, [query, settings]);

  const percent = (v: number) => `${Math.round(v * 100)} %`;
  const ms = (v: number) => (v === 0 ? 'instantané' : v < 1000 ? `${v} ms` : `${(v / 1000).toLocaleString('fr-FR')} s`);

  return (
    <aside className="side-panel settings-panel" aria-label="Paramètres">
      <header className="side-panel-header">
        <h2>Paramètres</h2>
        <button type="button" className="button" onClick={onReset} title="Revenir aux valeurs par défaut">
          Réinitialiser
        </button>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      </header>
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
              event.stopPropagation();
              setQuery('');
            }
          }}
        />
      </div>

      <div className="side-panel-body" ref={body}>
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
              format={(v) => `${v}`}
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
        </Section>

        <Section title="Formes et flèches">
          <Subsection title="Flèches">
            <ColorField
              label="Couleur du texte des flèches"
              value={shapes.edgeFontColor}
              onChange={(edgeFontColor) => onChange({ shapes: { edgeFontColor } })}
            />
            <p className="hint muted">Quand le style draw.io de la flèche ne précise pas de couleur de texte.</p>
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
          </Subsection>
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
              ? 'Le fichier est réécrit sur le disque. Un exemple est gardé dans la bibliothèque ; « Sauvegarder » l’enregistre comme fichier.'
              : 'Le fichier est enregistré dans la bibliothèque du navigateur ; « Sauvegarder » le télécharge en plus.'}
          </p>
          <Slider
            label="Mémoriser la position de consultation (page, vue) après"
            value={save.viewStateDelayMs}
            limits={SETTINGS_LIMITS['save.viewStateDelayMs']}
            format={ms}
            onChange={(viewStateDelayMs) => onChange({ save: { viewStateDelayMs } })}
          />
        </Section>

        <Section title="Raccourcis clavier">
          {(Object.keys(SHORTCUT_LABELS) as Array<keyof Shortcuts>).map((action) => (
            <ShortcutField
              key={action}
              label={SHORTCUT_LABELS[action]}
              value={controls.shortcuts[action]}
              taken={Object.entries(controls.shortcuts)
                .filter(([other]) => other !== action && !canShare(action, other as keyof Shortcuts))
                .map(([, key]) => key.toLowerCase())}
              onChange={(key) => onChange({ controls: { shortcuts: { [action]: key } } })}
            />
          ))}
          <p className="hint muted">
            Le déplacement (ZQSD / WASD, flèches), la rotation (A / E) et Espace ne sont pas attribuables. Supprimer et
            Retour peuvent partager une touche : elle supprime s’il y a une sélection, sinon elle revient en arrière.
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
            Système : {systemReduced ? 'animations réduites demandées' : 'animations normales'}. Réduites = transitions,
            bascule iso, vue globale et glissade instantanées.
          </p>
        </Section>

        <Section title="Diagnostics">
          <Toggle
            label="Bouton « Diagnostics » (styles non supportés)"
            checked={debug.showUnsupportedPanel}
            onChange={(showUnsupportedPanel) => onChange({ debug: { showUnsupportedPanel } })}
          />
        </Section>
      </div>
    </aside>
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
  const matches = (element: Element | null) => !!element && normalizeSearch(element.textContent ?? '').includes(needle);
  let any = false;
  for (const section of root.querySelectorAll<HTMLElement>(':scope > .settings-section')) {
    const subsections = [...section.querySelectorAll<HTMLElement>(':scope > .settings-subsection')];
    const loose = [...section.children].filter(
      (child) => !child.classList.contains('settings-subsection') && child.tagName !== 'H3',
    ) as HTMLElement[];
    const whole = !needle || matches(section.querySelector(':scope > h3'));
    const looseMatch = loose.some((child) => matches(child));
    let shown = whole || looseMatch;
    for (const subsection of subsections) {
      const visible = whole || matches(subsection);
      subsection.hidden = !visible;
      shown ||= visible;
    }
    for (const child of loose) child.hidden = !(whole || looseMatch);
    section.hidden = !shown;
    any ||= shown;
  }
  return any;
}

// ---------------------------------------------------------------------------
// Champs

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Subsection({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="settings-subsection">
      <h4>{title}</h4>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  limits,
  format,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number; step: number };
  format: (value: number) => string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={disabled ? 'field disabled' : 'field'}>
      <span className="field-row">
        <span>{label}</span>
        <span className="field-value">{format(value)}</span>
      </span>
      <input
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ColorField({
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
    <label className={disabled ? 'field color-field disabled' : 'field color-field'}>
      <span>{label}</span>
      <span className="field-row">
        <span className="field-value">{value}</span>
        <input type="color" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

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

function Choice<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className={disabled ? 'field disabled' : 'field'}>
      <span className="field-row">{label}</span>
      <div className="button-group choice" role="radiogroup" aria-label={label}>
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            role="radio"
            className="group-button"
            aria-checked={value === option}
            aria-pressed={value === option}
            disabled={disabled}
            onClick={() => onChange(option)}
          >
            {text}
          </button>
        ))}
      </div>
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
