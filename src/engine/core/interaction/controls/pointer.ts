import type { Point, Rect } from '../../model/types';
import { dragGround, orbit, zoomAt } from '../cameraMoves';
import { rectBetween } from '../marquee';
import { followLinkGesture, hasFollowLinkKey, hasMultiSelectKey } from '../selectionRules';
import type { FollowLinkGesture } from '../selectionRules';
import type { ControlContext, DragMode } from './context';
import type { Drift } from './drift';
import { releaseVelocity, wheelZoomFactor } from './motion';
import { distance } from '../../model/geometry';

/** Souris et pointeur sur le canvas : molette, glisser (vue, orbite, déplacement, sélection par zone), clics. */
export class PointerControls {
  /** Dernières positions du glisser en cours, pour mesurer la vitesse au relâchement. */
  private samples: Array<{ t: number; p: Point }> = [];
  /** Point d'appui du bouton gauche, pour distinguer un clic d'un glisser. */
  private pressPoint: Point | undefined;
  private suppressClick = false;
  /** Instant du dernier Ctrl+clic traité par le menu contextuel (pour ne pas le compter deux fois). */
  private ctrlClickAt = -Infinity;
  /** Rectangle de sélection affiché pendant le glisser (ticket 60). */
  private marquee: HTMLDivElement | undefined;

  constructor(
    private readonly ctx: ControlContext,
    private readonly drift: Drift,
  ) {}

  attach(): void {
    const el = this.ctx.element;
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointercancel', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
    el.addEventListener('contextmenu', this.onContextMenu);
    el.addEventListener('click', this.onClick);
    el.addEventListener('dblclick', this.onDoubleClick);
    // Empêche le défilement automatique du navigateur au clic molette.
    el.addEventListener('mousedown', this.onMouseDown);
  }

  detach(): void {
    this.showMarquee(undefined);
    const el = this.ctx.element;
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
  }

