import type { Point } from '../model/types';
import { dragGround, orbit, panByScreen, zoomAt } from './camera';
import type { CameraState, Viewport } from './camera';
import { hasMultiSelectKey } from './selection';
import type { MultiSelectKey } from './selection';

/**
 * Contrôles de navigation (SPEC §9.2). Les touches sont lues par position physique
 * (`KeyboardEvent.code`) : Z Q S D sur AZERTY et W A S D sur QWERTY sont les mêmes touches.
 */

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
}

export const DEFAULT_SHORTCUTS: Shortcuts = {
  toggleViewMode: 'i',
  toggle3d: 'p',
  toggleGraph: 'g',
  toggleMinimap: 'm',
  overview: 'Enter',
  back: 'Backspace',
  deleteSelection: 'Backspace',
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

export interface ControlSettings {
  /** Touches de déplacement : lettres (ZQSD / WASD selon le clavier), flèches, ou les deux. */
  moveKeys: 'letters' | 'arrows' | 'all';
  /** Vitesse de déplacement au clavier, en pixels écran par seconde. */
  moveSpeed: number;
  /** Sensibilité de la molette. */
  zoomSpeed: number;
  shortcuts: Shortcuts;
  /**
   * Glissade à l'arrêt d'un déplacement (clavier ou glisser) : constante de temps de la
   * décélération, en ms. Pas d'accélération au départ. 0 = arrêt net.
   */
  decelerationMs: number;
  /** Sensibilité de l'orbite au glisser clic droit (iso, 3D), en radians par pixel écran. */
  orbitSpeed: number;
  /** Touche qui, maintenue pendant un clic, ajoute l'élément à la sélection ou l'en retire. */
  multiSelectKey: MultiSelectKey;
}

export const DEFAULT_CONTROLS: ControlSettings = {
  moveKeys: 'all',
  moveSpeed: 600,
  zoomSpeed: 0.0015,
  decelerationMs: 80,
  orbitSpeed: 0.005,
  multiSelectKey: 'ctrl',
  shortcuts: DEFAULT_SHORTCUTS,
};

/** Vitesse en dessous de laquelle la glissade s'arrête (pixels écran par seconde). */
const STOP_SPEED = 8;
/** Fenêtre de mesure de la vitesse au relâchement d'un glisser. */
const RELEASE_WINDOW_MS = 80;
/** Vitesse maximale transmise par un glisser rapide. */
const MAX_RELEASE_SPEED = 3000;

/** Décélération exponentielle de la vitesse sur `dt` secondes. */
export function decelerate(velocity: Point, dt: number, decelerationMs: number): Point {
  if (decelerationMs <= 0) return { x: 0, y: 0 };
  const k = Math.exp(-(dt * 1000) / decelerationMs);
  const next = { x: velocity.x * k, y: velocity.y * k };
  return Math.hypot(next.x, next.y) < STOP_SPEED ? { x: 0, y: 0 } : next;
}

/**
 * Vitesse du pointeur au relâchement (pixels écran / s), d'après ses dernières positions.
 * Nulle si le pointeur était immobile juste avant de relâcher.
 */
export function releaseVelocity(samples: Array<{ t: number; p: Point }>, now: number): Point {
  const recent = samples.filter((s) => now - s.t <= RELEASE_WINDOW_MS);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last || last.t - first.t < 1) return { x: 0, y: 0 };
  const dt = (last.t - first.t) / 1000;
  const v = { x: (last.p.x - first.p.x) / dt, y: (last.p.y - first.p.y) / dt };
  const speed = Math.hypot(v.x, v.y);
  return speed > MAX_RELEASE_SPEED ? { x: (v.x / speed) * MAX_RELEASE_SPEED, y: (v.y / speed) * MAX_RELEASE_SPEED } : v;
}

