import { CONNECT_SIDES } from '../edit/handleKinds';
import type { ConnectSide } from '../edit/handleKinds';
import type { Point, Rect } from '../model/types';
import type { ReadonlyShapeModel as ShapeModel } from '../model/readonly';
import { canvasBrush } from '../interaction/minimapBrush';
import { blockHeight } from '../render/iso/block';
import { outsideLabelBox } from '../render/labelPosition';
import type { RenderContext } from '../render/types';
import { placeholderShape } from './placeholder';
import type {
  MinimapMapping,
  PaletteCategory,
  SceneLevel,
  SceneRenderer,
  ShapeDefinition,
  ShapeProperty,
  ShapeTemplate,
} from './types';
import { outlinePainter } from './minimapOutline';
import { insidePolygon } from '../model/geometry';
import { styleFlag } from '../model/styleValues';
import { freezePlain, readonlyModel } from '../model/freeze';

/** Erreur levée par une forme (`hook` : point d'entrée, ex. `flat.create`), pour les Diagnostics. */
export type ShapeErrorHandler = (shapeId: string, hook: string, error: unknown) => void;

/** Ce que l'appli voit du registre des formes (sujet 304). */
export interface ShapeRegistryView {
  properties(shape: ShapeModel): ShapeProperty[];
  swatch(shape: ShapeModel): string;
  templates(): ShapeTemplate[];
  templateOf(shape: ShapeModel): ShapeTemplate | undefined;
}

export interface ResolvedShape {
  definition: ShapeDefinition;
  /** Faux si aucune définition ne correspond : c'est le placeholder qui dessine. */
  supported: boolean;
}

/**
 * Registre des formes (SPEC §8.2) : ajouter une forme = déposer son dossier dans `plugins/shapes/<catégorie>/` ; la racine
 * de composition (`plugins/index.ts`) les enregistre.
 * Le registre résout la définition d'une forme, puis le rendu d'un niveau avec repli sur `flat`.
 *
 * Il protège chaque appel à une forme (sujet 300) : une forme qui lève une exception n'arrête ni la lecture, ni le
 * rendu, ni le geste. Le point d'entrée est traité comme absent (repli indiqué par chaque méthode) et l'erreur va à
 * `onError` (le moteur la signale dans les Diagnostics), sinon à la console.
 */
export class ShapeRegistry {
  constructor(
    private readonly fallback: ShapeDefinition = placeholderShape,
    private readonly definitions: ShapeDefinition[] = [],
    private readonly onError?: ShapeErrorHandler,
    private readonly categoryList: PaletteCategory[] = [],
  ) {}

  /** Le même registre (mêmes formes, y compris celles enregistrées ensuite), dont les erreurs des formes vont à `onError`. */
  reportingTo(onError: ShapeErrorHandler): ShapeRegistry {
    return new ShapeRegistry(this.fallback, this.definitions, onError, this.categoryList);
  }

  /**
   * Catégorie de la palette des formes (sujet 306 : déclarée par la racine de composition, le tronc n'en connaît
   * aucune) ; un id déjà pris lève une exception.
   */
  registerCategory(category: PaletteCategory): this {
    if (this.categoryList.some((other) => other.id === category.id))
      throw new Error(`Catégorie ${category.id} : id déjà pris`);
    this.categoryList.push(freezePlain({ ...category }));
    return this;
  }

  /** Catégories de la palette des formes, par rang (`order`). */
  categories(): PaletteCategory[] {
    return [...this.categoryList].sort((a, b) => a.order - b.order);
  }

  /** Appel protégé du point d'entrée `hook` de `definition` : sa valeur, ou celle de `fallback` s'il lève une exception. */
  private guard<T>(definition: ShapeDefinition, hook: string, fallback: () => T, run: () => T): T {
    try {
      return run();
    } catch (error) {
      if (this.onError) this.onError(definition.id, hook, error);
      else console.error(`Forme ${definition.id} : erreur dans ${hook}`, error);
      return fallback();
    }
  }

  /** Un id déjà pris lève une exception (sujet 304) : une forme ne remplace pas une autre en silence. */
  register(definition: ShapeDefinition): this {
    if (this.definitions.some((other) => other.id === definition.id))
      throw new Error(`Forme ${definition.id} : id déjà pris`);
    // Gelée (sujet 303) : un plugin ne modifie pas la définition d'un autre.
    this.definitions.push(freezePlain(definition));
    return this;
  }

