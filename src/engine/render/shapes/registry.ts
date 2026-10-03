import type { ShapeModel } from '../../model/types';
import { blockHeight } from '../iso/block';
import type { RenderContext } from '../types';
import { ellipseShape } from './ellipse';
import { groupShape } from './group';
import { outlinePainter } from './minimapPainters';
import { placeholderShape } from './placeholder';
import { rectangleShape } from './rectangle';
import { cylinderShape, datastoreShape, directDataShape } from './storage';
import { textShape } from './text';
import type { MinimapPainter, SceneLevel, SceneRenderer, ShapeDefinition } from './types';

export interface ResolvedShape {
  definition: ShapeDefinition;
  /** Faux si aucune définition ne correspond : c'est le placeholder qui dessine. */
  supported: boolean;
}

/**
 * Registre des formes (SPEC §8.2) : ajouter une forme = écrire sa définition et l'enregistrer.
 * Le registre résout la définition d'une forme, puis le rendu d'un niveau avec repli sur `flat`.
 */
export class ShapeRegistry {
  private readonly definitions: ShapeDefinition[] = [];

  constructor(private readonly fallback: ShapeDefinition = placeholderShape) {}

  /** La dernière définition enregistrée est prioritaire (permet de surcharger une forme existante). */
  register(definition: ShapeDefinition): this {
    this.definitions.push(definition);
    return this;
  }

  resolve(shape: ShapeModel): ResolvedShape {
    for (let i = this.definitions.length - 1; i >= 0; i--) {
      const definition = this.definitions[i]!;
      const matches = definition.matches ? definition.matches(shape) : definition.kind === shape.kind;
      if (matches) return { definition, supported: true };
    }
    return { definition: this.fallback, supported: false };
  }

  /** Rendu de scène d'une forme au niveau demandé ; repli sur le rendu à plat. */
  sceneRenderer(shape: ShapeModel, level: SceneLevel): SceneRenderer {
    const { definition } = this.resolve(shape);
    return definition[level] ?? definition.flat;
  }

  /** La forme a-t-elle un rendu propre à ce niveau (sinon elle se dessine à plat) ? */
  hasLevel(shape: ShapeModel, level: SceneLevel): boolean {
    return level === 'flat' || this.resolve(shape).definition[level] !== undefined;
  }

  /** Hauteur du volume d'une forme en iso / 3D : celle propre à sa définition, sinon `blockHeight`. */
  volumeHeight(shape: ShapeModel, ctx: RenderContext): number {
    return this.resolve(shape).definition.volumeHeight?.(shape, ctx) ?? blockHeight(shape, ctx);
  }

  /** Dessin en mini-carte ; repli sur le contour. `undefined` = ne rien dessiner. */
  minimapPainter(shape: ShapeModel): MinimapPainter | undefined {
    const { definition } = this.resolve(shape);
    if (definition.minimap === null) return undefined;
    return definition.minimap ?? outlinePainter(definition);
  }
}

/** Formes supportées (SPEC §8.3). */
export function createDefaultRegistry(): ShapeRegistry {
  return new ShapeRegistry()
    .register(rectangleShape)
    .register(ellipseShape)
    .register(textShape)
    .register(groupShape)
    .register(cylinderShape)
    .register(directDataShape)
    .register(datastoreShape);
}