const LETTER_KEYS: Record<string, Point> = {
  KeyW: { x: 0, y: -1 }, // Z sur AZERTY
  KeyA: { x: -1, y: 0 }, // Q sur AZERTY
  KeyS: { x: 0, y: 1 },
  KeyD: { x: 1, y: 0 },
};
const ARROW_KEYS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowDown: { x: 0, y: 1 },
  ArrowRight: { x: 1, y: 0 },
};

/** Direction de déplacement à l'écran pour un ensemble de touches enfoncées (vecteur normalisé ou nul). */
export function keyDirection(pressed: Iterable<string>, moveKeys: ControlSettings['moveKeys']): Point {
  const maps =
    moveKeys === 'letters' ? [LETTER_KEYS] : moveKeys === 'arrows' ? [ARROW_KEYS] : [LETTER_KEYS, ARROW_KEYS];
  let x = 0;
  let y = 0;
  for (const code of pressed) {
    for (const map of maps) {
      const d = map[code];
      if (d) {
        x += d.x;
        y += d.y;
      }
    }
  }
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}

/** Variation de zoom pour un événement molette (lignes / pages ramenées en pixels ; pincement trackpad amplifié). */
export function wheelZoomFactor(
  event: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey'>,
  zoomSpeed: number,
  viewportHeight: number,
): number {
  const pixels =
    event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * viewportHeight : event.deltaY;
  const speed = event.ctrlKey ? zoomSpeed * 10 : zoomSpeed;
  return Math.exp(-pixels * speed);
}

export interface CameraHost {
  getCameraState(): CameraState;
  setCameraState(state: CameraState): void;
  getViewport(): Viewport;
  /** Bascule vue globale ↔ 1:1, autour du point écran donné. */
  toggleOverview(screen?: Point): void;
  /**
   * Clic gauche simple (sans glisser) : sélection. `toggle` : la touche de sélection multiple est
   * enfoncée (ajouter l'élément à la sélection, ou l'en retirer).
   */
  click?(screen: Point, options: { toggle: boolean }): void;
  /** Double-clic gauche : entrer dans un lien. */
  doubleClick?(screen: Point): void;
  /** Survol (undefined quand le pointeur quitte le canvas). */
  hover?(screen: Point | undefined): void;
  /** Retour (Retour arrière, Alt+←). */
  back?(): void;
  /** Bascule vue 2D ↔ iso (touche I). */
  toggleViewMode?(): void;
  /** Bascule vers / depuis la vue 3D (touche P). */
  toggle3d?(): void;
  /** Affiche / masque la mini-carte (touche M). */
  toggleMinimap?(): void;
  /** Vue graphe ↔ dernière page (touche G). */
  toggleGraph?(): void;
  /**
   * Appui gauche (sans Espace) : vrai si un élément déplaçable est sous le pointeur ; le glisser
   * qui suit le déplace (`moveTo`, au-delà du seuil de clic), jusqu'au relâchement (`endMove`).
   */
  beginMove?(screen: Point): boolean;
  /** `snap` : aimanter à la grille (désactivé en maintenant Alt, comme dans draw.io). */
  moveTo?(screen: Point, options: { snap: boolean }): void;
  endMove?(): void;
  /** F2 : éditer le label de la sélection. */
  editSelection?(): void;
  /** Suppr (ou le raccourci `deleteSelection`) : supprimer la sélection. */
  deleteSelection?(): void;
  /** Y a-t-il une sélection supprimable (page modifiable) ? Décide entre supprimer et Retour. */
  canDeleteSelection?(): boolean;
  /** Échap : désélectionner. */
  escape?(): void;
}

/** Au-delà de ce déplacement (px), un appui-relâché n'est plus un clic. */
const CLICK_SLOP = 4;

type DragMode = 'pan' | 'move' | 'orbit';