  /** Vue en lecture seule pour l'appli (sujet 304) : réglages, aperçus et modèles des formes, sans leurs fonctions. */
  view(): ShapeRegistryView {
    return {
      properties: (shape) => this.properties(shape),
      swatch: (shape) => this.swatch(shape),
      templates: () => this.templates(),
      templateOf: (shape) => this.templateOf(shape),
    };
  }

  /**
   * Définition d'une forme, de la plus précise à la plus générale (à égalité, la dernière enregistrée l'emporte) :
   * 1. une définition qui gère ce nom draw.io et dont la condition (`matches`) est vérifiée (rectangle arrondi) ;
   * 2. celle dont l'`id` est le nom de la forme (`spatial.kind=database`), sans condition ;
   * 3. une définition qui gère ce nom draw.io sans condition.
   * Une définition dont la condition lève une exception est ignorée pour cette forme.
   */
  resolve(shape: ShapeModel): ResolvedShape {
    let named: ShapeDefinition | undefined;
    let unconditional: ShapeDefinition | undefined;
    for (let i = this.definitions.length - 1; i >= 0; i--) {
      const definition = this.definitions[i]!;
      if ((definition.kinds ?? [definition.id]).includes(shape.kind)) {
        const { matches } = definition;
        if (matches) {
          const matched = this.guard(
            definition,
            'matches',
            () => undefined,
            () => matches(readonlyModel(shape)),
          );
          if (matched === undefined) continue;
          if (matched) return { definition, supported: true };
        } else unconditional ??= definition;
      }
      if (definition.id === shape.kind) named ??= definition;
    }
    const definition = named ?? unconditional;
    return definition ? { definition, supported: true } : { definition: this.fallback, supported: false };
  }

  /**
   * Rendu de scène d'une forme au niveau demandé ; repli sur le rendu à plat. Un rendu qui lève une exception est
   * remplacé par celui du placeholder.
   */
  sceneRenderer(shape: ShapeModel, level: SceneLevel): SceneRenderer {
    const { definition } = this.resolve(shape);
    const drawn = definition[level] ? level : 'flat';
    const renderer = definition[drawn] ?? definition.flat;
    if (definition === this.fallback) return renderer;
    const placeholder = this.fallback[level] ?? this.fallback.flat;
    return {
      create: (target, ctx) =>
        this.guard(
          definition,
          `${drawn}.create`,
          () => placeholder.create(target, ctx),
          () => renderer.create(readonlyModel(target), ctx),
        ),
    };
  }

  /** La forme a-t-elle un rendu propre à ce niveau (sinon elle se dessine à plat) ? */
  hasLevel(shape: ShapeModel, level: SceneLevel): boolean {
    return level === 'flat' || this.resolve(shape).definition[level] !== undefined;
  }

  /**
   * Zone du texte d'une forme au niveau demandé (celle du rendu qui la dessine : repli sur `flat`) ;
   * les bornes si la définition n'en donne pas ; à côté des bornes pour un label hors de la forme (comme
   * draw.io, qui n'applique la zone propre à la forme qu'à un label centré), sauf pour une forme qui place elle-même
   * son label (`editStyle`, ex. nom d'une région RDD sur son onglet). Source commune du label dessiné et de l'éditeur
   * en place.
   */
  textZone(shape: ShapeModel, level: SceneLevel): Rect {
    const { definition } = this.resolve(shape);
    const outside = !definition.editStyle && outsideLabelBox(shape.bounds, shape.style);
    if (outside) return outside;
    const drawn = level !== 'flat' && definition[level] ? level : 'flat';
    const { textZone } = definition;
    if (!textZone) return shape.bounds;
    return this.guard(
      definition,
      'textZone',
      () => shape.bounds,
      () => textZone(readonlyModel(shape), drawn) ?? shape.bounds,
    );
  }

  /** Hauteur du volume d'une forme en iso / 3D : celle propre à sa définition, sinon `blockHeight`. */
  volumeHeight(shape: ShapeModel, ctx: RenderContext): number {
    const { definition } = this.resolve(shape);
    const { volumeHeight } = definition;
    if (!volumeHeight) return blockHeight(shape, ctx);
    return this.guard(
      definition,
      'volumeHeight',
      () => blockHeight(shape, ctx),
      () => volumeHeight(readonlyModel(shape), ctx),
    );
  }

