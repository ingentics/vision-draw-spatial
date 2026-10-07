import type { Point } from '../../model/types';
import type { CameraHost } from './host';
import type { ControlSettings } from './settings';

export type DragMode = 'pan' | 'move' | 'orbit' | 'marquee';

/** Glisser en cours ; `start` : point écran de départ. */
export interface Drag {
  pointerId: number;
  mode: DragMode;
  last: Point;
  start: Point;
  moving?: boolean;
}

/** État partagé par les contrôles souris, clavier et la glissade de la vue. */
export class ControlContext {
  enabled = true;
  /** Espace maintenue : le glisser gauche déplace la vue. */
  spaceDown = false;
  /** Dernière position du pointeur sur le canvas (pour la bascule 1:1 autour du curseur). */
  hover: Point | undefined;
  drag: Drag | undefined;

  constructor(
    readonly element: HTMLElement,
    readonly host: CameraHost,
    public settings: ControlSettings,
  ) {}

  localPoint(event: MouseEvent): Point {
    const rect = this.element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
}
