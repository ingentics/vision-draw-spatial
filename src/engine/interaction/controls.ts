import type { Point, Rect } from '../model/types';
import { dragGround, orbit, panByScreen, zoomAt } from './camera';
import type { CameraState, Viewport } from './camera';
import { rectBetween } from './marquee';
import { followLinkGesture, hasFollowLinkKey, hasMultiSelectKey, isModifierKeyEvent } from './selection';
import type { FollowLinkGesture, FollowLinkKey, MultiSelectKey } from './selection';

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
 * Sens de rotation au clavier, par position physique : la touche à gauche de Z / W (A en AZERTY,
 * Q en QWERTY) fait pivoter la vue vers la gauche, E vers la droite ; les deux s'annulent. Le signe
 * est celui de `CameraState.rotation`.
 */
export function keyRotation(pressed: Iterable<string>): number {
  const keys = new Set(pressed);
  return (keys.has('KeyQ') ? 1 : 0) - (keys.has('KeyE') ? 1 : 0);
}

/** Vitesse angulaire (degrés / s) sous laquelle la rotation glissée s'arrête. */
const STOP_SPIN = 3;

/** Décélération exponentielle d'une vitesse angulaire (degrés / s) sur `dt` secondes, comme `decelerate`. */
export function decelerateSpin(spin: number, dt: number, decelerationMs: number): number {
  if (decelerationMs <= 0) return 0;
  const next = spin * Math.exp(-(dt * 1000) / decelerationMs);
  return Math.abs(next) < STOP_SPIN ? 0 : next;
}

const ROTATE_CODES = ['KeyQ', 'KeyE'];

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

/** Touches de modification maintenues (voir `CameraHost.heldKeys`). */
export interface HeldKeys {
  followLink: boolean;
  multiSelect: boolean;
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
  /** Touche à maintenir pour suivre un lien ('none' : double-clic seul). */
  followLinkKey: FollowLinkKey;
  /** Geste pour suivre un lien, avec la touche : clic simple ou double-clic. */
  followLinkGesture: FollowLinkGesture;
  /** Rotation au clavier (A / E en AZERTY, Q / E en QWERTY), en iso et en 3D, en degrés par seconde. */
  rotateSpeed: number;
  /** Déplacement du pointeur au-delà duquel un clic devient un glisser, en pixels écran. */
  clickSlop: number;
  /** Vitesse maximale transmise par un glisser rapide, en pixels écran par seconde. */
  maxReleaseSpeed: number;
  /** Fenêtre de mesure de la vitesse au relâchement d'un glisser, en ms. */
  releaseWindowMs: number;
  /** Vitesse en dessous de laquelle la glissade s'arrête, en pixels écran par seconde. */
  stopSpeed: number;
}

export const DEFAULT_CONTROLS: ControlSettings = {
  moveKeys: 'all',
  moveSpeed: 600,
  zoomSpeed: 0.0015,
  decelerationMs: 80,
  orbitSpeed: 0.005,
  multiSelectKey: 'ctrl',
  followLinkKey: 'space',
  followLinkGesture: 'click',
  rotateSpeed: 90,
  clickSlop: 4,
  maxReleaseSpeed: 3000,
  releaseWindowMs: 80,
  stopSpeed: 8,
  shortcuts: DEFAULT_SHORTCUTS,
};

/** Décélération exponentielle de la vitesse sur `dt` secondes, arrêtée sous `stopSpeed` (px / s). */
export function decelerate(
  velocity: Point,
  dt: number,
  decelerationMs: number,
  stopSpeed = DEFAULT_CONTROLS.stopSpeed,
): Point {
  if (decelerationMs <= 0) return { x: 0, y: 0 };
  const k = Math.exp(-(dt * 1000) / decelerationMs);
  const next = { x: velocity.x * k, y: velocity.y * k };
  return Math.hypot(next.x, next.y) < stopSpeed ? { x: 0, y: 0 } : next;
}

/**
 * Vitesse du pointeur au relâchement (pixels écran / s), d'après ses dernières positions.
 * Nulle si le pointeur était immobile juste avant de relâcher.
 */
