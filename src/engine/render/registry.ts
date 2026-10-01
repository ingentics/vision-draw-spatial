import type { ShapeModel } from '../model/types';
import { ellipseRenderer } from './renderers/ellipse';
import { groupRenderer } from './renderers/group';
import { placeholderRenderer } from './renderers/placeholder';
import { rectangleRenderer } from './renderers/rectangle';
import { textRenderer } from './renderers/text';
import type { ShapeRenderer } from './types';

export interface ResolvedRenderer {
  renderer: ShapeRenderer;
  /** Faux si aucun renderer ne correspond : c'est le placeholder qui dessine. */
  supported: boolean;
}

export class RendererRegistry {
  private readonly renderers: ShapeRenderer[] = [];

  constructor(private readonly fallback: ShapeRenderer = placeholderRenderer) {}

  /** Le dernier renderer enregistré est prioritaire (permet de surcharger un renderer existant). */
  register(renderer: ShapeRenderer): this {
    this.renderers.push(renderer);
    return this;
  }

  resolve(shape: ShapeModel): ResolvedRenderer {
    for (let i = this.renderers.length - 1; i >= 0; i--) {
      const renderer = this.renderers[i]!;
      const matches = renderer.matches ? renderer.matches(shape) : renderer.kind === shape.kind;
      if (matches) return { renderer, supported: true };
    }
    return { renderer: this.fallback, supported: false };
  }
}

/** Formes supportées en M1 (SPEC §8.3). */
export function createDefaultRegistry(): RendererRegistry {
  return new RendererRegistry()
    .register(rectangleRenderer)
    .register(ellipseRenderer)
    .register(textRenderer)
    .register(groupRenderer);
}
