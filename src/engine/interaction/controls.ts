import type { Point } from '../model/types';
import { panByScreen, rotateAround, zoomAt } from './camera';
import type { CameraState, Viewport } from './camera';

/**
 * Contrôles de navigation (SPEC §9.2). Les touches sont lues par position physique
 * (`KeyboardEvent.code`) : Z Q S D sur AZERTY et W A S D sur QWERTY sont les mêmes touches.
 */

export interface ControlSettings {
  /** Touches de déplacement : lettres (ZQSD / WASD selon le clavier), flèches, ou les deux. */
  moveKeys: 'letters' | 'arrows' | 'all';
  /** Effet du glisser avec la molette enfoncée. Clic droit et Espace + clic gauche déplacent toujours. */
  middleDrag: 'pan' | 'rotate';
  /** Vitesse de déplacement au clavier, en pixels écran par seconde. */
  moveSpeed: number;
  /** Sensibilité de la molette. */
  zoomSpeed: number;
  /** Radians par pixel de glisser horizontal, en mode rotation. */
  rotateSpeed: number;
}

export const DEFAULT_CONTROLS: ControlSettings = {
  moveKeys: 'all',
  middleDrag: 'pan',
  moveSpeed: 600,
  zoomSpeed: 0.0015,
  rotateSpeed: 0.005,
};

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
}

type DragMode = 'pan' | 'rotate';

export class CameraController {
  private settings: ControlSettings;
  private readonly pressed = new Set<string>();
  private spaceDown = false;
  /** `pivot` : point écran de départ du glisser, centre de la rotation. */
  private drag: { pointerId: number; mode: DragMode; last: Point; pivot: Point } | undefined;
  private frame = 0;
  private lastTick = 0;
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
    element.addEventListener('contextmenu', this.onContextMenu);
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
    this.settings = { ...this.settings, ...patch };
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
    el.removeEventListener('contextmenu', this.onContextMenu);
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
    const viewport = this.host.getViewport();
    const factor = wheelZoomFactor(event, this.settings.zoomSpeed, viewport.height);
    this.host.setCameraState(zoomAt(this.host.getCameraState(), viewport, this.localPoint(event), factor));
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.element.focus({ preventScroll: true });
    if (!this.enabled || this.drag) return;
    let mode: DragMode | undefined;
    if (event.button === 1) mode = this.settings.middleDrag;
    else if (event.button === 2) mode = 'pan';
    else if (event.button === 0 && this.spaceDown) mode = 'pan';
    if (!mode) return;

    event.preventDefault();
    try {
      // Continue de recevoir les mouvements hors du canvas pendant le glisser.
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // Pointeur inconnu du navigateur (ex. événement synthétique) : le glisser marche sans capture.
    }
    const start = this.localPoint(event);
    this.drag = { pointerId: event.pointerId, mode, last: start, pivot: start };
    this.element.style.cursor = mode === 'pan' ? 'grabbing' : 'ew-resize';
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const point = this.localPoint(event);
    const delta = { x: point.x - drag.last.x, y: point.y - drag.last.y };
    drag.last = point;
    const state = this.host.getCameraState();
    if (drag.mode === 'pan') {
      this.host.setCameraState(panByScreen(state, delta));
    } else {
      // Rotation autour du point de départ du glisser, qui reste fixe à l'écran.
      // Glisser vers la droite fait tourner le schéma dans le sens horaire.
      const viewport = this.host.getViewport();
      this.host.setCameraState(rotateAround(state, viewport, drag.pivot, -delta.x * this.settings.rotateSpeed));
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) return;
    if (this.element.hasPointerCapture(event.pointerId)) this.element.releasePointerCapture(event.pointerId);
    this.drag = undefined;
    this.element.style.cursor = this.spaceDown ? 'grab' : '';
  };

  private readonly onContextMenu = (event: Event): void => event.preventDefault();

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button === 1) event.preventDefault();
  };

  // -------------------------------------------------------------------------
  // Clavier

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled || isEditable(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.code === 'Space') {
      this.spaceDown = true;
      if (!this.drag) this.element.style.cursor = 'grab';
      event.preventDefault();
      return;
    }
    if (!isMoveKey(event.code, this.settings.moveKeys)) return;
    event.preventDefault();
    this.pressed.add(event.code);
    if (!this.frame) {
      this.lastTick = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }
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
    this.spaceDown = false;
    this.element.style.cursor = '';
  };

  /** Déplacement continu tant que des touches sont enfoncées, à vitesse constante quel que soit le framerate. */
  private readonly tick = (now: number): void => {
    const direction = keyDirection(this.pressed, this.settings.moveKeys);
    if (direction.x === 0 && direction.y === 0) {
      this.frame = 0;
      return;
    }
    const dt = Math.min((now - this.lastTick) / 1000, 0.1);
    this.lastTick = now;
    const distance = this.settings.moveSpeed * dt;
    // Se déplacer vers le haut = le contenu descend : c'est un pan inverse.
    this.host.setCameraState(
      panByScreen(this.host.getCameraState(), { x: -direction.x * distance, y: -direction.y * distance }),
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