export function releaseVelocity(
  samples: Array<{ t: number; p: Point }>,
  now: number,
  options: { windowMs: number; maxSpeed: number } = {
    windowMs: DEFAULT_CONTROLS.releaseWindowMs,
    maxSpeed: DEFAULT_CONTROLS.maxReleaseSpeed,
  },
): Point {
  const recent = samples.filter((s) => now - s.t <= options.windowMs);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last || last.t - first.t < 1) return { x: 0, y: 0 };
  const dt = (last.t - first.t) / 1000;
  const v = { x: (last.p.x - first.p.x) / dt, y: (last.p.y - first.p.y) / dt };
  const speed = Math.hypot(v.x, v.y);
  const max = options.maxSpeed;
  return speed > max ? { x: (v.x / speed) * max, y: (v.y / speed) * max } : v;
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
  click?(screen: Point, options: { toggle: boolean; followLink: boolean }): void;
  /**
   * Double-clic gauche. `followLink` : le geste pour suivre un lien est le double-clic et sa touche
   * est enfoncée (entrer dans le lien) ; sinon, édition du texte.
   */
  doubleClick?(screen: Point, options: { followLink: boolean }): void;
  /**
   * Touches de modification maintenues seules (sans autre touche) : celle pour suivre un lien (zones
   * liées en évidence, « Mode navigation ») et celle de sélection multiple.
   */
  heldKeys?(held: HeldKeys): void;
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
  /** Aplatit / rétablit les volumes en iso et en 3D (touche V). */
  toggleFlatten?(): void;
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
  /**
   * Appui gauche sur le vide (rien à déplacer) : vrai si l'on peut y tirer un rectangle de sélection
   * (ticket 60) ; au relâchement, `selectInRect` reçoit le rectangle écran.
   */
  canMarquee?(screen: Point): boolean;
  /** `add` : touche de sélection multiple (ajoute à la sélection) ; `touch` : Alt (il suffit de toucher). */
  selectInRect?(rect: Rect, options: { add: boolean; touch: boolean }): void;
  /** ⌘ + A / Ctrl + A, le focus sur la zone de dessin : sélectionne tous les éléments de la page (ticket 122). */
  selectAll?(): void;
  /**
   * Flèche du clavier : déplace la sélection (1 px, un pas de grille avec Maj, ticket 123) ; faux si rien
   * n'est déplaçable (la flèche déplace alors la vue).
   */
  nudgeSelection?(direction: Point, coarse: boolean): boolean;
  /** F2 : éditer le label de la sélection. */
  editSelection?(): void;
  /** Suppr (ou le raccourci `deleteSelection`) : supprimer la sélection. */
  deleteSelection?(): void;
  /** Variante de placement de la flèche sélectionnée ; faux si elle ne s'applique pas (rien n'est fait). */
  placementVariant?(): boolean;
  /** Y a-t-il une sélection supprimable (page modifiable) ? Décide entre supprimer et Retour. */
  canDeleteSelection?(): boolean;
  /** Échap : désélectionner. */
  escape?(): void;
  /** Touche d'un mode de page sur la sélection (ex. « + » / « - ») ; vrai si elle a été prise. */
  modeKey?(key: string): boolean;
}

type DragMode = 'pan' | 'move' | 'orbit' | 'marquee';