  /**
   * Dessin en mini-carte ; repli sur le contour. `undefined` = ne rien dessiner. La forme ne reçoit qu'un pinceau
   * (sujet 324), jamais le contexte 2D, partagé par toutes les formes et rendu tel quel après chacune ; un dessin qui
   * lève une exception est remplacé par les bornes.
   */
  minimapPainter(
    shape: ShapeModel,
  ): ((context: CanvasRenderingContext2D, shape: ShapeModel, map: MinimapMapping) => void) | undefined {
    const { definition } = this.resolve(shape);
    if (definition.minimap === null) return undefined;
    const { minimap } = definition;
    const outline = outlinePainter({ outline: (target) => this.outline(target) });
    if (!minimap) return (context, target, map) => outline(canvasBrush(context), target, map);
    const bounds = outlinePainter({});
    return (context, target, map) => {
      const brush = canvasBrush(context);
      context.save();
      const drawn = this.guard(
        definition,
        'minimap',
        () => false,
        () => {
          minimap(brush, readonlyModel(target), map);
          return true;
        },
      );
      context.restore();
      if (!drawn) bounds(brush, target, map);
    };
  }

  /** Contour de la forme (`outline`), undefined sans contour propre ou s'il lève une exception. */
  outline(shape: ShapeModel): Point[] | undefined {
    const { definition } = this.resolve(shape);
    const { outline } = definition;
    if (!outline) return undefined;
    return this.guard(
      definition,
      'outline',
      () => undefined,
      () => outline(readonlyModel(shape)),
    );
  }

  /**
   * Le point (coordonnées page, déjà dans les bornes) est-il dans la forme ? Celui de la définition, sinon dans le
   * contour (`outline` : contour déjà calculé, ex. mémorisé par l'appelant), sinon vrai (les bornes).
   */
  contains(shape: ShapeModel, point: Point, outline?: () => Point[] | undefined): boolean {
    const { definition } = this.resolve(shape);
    const { contains } = definition;
    // En panne : les bornes, où le point est déjà.
    if (contains)
      return this.guard(
        definition,
        'contains',
        () => true,
        () => contains(readonlyModel(shape), point),
      );
    const path = outline ? outline() : this.outline(shape);
    return !path || path.length < 3 || insidePolygon(path, point);
  }

  /** Style de l'éditeur en place de la forme, s'il diffère du sien (`editStyle`). */
  editStyle(shape: ShapeModel): Record<string, string> | undefined {
    const { definition } = this.resolve(shape);
    const { editStyle } = definition;
    if (!editStyle) return undefined;
    return this.guard(
      definition,
      'editStyle',
      () => undefined,
      () => editStyle(readonlyModel(shape.style)),
    );
  }

  /** Emprise prise au clic : celle de la définition, sinon les bornes. */
  hitBounds(shape: ShapeModel): Rect {
    const { definition } = this.resolve(shape);
    const { hitBounds } = definition;
    if (!hitBounds) return shape.bounds;
    return this.guard(
      definition,
      'hitBounds',
      () => shape.bounds,
      () => hitBounds(readonlyModel(shape)),
    );
  }

  /** Poignées de redimensionnement ? */
  isResizable(shape: ShapeModel): boolean {
    return this.resolve(shape).definition.resizable !== false;
  }

  /** Texte de la forme édité en texte brut, sans mise en forme (sujet 258) ? */
  isPlainText(shape: ShapeModel): boolean {
    return this.resolve(shape).definition.plainText === true;
  }

  /** Côtés aux poignées de connexion de la forme sélectionnée ; aucun si on ne peut pas y accrocher de flèche. */
  connectSides(shape: ShapeModel): readonly ConnectSide[] {
    const { definition } = this.resolve(shape);
    return definition.connectable === false ? [] : (definition.connectSides ?? CONNECT_SIDES);
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
      .flatMap((definition) => (definition.palette ? [{ id: definition.id, ...definition.palette }] : []))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  /** Modèle de la palette d'une forme : celui de sa définition ; `undefined` : aucun. */
  templateOf(shape: ShapeModel): ShapeTemplate | undefined {
    const { definition, supported } = this.resolve(shape);
    return supported && definition.palette ? { id: definition.id, ...definition.palette } : undefined;
  }

  /** Aperçu de la forme dans les styles du panneau (contenu SVG, cadre `0 0 40 28`) ; repli sur le rectangle. */
  swatch(shape: ShapeModel): string {
    const { definition } = this.resolve(shape);
    const { swatch } = definition;
    const fallback = () => rectangleSwatch(shape.style);
    return swatch ? this.guard(definition, 'swatch', fallback, () => swatch(readonlyModel(shape.style))) : fallback();
  }
}

function rectangleSwatch(style: Record<string, string>): string {
  return `<rect x="5" y="5" width="30" height="18" rx="${styleFlag(style, 'rounded') ? 4 : 0}"/>`;
}
