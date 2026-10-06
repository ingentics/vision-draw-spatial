import type { Point } from '../../model/types';
import { orbit, panByScreen } from '../camera';
import type { ControlContext } from './context';
import { decelerate, decelerateSpin, keyDirection, keyRotation } from './motion';

/** Déplacement continu de la vue : touches enfoncées, puis glissade (clavier ou relâchement d'un glisser). */
export class Drift {
  /** Touches de déplacement et de rotation enfoncées (par position physique). */
  readonly pressed = new Set<string>();
  /** Vitesse de déplacement du contenu à l'écran (pixels / s), pour la glissade. */
  velocity: Point = { x: 0, y: 0 };
  /** Vitesse de rotation au clavier (A / E), en degrés par seconde. */
  private spin = 0;
  private frame = 0;
  private lastTick = 0;

  constructor(private readonly ctx: ControlContext) {}

  start(): void {
    if (this.frame) return;
    this.lastTick = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.velocity = { x: 0, y: 0 };
    this.spin = 0;
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
  }

  /**
   * Déplacement continu : vitesse pleine tant que des touches sont enfoncées (pas d'accélération),
   * puis courte décélération quand on relâche. Indépendant du framerate.
   */
  private readonly tick = (now: number): void => {
    const { host, settings } = this.ctx;
    const dt = Math.min((now - this.lastTick) / 1000, 0.1);
    this.lastTick = now;
    const direction = keyDirection(this.pressed, settings.moveKeys);
    if (direction.x !== 0 || direction.y !== 0) {
      // Se déplacer vers le haut = le contenu descend.
      this.velocity = { x: -direction.x * settings.moveSpeed, y: -direction.y * settings.moveSpeed };
    } else {
      this.velocity = decelerate(this.velocity, dt, settings.decelerationMs, settings.stopSpeed);
    }
    // Rotation (jamais en 2D) autour du centre de l'écran : vitesse pleine tant que A / E est
    // enfoncée, puis la même courte glissade que le déplacement.
    const state = host.getCameraState();
    const rotation = keyRotation(this.pressed);
    if (state.mode === 'top') this.spin = 0;
    else if (rotation !== 0) this.spin = rotation * settings.rotateSpeed;
    else this.spin = decelerateSpin(this.spin, dt, settings.decelerationMs);
    if (this.velocity.x === 0 && this.velocity.y === 0 && this.spin === 0) {
      this.frame = 0;
      return;
    }
    let next = panByScreen(state, { x: this.velocity.x * dt, y: this.velocity.y * dt });
    if (this.spin !== 0) next = orbit(next, (this.spin * Math.PI * dt) / 180, 0);
    host.setCameraState(next);
    this.frame = requestAnimationFrame(this.tick);
  };
}
