import { insidePolygon } from '../interaction/pick';
import type { Point, Rect, ShapeModel } from '../model/types';
import { blockHeight } from '../render/iso/block';
import { outsideLabelBox } from '../render/labelPosition';
import type { RenderContext } from '../render/types';
import { placeholderShape } from './placeholder';
import type { MinimapPainter, SceneLevel, SceneRenderer, ShapeDefinition, ShapeProperty, ShapeTemplate } from './types';
import { outlinePainter } from './utils/minimap';

export interface ResolvedShape {
  definition: ShapeDefinition;
  /** Faux si aucune définition ne correspond : c'est le placeholder qui dessine. */
  supported: boolean;
}

/**
 * Registre des formes (SPEC §8.2) : ajouter une forme = écrire sa définition dans son dossier (`SHAPE_DEFINITIONS`).
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

  /**
   * Zone du texte d'une forme au niveau demandé (celle du rendu qui la dessine : repli sur `flat`) ;
   * les bornes si la définition n'en donne pas ; à côté des bornes pour un label hors de la forme (comme
   * draw.io, qui n'applique la zone propre à la forme qu'à un label centré). Source commune du label
   * dessiné et de l'éditeur en place.
   */
  textZone(shape: ShapeModel, level: SceneLevel): Rect {
    const outside = outsideLabelBox(shape.bounds, shape.style);
    if (outside) return outside;
    const { definition } = this.resolve(shape);
    const drawn = level !== 'flat' && definition[level] ? level : 'flat';
    return definition.textZone?.(shape, drawn) ?? shape.bounds;
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

  /**
   * Le point (coordonnées page, déjà dans les bornes) est-il dans la forme ? Celui de la définition, sinon dans le
   * contour (`outline` : contour déjà calculé, ex. mémorisé par l'appelant), sinon vrai (les bornes).
   */
  contains(shape: ShapeModel, point: Point, outline?: () => Point[] | undefined): boolean {
    const { definition } = this.resolve(shape);
    if (definition.contains) return definition.contains(shape, point);
    const path = outline ? outline() : definition.outline?.(shape);
    return !path || path.length < 3 || insidePolygon(path, point);
  }

  /** Poignées de redimensionnement ? */
  isResizable(shape: ShapeModel): boolean {
    return this.resolve(shape).definition.resizable !== false;
  }

  /** Peut-on y accrocher une flèche ? */
  isConnectable(shape: ShapeModel): boolean {
    return this.resolve(shape).definition.connectable !== false;
  }

  /** Prise au clic et au rectangle de sélection (une forme `withLink` seulement si elle porte un lien) ? */
  isPickable(shape: ShapeModel): boolean {
    return this.resolve(shape).definition.pickable !== 'withLink' || shape.link !== undefined;
  }

  /** Saisir une forme qu'elle contient la déplace elle, d'un bloc ? */
  movesAsBlock(shape: ShapeModel): boolean {
    return this.resolve(shape).definition.movesAsBlock === true;
  }

  /** Réglages propres à la forme (panneau). */
  properties(shape: ShapeModel): ShapeProperty[] {
    return this.resolve(shape).definition.properties ?? [];
  }

  /** Modèles de la palette de toutes les formes, par rang (`order`). */
  templates(): ShapeTemplate[] {
    return this.definitions
      .flatMap((definition) => definition.templates ?? [])
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  /** Modèle de la palette d'une forme (la variante qu'elle est, d'après son style) ; `undefined` : aucun. */
  templateOf(shape: ShapeModel): ShapeTemplate | undefined {
    const { definition, supported } = this.resolve(shape);
    const templates = definition.templates ?? [];
    if (!supported || templates.length === 0) return undefined;
    if (!definition.templateOf) return templates.length === 1 ? templates[0] : undefined;
    const id = definition.templateOf(shape.style);
    return templates.find((template) => template.id === id);
  }

  /** Aperçu de la forme dans les styles du panneau (contenu SVG, cadre `0 0 40 28`) ; repli sur le rectangle. */
  swatch(shape: ShapeModel): string {
    const { definition } = this.resolve(shape);
    return definition.swatch?.(shape.style) ?? rectangleSwatch(shape.style);
  }
}

function rectangleSwatch(style: Record<string, string>): string {
  return `<rect x="5" y="5" width="30" height="18" rx="${style.rounded === '1' ? 4 : 0}"/>`;
}

/**
 * Formes supportées (SPEC §8.3) : une par dossier (`<forme>/index.ts`, qui exporte `definition`), collectées toutes
 * seules ; le code commun aux formes est dans `utils/`.
 */
export const SHAPE_DEFINITIONS: ShapeDefinition[] = Object.values(
  import.meta.glob<ShapeDefinition>('./*/index.ts', { eager: true, import: 'definition' }),
);

/** Registre des formes supportées. */
export function createDefaultRegistry(): ShapeRegistry {
  const registry = new ShapeRegistry();
  for (const definition of SHAPE_DEFINITIONS) registry.register(definition);
  return registry;
}

/** Registre par défaut, partagé par l'appli (palette, panneau) et le moteur quand on ne lui en donne pas. */
export const defaultShapeRegistry = createDefaultRegistry();
