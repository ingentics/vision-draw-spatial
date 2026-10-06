/**
 * Raccourcis clavier configurables (SPEC §9.2), par **touche affichée** (`KeyboardEvent.key`,
 * insensible à la casse) : « M » est la touche M quelle que soit la disposition (AZERTY, QWERTY…).
 * Le déplacement, lui, reste par position physique (`code`) : ZQSD = WASD.
 */
export interface Shortcuts {
  /** Bascule 2D ↔ iso. */
  toggleViewMode: string;
  /** Bascule vers / depuis la vue 3D. */
  toggle3d: string;
  /** Vue graphe ↔ dernière page. */
  toggleGraph: string;
  /** Affiche / masque la mini-carte. */
  toggleMinimap: string;
  /** Aplatit / rétablit les volumes (iso, 3D). */
  toggleFlatten: string;
  /** Vue globale ↔ 1:1 (l'Entrée du pavé numérique donne aussi la touche « Enter »). */
  overview: string;
  /** Retour (Alt+← fonctionne en plus, comme dans un navigateur). */
  back: string;
  /**
   * Supprimer la sélection (Suppr fonctionne en plus). Prioritaire seulement s'il y a une sélection
   * supprimable : la même touche que Retour (Backspace, la touche « delete » du Mac) supprime la
   * sélection, sinon revient en arrière.
   */
  deleteSelection: string;
  /** Variante de placement de la flèche sélectionnée (ancrage manuel), une étape d'annulation par appui. */
  placementVariant: string;
  /** Éditer en place le commentaire affiché au survol, sinon celui de l'élément sélectionné (vide s'il n'en a pas). */
  editComment: string;
}

export const DEFAULT_SHORTCUTS: Shortcuts = {
  toggleViewMode: 'i',
  toggle3d: 'p',
  toggleGraph: 'g',
  toggleMinimap: 'm',
  toggleFlatten: 'v',
  overview: 'Enter',
  back: 'Backspace',
  deleteSelection: 'Backspace',
  placementVariant: 'f',
  editComment: 'c',
};

/** Positions physiques réservées au déplacement et au pan : non attribuables à un raccourci. */
export const RESERVED_CODES = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
  // Rotation (iso, 3D) : A / E en AZERTY = Q / E en QWERTY.
  'KeyQ',
  'KeyE',
];

/**
 * Action d'une touche, selon le contexte : `deleteSelection` d'abord s'il y a une sélection
 * supprimable (elle peut partager sa touche avec Retour), sinon le premier raccourci de la touche.
 */
export function resolveShortcut(
  key: string,
  shortcuts: Shortcuts,
  context: { canDelete: boolean },
): keyof Shortcuts | undefined {
  if (context.canDelete && shortcuts.deleteSelection.toLowerCase() === key.toLowerCase()) return 'deleteSelection';
  const action = shortcutAction(key, shortcuts);
  return action === 'deleteSelection' ? undefined : action;
}

/** Action d'un raccourci pour une touche (`KeyboardEvent.key`) ; undefined si aucune. */
export function shortcutAction(key: string, shortcuts: Shortcuts): keyof Shortcuts | undefined {
  const pressed = key.toLowerCase();
  return (Object.keys(shortcuts) as Array<keyof Shortcuts>).find(
    (action) => shortcuts[action].toLowerCase() === pressed,
  );
}

/** Raccourci d'ordre de dessin de draw.io (⌘ / Ctrl + Maj + F / B, Alt + Maj + F / B), sinon undefined. */
export function orderShortcut(event: KeyboardEvent): 'front' | 'back' | 'forward' | 'backward' | undefined {
  if (!event.shiftKey || (event.code !== 'KeyF' && event.code !== 'KeyB')) return undefined;
  const front = event.code === 'KeyF';
  const command = event.ctrlKey || event.metaKey;
  if (command && !event.altKey) return front ? 'front' : 'back';
  if (event.altKey && !command) return front ? 'forward' : 'backward';
  return undefined;
}