  private readonly onWheel = (event: WheelEvent): void => {
    const { host } = this.ctx;
    if (!this.ctx.enabled) return;
    event.preventDefault();
    this.drift.stop();
    const viewport = host.getViewport();
    const factor = wheelZoomFactor(event, this.ctx.settings.zoomSpeed, viewport.height);
    host.setCameraState(
      zoomAt(host.getCameraState(), viewport, this.ctx.localPoint(event), factor, host.getCameraLimits?.()),
    );
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    const { ctx } = this;
    const { element, host } = ctx;
    element.focus({ preventScroll: true });
    if (event.button === 0) {
      this.pressPoint = ctx.localPoint(event);
      this.suppressClick = false;
    }
    if (!ctx.enabled || ctx.drag) return;
    let mode: DragMode | undefined;
    // Iso et 3D : le clic droit oriente la caméra (orbite), la molette enfoncée la déplace.
    // En 2D, jamais de rotation : le clic droit déplace.
    if (event.button === 2 && host.getCameraState().mode !== 'top') mode = 'orbit';
    else if (event.button === 1 || event.button === 2) mode = 'pan';
    else if (event.button === 0 && ctx.spaceDown) mode = 'pan';
    else if (event.button === 0 && host.beginMove?.(ctx.localPoint(event))) mode = 'move';
    else if (event.button === 0 && host.canMarquee?.(ctx.localPoint(event))) mode = 'marquee';
    if (!mode) return;

    event.preventDefault();
    try {
      // Continue de recevoir les mouvements hors du canvas pendant le glisser.
      element.setPointerCapture(event.pointerId);
    } catch {
      // Pointeur inconnu du navigateur (ex. événement synthétique) : le glisser marche sans capture.
    }
    this.drift.stop();
    const start = ctx.localPoint(event);
    ctx.drag = { pointerId: event.pointerId, mode, last: start, start };
    this.samples = [{ t: event.timeStamp, p: start }];
    if (mode === 'pan') element.style.cursor = 'grabbing';
    else if (mode === 'orbit') element.style.cursor = host.getCameraState().mode === '3d' ? 'all-scroll' : 'ew-resize';
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const { ctx } = this;
    const { host, settings } = ctx;
    ctx.hover = ctx.localPoint(event);
    if (this.pressPoint && distance(this.pressPoint, ctx.hover) > settings.clickSlop) this.suppressClick = true;
    const drag = ctx.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      if (ctx.enabled && !ctx.drag) host.hover?.(ctx.hover);
      return;
    }
    const point = ctx.localPoint(event);
    if (drag.mode === 'move') {
      // Un appui-relâché sur place reste un clic (sélection) : on ne bouge qu'au-delà du seuil.
      if (!drag.moving && distance(drag.start, point) <= settings.clickSlop) return;
      drag.moving = true;
      ctx.element.style.cursor = 'move';
      host.moveTo?.(point, { snap: !event.altKey, free: event.ctrlKey });
      return;
    }
    if (drag.mode === 'marquee') {
      if (!drag.moving && distance(drag.start, point) <= settings.clickSlop) return;
      drag.moving = true;
      this.showMarquee(rectBetween(drag.start, point));
      return;
    }
    const delta = { x: point.x - drag.last.x, y: point.y - drag.last.y };
    const previous = drag.last;
    drag.last = point;
    const state = host.getCameraState();
    if (drag.mode === 'orbit') {
      // C'est la caméra qui bouge, la page reste fixe : vers la droite, la caméra tourne vers la
      // droite autour du centre ; en 3D, vers le haut, elle monte (vers la vue d'aplomb), vers le
      // bas, elle descend vers l'horizon. L'iso garde l'élévation de ses réglages.
      const speed = settings.orbitSpeed;
      const tilt = state.mode === '3d' ? delta.y * speed : 0;
      host.setCameraState(orbit(state, delta.x * speed, tilt, host.getCameraLimits?.()));
      return;
    }
    this.samples.push({ t: event.timeStamp, p: point });
    if (this.samples.length > 20) this.samples.shift();
    host.setCameraState(dragGround(state, host.getViewport(), previous, point));
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const { ctx } = this;
    const { element, host, settings } = ctx;
    const drag = ctx.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    if (drag.mode === 'pan') {
      this.drift.velocity = releaseVelocity(this.samples, event.timeStamp, {
        windowMs: settings.releaseWindowMs,
        maxSpeed: settings.maxReleaseSpeed,
      });
      this.drift.start();
    } else if (drag.mode === 'move') {
      host.endMove?.();
    } else if (drag.mode === 'marquee') {
      this.showMarquee(undefined);
      // Sous le seuil, c'est un clic (il désélectionne) : rien à faire ici.
      if (drag.moving && event.type !== 'pointercancel') {
        host.selectInRect?.(rectBetween(drag.start, ctx.localPoint(event)), {
          add: hasMultiSelectKey(event, settings.multiSelectKey),
          touch: event.altKey,
        });
      }
    }
    this.samples = [];
    ctx.drag = undefined;
    element.style.cursor = ctx.spaceDown ? 'grab' : '';
  };

  private readonly onPointerLeave = (): void => {
    this.ctx.hover = undefined;
    this.ctx.host.hover?.(undefined);
  };

  private readonly onClick = (event: MouseEvent): void => {
    const followLink = this.followsLink(event, 'click');
    // Espace maintenu : un clic sans glisser ne compte que pour suivre un lien.
    const suppressed = this.suppressClick || (this.ctx.spaceDown && !followLink);
    this.pressPoint = undefined;
    this.suppressClick = false;
    // Déjà traité par le menu contextuel (Ctrl+clic sur Mac).
    if (event.timeStamp - this.ctrlClickAt < 500) return;
    if (!this.ctx.enabled || event.button !== 0 || suppressed) return;
    this.ctx.host.click?.(this.ctx.localPoint(event), {
      toggle: hasMultiSelectKey(event, this.ctx.settings.multiSelectKey),
      followLink,
    });
  };

  /** Ce clic (ou double-clic) est-il le geste pour suivre un lien, avec sa touche ? */
  private followsLink(event: MouseEvent, gesture: FollowLinkGesture): boolean {
    const { followLinkKey: key, followLinkGesture: chosen } = this.ctx.settings;
    return followLinkGesture(key, chosen) === gesture && hasFollowLinkKey(event, key, this.ctx.spaceDown);
  }

  private readonly onDoubleClick = (event: MouseEvent): void => {
    const followLink = this.followsLink(event, 'doubleClick');
    if (!this.ctx.enabled || event.button !== 0 || (this.ctx.spaceDown && !followLink)) return;
    event.preventDefault();
    this.ctx.host.doubleClick?.(this.ctx.localPoint(event), { followLink });
  };

  /**
   * Pas de menu contextuel. Sur Mac, Ctrl+clic gauche ouvre le menu au lieu de produire un clic :
   * c'est alors un clic avec Ctrl (sélection multiple si c'est la touche choisie).
   */
  private readonly onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    if (event.button !== 0 || !event.ctrlKey || this.ctx.settings.multiSelectKey !== 'ctrl') return;
    const followLink = this.followsLink(event, 'click');
    const suppressed = this.suppressClick || (this.ctx.spaceDown && !followLink);
    this.pressPoint = undefined;
    this.suppressClick = false;
    if (!this.ctx.enabled || suppressed) return;
    this.ctrlClickAt = event.timeStamp;
    this.ctx.host.click?.(this.ctx.localPoint(event), { toggle: true, followLink });
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button === 1) event.preventDefault();
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
    const origin = this.ctx.element.getBoundingClientRect();
    Object.assign(this.marquee.style, {
      left: `${origin.left + rect.x}px`,
      top: `${origin.top + rect.y}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  }
}