export class CameraController {
  private settings: ControlSettings;
  private readonly pressed = new Set<string>();
  private spaceDown = false;
  /** `start` : point écran de départ du glisser. */
  private drag: { pointerId: number; mode: DragMode; last: Point; start: Point; moving?: boolean } | undefined;
  private frame = 0;
  private lastTick = 0;
  /** Vitesse de déplacement du contenu à l'écran (pixels / s), pour la glissade. */
  private velocity: Point = { x: 0, y: 0 };
  /** Dernières positions du glisser en cours, pour mesurer la vitesse au relâchement. */
  private samples: Array<{ t: number; p: Point }> = [];
  /** Dernière position du pointeur sur le canvas (pour la bascule 1:1 autour du curseur). */
  private hover: Point | undefined;
  /** Point d'appui du bouton gauche, pour distinguer un clic d'un glisser. */
  private pressPoint: Point | undefined;
  private suppressClick = false;
  /** Instant du dernier Ctrl+clic traité par le menu contextuel (pour ne pas le compter deux fois). */
  private ctrlClickAt = -Infinity;
  private enabled = true;

  constructor(
    private readonly element: HTMLElement,
    private readonly host: CameraHost,
    settings: Partial<ControlSettings> = {},
  ) {
    this.settings = { ...DEFAULT_CONTROLS, ...settings };
    // Rend le canvas focalisable, pour sortir le focus d'un champ (ex. liste de fichiers) au clic.
    if (element.tabIndex < 0) element.tabIndex = 0;
    element.style.touchAction = 'none';
    element.style.outline = 'none';

    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('pointerleave', this.onPointerLeave);
    element.addEventListener('contextmenu', this.onContextMenu);
    element.addEventListener('click', this.onClick);
    element.addEventListener('dblclick', this.onDoubleClick);
    // Empêche le défilement automatique du navigateur au clic molette.
    element.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  getSettings(): ControlSettings {
    return { ...this.settings };
  }

  setSettings(patch: Partial<ControlSettings>): void {
    this.settings = { ...this.settings, ...patch, shortcuts: { ...this.settings.shortcuts, ...patch.shortcuts } };
  }

  /** Ignore les entrées (ex. pendant une transition, SPEC §11.2). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.onBlur();
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    const el = this.element;
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    el.removeEventListener('contextmenu', this.onContextMenu);
    el.removeEventListener('click', this.onClick);
    el.removeEventListener('dblclick', this.onDoubleClick);
    el.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  // -------------------------------------------------------------------------
  // Souris

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.enabled) return;
    event.preventDefault();
    this.stopDrift();
    const viewport = this.host.getViewport();
    const factor = wheelZoomFactor(event, this.settings.zoomSpeed, viewport.height);
    this.host.setCameraState(zoomAt(this.host.getCameraState(), viewport, this.localPoint(event), factor));
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.element.focus({ preventScroll: true });
    if (event.button === 0) {
      this.pressPoint = this.localPoint(event);
      this.suppressClick = false;
    }
    if (!this.enabled || this.drag) return;
    let mode: DragMode | undefined;
    // Iso et 3D : le clic droit oriente la caméra (orbite), la molette enfoncée la déplace.
    // En 2D, jamais de rotation : le clic droit déplace.
    if (event.button === 2 && this.host.getCameraState().mode !== 'top') mode = 'orbit';
    else if (event.button === 1 || event.button === 2) mode = 'pan';
    else if (event.button === 0 && this.spaceDown) mode = 'pan';
    else if (event.button === 0 && this.host.beginMove?.(this.localPoint(event))) mode = 'move';
    if (!mode) return;

    event.preventDefault();
    try {
      // Continue de recevoir les mouvements hors du canvas pendant le glisser.
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // Pointeur inconnu du navigateur (ex. événement synthétique) : le glisser marche sans capture.
    }
    this.stopDrift();
    const start = this.localPoint(event);
    this.drag = { pointerId: event.pointerId, mode, last: start, start };
    this.samples = [{ t: event.timeStamp, p: start }];
    if (mode === 'pan') this.element.style.cursor = 'grabbing';
    else if (mode === 'orbit')
      this.element.style.cursor = this.host.getCameraState().mode === '3d' ? 'all-scroll' : 'ew-resize';
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.hover = this.localPoint(event);
    if (this.pressPoint && distance(this.pressPoint, this.hover) > CLICK_SLOP) this.suppressClick = true;
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      if (this.enabled && !this.drag) this.host.hover?.(this.hover);
      return;
    }
    const point = this.localPoint(event);
    if (drag.mode === 'move') {
      // Un appui-relâché sur place reste un clic (sélection) : on ne bouge qu'au-delà du seuil.
      if (!drag.moving && distance(drag.start, point) <= CLICK_SLOP) return;
      drag.moving = true;
      this.element.style.cursor = 'move';
      this.host.moveTo?.(point, { snap: !event.altKey });
      return;
    }
    const delta = { x: point.x - drag.last.x, y: point.y - drag.last.y };
    const previous = drag.last;
    drag.last = point;
    const state = this.host.getCameraState();
    if (drag.mode === 'orbit') {
      // C'est la caméra qui bouge, la page reste fixe : vers la droite, la caméra tourne vers la
      // droite autour du centre ; en 3D, vers le haut, elle monte (vers la vue d'aplomb), vers le
      // bas, elle descend vers l'horizon. L'iso garde l'élévation de ses réglages.
      const speed = this.settings.orbitSpeed;
      const tilt = state.mode === '3d' ? delta.y * speed : 0;
      this.host.setCameraState(orbit(state, delta.x * speed, tilt));
      return;
    }
    this.samples.push({ t: event.timeStamp, p: point });
    if (this.samples.length > 20) this.samples.shift();
    this.host.setCameraState(dragGround(state, this.host.getViewport(), previous, point));
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    if (this.element.hasPointerCapture(event.pointerId)) this.element.releasePointerCapture(event.pointerId);
    if (this.drag.mode === 'pan') {
      this.velocity = releaseVelocity(this.samples, event.timeStamp);
      this.startLoop();
    } else if (this.drag.mode === 'move') {
      this.host.endMove?.();
    }
    this.samples = [];
    this.drag = undefined;
    this.element.style.cursor = this.spaceDown ? 'grab' : '';
  };

  private readonly onPointerLeave = (): void => {
    this.hover = undefined;
    this.host.hover?.(undefined);
  };

  private readonly onClick = (event: MouseEvent): void => {
    const suppressed = this.suppressClick || this.spaceDown;
    this.pressPoint = undefined;
    this.suppressClick = false;
    // Déjà traité par le menu contextuel (Ctrl+clic sur Mac).
    if (event.timeStamp - this.ctrlClickAt < 500) return;
    if (!this.enabled || event.button !== 0 || suppressed) return;
    this.host.click?.(this.localPoint(event), { toggle: hasMultiSelectKey(event, this.settings.multiSelectKey) });
  };

  private readonly onDoubleClick = (event: MouseEvent): void => {
    if (!this.enabled || event.button !== 0 || this.spaceDown) return;
    event.preventDefault();
    this.host.doubleClick?.(this.localPoint(event));
  };

  /**
   * Pas de menu contextuel. Sur Mac, Ctrl+clic gauche ouvre le menu au lieu de produire un clic :
   * c'est alors un clic avec Ctrl (sélection multiple si c'est la touche choisie).
   */
  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    if (event.button !== 0 || !event.ctrlKey || this.settings.multiSelectKey !== 'ctrl') return;
    const suppressed = this.suppressClick || this.spaceDown;
    this.pressPoint = undefined;
    this.suppressClick = false;
    if (!this.enabled || suppressed) return;
    this.ctrlClickAt = event.timeStamp;
    this.host.click?.(this.localPoint(event), { toggle: true });
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button === 1) event.preventDefault();
  };

  // -------------------------------------------------------------------------
  // Clavier

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || isEditable(event.target)) return;
    // Une touche de déplacement reste une touche de déplacement, même si elle porte une lettre de raccourci.
    const action = isMoveKey(event.code, this.settings.moveKeys)
      ? undefined
      : resolveShortcut(event.key, this.settings.shortcuts, {
          canDelete: this.host.canDeleteSelection?.() ?? false,
        });
    if (action === 'deleteSelection' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (!event.repeat) this.host.deleteSelection?.();
      return;
    }
    // Retour (SPEC §9.2) : son raccourci, ou Alt+← comme dans un navigateur.
    const isBack =
      (action === 'back' && !event.ctrlKey && !event.metaKey && !event.altKey) ||
      (event.code === 'ArrowLeft' && event.altKey && !event.ctrlKey && !event.metaKey);
    if (isBack) {
      event.preventDefault();
      if (!event.repeat) this.host.back?.();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Édition (touches fixes) : F2 = texte, Suppr = supprimer, Échap = désélectionner.
    if (event.key === 'F2' || event.key === 'Delete' || event.key === 'Escape') {
      if (event.repeat) return;
      event.preventDefault();
      if (event.key === 'F2') this.host.editSelection?.();
      else if (event.key === 'Delete') this.host.deleteSelection?.();
      else this.host.escape?.();
      return;
    }
    if (action === 'overview') {
      // Sur un bouton, Entrée (ou Espace) l'active : on ne détourne pas la touche.
      if (event.repeat || (event.target instanceof HTMLElement && event.target.tagName === 'BUTTON')) return;
      event.preventDefault();
      this.stopDrift();
      this.host.toggleOverview(this.hover);
      return;
    }
    if (
      action === 'toggleViewMode' ||
      action === 'toggle3d' ||
      action === 'toggleGraph' ||
      action === 'toggleMinimap'
    ) {
      event.preventDefault();
      if (event.repeat) return;
      if (action === 'toggleViewMode') this.host.toggleViewMode?.();
      else if (action === 'toggle3d') this.host.toggle3d?.();
      else if (action === 'toggleGraph') this.host.toggleGraph?.();
      else this.host.toggleMinimap?.();
      return;
    }
    if (event.code === 'Space') {
      this.spaceDown = true;
      if (!this.drag) this.element.style.cursor = 'grab';
      event.preventDefault();
      return;
    }
    if (!isMoveKey(event.code, this.settings.moveKeys)) return;
    event.preventDefault();
    this.pressed.add(event.code);
    this.startLoop();
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      this.spaceDown = false;
      if (!this.drag) this.element.style.cursor = '';
    }
    this.pressed.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.pressed.clear();
    this.stopDrift();
    this.spaceDown = false;
    this.element.style.cursor = '';
  };

  private startLoop(): void {
    if (this.frame) return;
    this.lastTick = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private stopDrift(): void {
    this.velocity = { x: 0, y: 0 };
  }

  /**
   * Déplacement continu : vitesse pleine tant que des touches sont enfoncées (pas d'accélération),
   * puis courte décélération quand on relâche. Indépendant du framerate.
   */
  private readonly tick = (now: number): void => {
    const dt = Math.min((now - this.lastTick) / 1000, 0.1);
    this.lastTick = now;
    const direction = keyDirection(this.pressed, this.settings.moveKeys);
    if (direction.x !== 0 || direction.y !== 0) {
      // Se déplacer vers le haut = le contenu descend.
      this.velocity = { x: -direction.x * this.settings.moveSpeed, y: -direction.y * this.settings.moveSpeed };
    } else {
      this.velocity = decelerate(this.velocity, dt, this.settings.decelerationMs);
    }
    if (this.velocity.x === 0 && this.velocity.y === 0) {
      this.frame = 0;
      return;
    }
    this.host.setCameraState(
      panByScreen(this.host.getCameraState(), { x: this.velocity.x * dt, y: this.velocity.y * dt }),
    );
    this.frame = requestAnimationFrame(this.tick);
  };

  private localPoint(event: MouseEvent): Point {
    const rect = this.element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
}

function isMoveKey(code: string, moveKeys: ControlSettings['moveKeys']): boolean {
  const d = keyDirection([code], moveKeys);
  return d.x !== 0 || d.y !== 0;
}

/** Saisie en cours dans un champ : les touches lui appartiennent. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