export class CameraController {
  private settings: ControlSettings;
  private readonly pressed = new Set<string>();
  private spaceDown = false;
  /** Touches de modification maintenues. */
  private held: HeldKeys = { followLink: false, multiSelect: false };
  /** `start` : point écran de départ du glisser. */
  private drag: { pointerId: number; mode: DragMode; last: Point; start: Point; moving?: boolean } | undefined;
  private frame = 0;
  private lastTick = 0;
  /** Vitesse de déplacement du contenu à l'écran (pixels / s), pour la glissade. */
  private velocity: Point = { x: 0, y: 0 };
  /** Vitesse de rotation au clavier (A / E), en degrés par seconde. */
  private spin = 0;
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
  /** Rectangle de sélection affiché pendant le glisser (ticket 60). */
  private marquee: HTMLDivElement | undefined;

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
    const keyChanged = (name: 'followLinkKey' | 'multiSelectKey') =>
      patch[name] !== undefined && patch[name] !== this.settings[name];
    if (keyChanged('followLinkKey') || keyChanged('multiSelectKey'))
      this.setHeld({ followLink: false, multiSelect: false });
    this.settings = { ...this.settings, ...patch, shortcuts: { ...this.settings.shortcuts, ...patch.shortcuts } };
  }

  /** Ignore les entrées (ex. pendant une transition, SPEC §11.2). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.onBlur();
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.showMarquee(undefined);
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
    else if (event.button === 0 && this.host.canMarquee?.(this.localPoint(event))) mode = 'marquee';
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
    if (this.pressPoint && distance(this.pressPoint, this.hover) > this.settings.clickSlop) this.suppressClick = true;
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      if (this.enabled && !this.drag) this.host.hover?.(this.hover);
      return;
    }
    const point = this.localPoint(event);
    if (drag.mode === 'move') {
      // Un appui-relâché sur place reste un clic (sélection) : on ne bouge qu'au-delà du seuil.
      if (!drag.moving && distance(drag.start, point) <= this.settings.clickSlop) return;
      drag.moving = true;
      this.element.style.cursor = 'move';
      this.host.moveTo?.(point, { snap: !event.altKey });
      return;
    }
    if (drag.mode === 'marquee') {
      if (!drag.moving && distance(drag.start, point) <= this.settings.clickSlop) return;
      drag.moving = true;
      this.showMarquee(rectBetween(drag.start, point));
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
      this.velocity = releaseVelocity(this.samples, event.timeStamp, {
        windowMs: this.settings.releaseWindowMs,
        maxSpeed: this.settings.maxReleaseSpeed,
      });
      this.startLoop();
    } else if (this.drag.mode === 'move') {
      this.host.endMove?.();
    } else if (this.drag.mode === 'marquee') {
      this.showMarquee(undefined);
      // Sous le seuil, c'est un clic (il désélectionne) : rien à faire ici.
      if (this.drag.moving && event.type !== 'pointercancel') {
        this.host.selectInRect?.(rectBetween(this.drag.start, this.localPoint(event)), {
          add: hasMultiSelectKey(event, this.settings.multiSelectKey),
          touch: event.altKey,
        });
      }
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
    const followLink = this.followsLink(event, 'click');
    // Espace maintenu : un clic sans glisser ne compte que pour suivre un lien.
    const suppressed = this.suppressClick || (this.spaceDown && !followLink);
    this.pressPoint = undefined;
    this.suppressClick = false;
    // Déjà traité par le menu contextuel (Ctrl+clic sur Mac).
    if (event.timeStamp - this.ctrlClickAt < 500) return;
    if (!this.enabled || event.button !== 0 || suppressed) return;
    this.host.click?.(this.localPoint(event), {
      toggle: hasMultiSelectKey(event, this.settings.multiSelectKey),
      followLink,
    });
  };

  /** Ce clic (ou double-clic) est-il le geste pour suivre un lien, avec sa touche ? */
  private followsLink(event: MouseEvent, gesture: FollowLinkGesture): boolean {
    const { followLinkKey: key, followLinkGesture: chosen } = this.settings;
    return followLinkGesture(key, chosen) === gesture && hasFollowLinkKey(event, key, this.spaceDown);
  }

  private readonly onDoubleClick = (event: MouseEvent): void => {
    const followLink = this.followsLink(event, 'doubleClick');
    if (!this.enabled || event.button !== 0 || (this.spaceDown && !followLink)) return;
    event.preventDefault();
    this.host.doubleClick?.(this.localPoint(event), { followLink });
  };

  /**
   * Pas de menu contextuel. Sur Mac, Ctrl+clic gauche ouvre le menu au lieu de produire un clic :
   * c'est alors un clic avec Ctrl (sélection multiple si c'est la touche choisie).
   */
  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    if (event.button !== 0 || !event.ctrlKey || this.settings.multiSelectKey !== 'ctrl') return;
    const followLink = this.followsLink(event, 'click');
    const suppressed = this.suppressClick || (this.spaceDown && !followLink);
    this.pressPoint = undefined;
    this.suppressClick = false;
    if (!this.enabled || suppressed) return;
    this.ctrlClickAt = event.timeStamp;
    this.host.click?.(this.localPoint(event), { toggle: true, followLink });
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button === 1) event.preventDefault();
  };

  // -------------------------------------------------------------------------
  // Clavier

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const followLink = isModifierKeyEvent(event, this.settings.followLinkKey);
    const multiSelect = isModifierKeyEvent(event, this.settings.multiSelectKey);
    if ((followLink || multiSelect) && !isEditable(event.target)) {
      if (!event.repeat) {
        this.setHeld({
          followLink: this.held.followLink || followLink,
          multiSelect: this.held.multiSelect || multiSelect,
        });
      }
      // Espace garde aussi son rôle de déplacement de la vue (plus bas).
      if (event.code !== 'Space') return;
    } else {
      // Une autre touche avec ⌘ ou Ctrl (⌘+Tab, Ctrl+Z…) : un raccourci, pas un mode. Espace, elle,
      // reste maintenue (ex. déplacement au clavier pendant qu'elle l'est).
      this.setHeld({ followLink: this.settings.followLinkKey === 'space' && this.spaceDown, multiSelect: false });
    }
    if (!this.enabled || isEditable(event.target)) return;
    // Tout sélectionner : seulement si le focus est sur la zone de dessin (ailleurs, comportement natif).
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.altKey &&
      !event.shiftKey &&
      event.key.toLowerCase() === 'a' &&
      event.target === this.element
    ) {
      event.preventDefault();
      if (!event.repeat) this.host.selectAll?.();
      return;
    }
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
    const nudge = ARROW_KEYS[event.code];
    if (nudge && this.host.nudgeSelection?.(nudge, event.shiftKey)) {
      event.preventDefault();
      return;
    }
    // Édition (touches fixes) : F2 = texte, Suppr = supprimer, Échap = désélectionner.
    if (event.key === 'F2' || event.key === 'Delete' || event.key === 'Escape') {
      if (event.repeat) return;
      event.preventDefault();
      if (event.key === 'F2') this.host.editSelection?.();
      else if (event.key === 'Delete') this.host.deleteSelection?.();
      else this.host.escape?.();
      return;
    }
    // Touche propre au mode de la page, sur la sélection (ex. « + » / « - » : rang d'une flèche dans son flux).
    if (this.host.modeKey?.(event.key)) {
      event.preventDefault();
      return;
    }
    if (action === 'placementVariant') {
      if (!event.repeat && this.host.placementVariant?.()) event.preventDefault();
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
      action === 'toggleMinimap' ||
      action === 'toggleFlatten'
    ) {
      event.preventDefault();
      if (event.repeat) return;
      if (action === 'toggleViewMode') this.host.toggleViewMode?.();
      else if (action === 'toggle3d') this.host.toggle3d?.();
      else if (action === 'toggleGraph') this.host.toggleGraph?.();
      else if (action === 'toggleFlatten') this.host.toggleFlatten?.();
      else this.host.toggleMinimap?.();
      return;
    }
    // Rotation (A / E) : en iso et en 3D seulement ; en 2D, la vue n'est jamais tournée.
    if (ROTATE_CODES.includes(event.code) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (this.host.getCameraState().mode === 'top') return;
      this.pressed.add(event.code);
      this.startLoop();
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
    this.setHeld({
      followLink: this.held.followLink && !isModifierKeyEvent(event, this.settings.followLinkKey),
      multiSelect: this.held.multiSelect && !isModifierKeyEvent(event, this.settings.multiSelectKey),
    });
    if (event.code === 'Space') {
      this.spaceDown = false;
      if (!this.drag) this.element.style.cursor = '';
    }
    this.pressed.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.setHeld({ followLink: false, multiSelect: false });
    this.pressed.clear();
    this.stopDrift();
    this.spaceDown = false;
    this.element.style.cursor = '';
  };

  private setHeld(held: HeldKeys): void {
    if (this.held.followLink === held.followLink && this.held.multiSelect === held.multiSelect) return;
    this.held = held;
    this.host.heldKeys?.({ ...held });
  }

  private startLoop(): void {
    if (this.frame) return;
    this.lastTick = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private stopDrift(): void {
    this.velocity = { x: 0, y: 0 };
    this.spin = 0;
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
      this.velocity = decelerate(this.velocity, dt, this.settings.decelerationMs, this.settings.stopSpeed);
    }
    // Rotation (jamais en 2D) autour du centre de l'écran : vitesse pleine tant que A / E est
    // enfoncée, puis la même courte glissade que le déplacement.
    const state = this.host.getCameraState();
    const rotation = keyRotation(this.pressed);
    if (state.mode === 'top') this.spin = 0;
    else if (rotation !== 0) this.spin = rotation * this.settings.rotateSpeed;
    else this.spin = decelerateSpin(this.spin, dt, this.settings.decelerationMs);
    if (this.velocity.x === 0 && this.velocity.y === 0 && this.spin === 0) {
      this.frame = 0;
      return;
    }
    let next = panByScreen(state, { x: this.velocity.x * dt, y: this.velocity.y * dt });
    if (this.spin !== 0) next = orbit(next, (this.spin * Math.PI * dt) / 180, 0);
    this.host.setCameraState(next);
    this.frame = requestAnimationFrame(this.tick);
  };

  /** Rectangle de sélection par-dessus le canvas (contour bleu, fond bleu translucide, comme draw.io). */
  private showMarquee(rect: Rect | undefined): void {
    if (!rect) {
      this.marquee?.remove();
      this.marquee = undefined;
      return;
    }
    if (!this.marquee) {
      this.marquee = document.createElement('div');
      Object.assign(this.marquee.style, {
        position: 'fixed',
        pointerEvents: 'none',
        boxSizing: 'border-box',
        border: '1px solid rgba(0, 119, 255, 0.9)',
        background: 'rgba(0, 119, 255, 0.15)',
        zIndex: '10',
      });
      document.body.appendChild(this.marquee);
    }
    const origin = this.element.getBoundingClientRect();
    Object.assign(this.marquee.style, {
      left: `${origin.left + rect.x}px`,
      top: `${origin.top + rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }

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
