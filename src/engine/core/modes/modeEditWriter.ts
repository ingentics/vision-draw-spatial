import {
  gridSizeOf,
  resizeCell,
  setCellLabel,
  setCellObjectAttribute,
  setCellStyleValue,
  setLabelPlacement,
  setPageAttribute,
} from '../format/cellEdits';
import { addEdgeLabelCell, removeCells, removeCellsDeep } from '../format/create';
import { sendToBackInOrder } from '../format/order';
import { snapshotPage } from '../format/xmlTree';
import type { PageTree } from '../format/xmlTree';
import type { EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';
import type { ReadonlyPageModel } from '../model/readonly';
import type { EdgeEnd, EndTextGap } from '../edit/edgeLabels';
import { SPATIAL_PREFIX, spatialValue } from '../spatial';
import { END_TEXT_GAP, edgeTextLayout, endLabelOf } from '../edit/edgeLabels';
import { canMoveShape, isLocked } from '../edit/moveSet';
import { readonlyModel } from '../model/freeze';
import { approximateMeasure } from '../render/richLayout';
import type { MeasureText } from '../render/richLayout';
import { modeKey } from './modeKeys';
import type { ModeKeyOwner } from './modeKeys';
import type { ModeEdit, ModeEditContext } from './modeEdit';
import { byId, edgeOf, shapeOf } from '../model/pageIndex';

/** Clé du style draw.io écrite par un mode : ni `;`, ni `=`, ni espace (sujet 301). */
const STYLE_KEY_PATTERN = /^[A-Za-z][\w.:-]*$/;
/** Clés du style qu'un mode n'écrit pas : celles qui verrouillent l'élément (sujet 301). */
const LOCK_KEYS: ReadonlySet<string> = new Set(['locked', 'movable', 'resizable', 'editable', 'deletable']);

/**
 * Contexte par défaut (tests, sans moteur) : pas de couleurs proposées, textes de bout aux paramètres par défaut, mesure
 * du texte approchée.
 */
export const DEFAULT_MODE_EDIT_CONTEXT: ModeEditContext = {
  palette: [],
  endText: { size: 9, color: '#808080', gap: END_TEXT_GAP },
  measureText: approximateMeasure,
};

/** Texte de bout d'une flèche par emplacement : sa cellule (connue à l'écriture s'il est créé), s'il existe. */
interface EndTextCell {
  id: string | undefined;
  exists: boolean;
  replaced: boolean;
}

/**
 * Écritures d'une opération du mode `owner` sur l'arbre d'une page (sujets 179, 265, 288, 301, 302), sans annulation ni
 * relecture du modèle. Les attributs du mode, désignés par leur nom court, sont écrits sous
 * `spatial.<espace de noms>.<nom>` : sur `<diagram>` pour la page ; pour un élément, là où l'attribut est déjà (objet),
 * sinon dans le style. Un élément verrouillé (`locked`, `movable=0`) ne change ni de style, ni de bornes, ni de place
 * dans l'ordre, ni de textes de bout ; une clé invalide lève une exception. Les valeurs sont suivies au fil des
 * écritures : une écriture identique à la valeur en place est ignorée. Les écritures sont rassemblées, puis appliquées à
 * l'arbre par `apply` une fois l'opération terminée : une opération qui lève une exception n'écrit rien.
 */
export class ModeEditWriter implements ModeEdit {
  readonly page: ReadonlyPageModel;
  readonly palette: readonly string[];
  readonly gridSize: number;
  readonly measureText: MeasureText;
  // Champs privés du langage (`#`), pas seulement de TypeScript : l'objet est remis au mode, qui ne doit atteindre ni
  // la page modifiable, ni l'arbre, ni les écritures en attente.
  readonly #model: PageModel;
  readonly #pageTree: PageTree;
  readonly #owner: ModeKeyOwner;
  readonly #context: ModeEditContext;
  readonly #elements: Map<string, ShapeModel | EdgeModel>;
  /** Valeurs déjà écrites dans l'opération, par emplacement (élément et clé). */
  readonly #written = new Map<string, string | undefined>();
  /** Bornes déjà écrites dans l'opération, par forme. */
  readonly #resized = new Map<string, Rect>();
  readonly #endTexts = new Map<string, EndTextCell>();
  /** Écritures dans l'arbre, dans l'ordre ; chacune dit si elle a changé quelque chose. */
  readonly #writes: Array<() => boolean> = [];

  constructor(
    model: PageModel,
    pageTree: PageTree,
    owner: ModeKeyOwner,
    context: ModeEditContext = DEFAULT_MODE_EDIT_CONTEXT,
  ) {
    this.#model = model;
    this.#pageTree = pageTree;
    this.#owner = owner;
    this.#context = context;
    this.page = readonlyModel(model);
    this.palette = context.palette;
    this.gridSize = gridSizeOf(pageTree);
    this.measureText = context.measureText;
    this.#elements = new Map([...model.shapes, ...model.edges].map((element) => [element.id, element]));
  }

  setPageAttribute(name: string, value: string | undefined): void {
    const key = modeKey(this.#owner.namespace, name);
    const slot = `\n${key}`;
    const diagram = this.#pageTree.diagram;
    const current = this.#written.has(slot)
      ? this.#written.get(slot)
      : diagram?.hasAttribute(key)
        ? diagram.getAttribute(key)
        : undefined;
    if (current === value) return;
    this.#written.set(slot, value);
    this.#writes.push(() => setPageAttribute(this.#pageTree, key, value));
  }

  setElementAttribute(elementId: string, name: string, value: string | undefined): void {
    const key = modeKey(this.#owner.namespace, name);
    const element = this.#elements.get(elementId);
    // `;` sépare les clés du style draw.io.
    const text = value?.replaceAll(';', '');
    const slot = `${elementId}\n${key}`;
    const current = this.#written.has(slot) ? this.#written.get(slot) : element && spatialValue(element, key);
    if (!element || isLocked(element) || current === text) return;
    this.#written.set(slot, text);
    const pageTree = this.#pageTree;
    this.#writes.push(() => {
      if (text === undefined) {
        if (element.attributes[key] !== undefined) setCellObjectAttribute(pageTree, elementId, key, undefined);
        setCellStyleValue(pageTree, elementId, key, undefined);
        return true;
      }
      const inObject = element.attributes[key] !== undefined && element.style[key] === undefined;
      if (!inObject || !setCellObjectAttribute(pageTree, elementId, key, text)) {
        setCellStyleValue(pageTree, elementId, key, text);
      }
      return true;
    });
  }

  setElementStyle(elementId: string, key: string, value: string | undefined): void {
    if (!STYLE_KEY_PATTERN.test(key) || key.startsWith(SPATIAL_PREFIX) || LOCK_KEYS.has(key))
      throw new Error(`clé de style refusée à un mode : « ${key} »`);
    const element = this.#elements.get(elementId);
    const text = value?.replaceAll(';', '');
    const slot = `${elementId}\n${key}`;
    const current = this.#written.has(slot) ? this.#written.get(slot) : element?.style[key];
    if (!element || isLocked(element) || current === text) return;
    this.#written.set(slot, text);
    this.#writes.push(() => {
      setCellStyleValue(this.#pageTree, elementId, key, text);
      return true;
    });
  }

  setShapeBounds(shapeId: string, bounds: Rect): void {
    const shape = shapeOf(this.#model, shapeId);
    if (!shape || !canMoveShape(this.#pageTree, shape)) return;
    const current = this.#resized.get(shapeId) ?? shape.bounds;
    const delta = {
      x: bounds.x - current.x,
      y: bounds.y - current.y,
      width: bounds.width - current.width,
      height: bounds.height - current.height,
    };
    if (Object.values(delta).every((d) => d === 0)) return;
    this.#resized.set(shapeId, bounds);
    this.#writes.push(() => {
      resizeCell(this.#pageTree, shapeId, delta);
      return true;
    });
  }

  setEdgeEndText(
    edgeId: string,
    end: EdgeEnd,
    text: string | undefined,
    direction: Point,
    margin: Partial<EndTextGap> = {},
  ): void {
    const edge = edgeOf(this.#model, edgeId);
    if (!edge || isLocked(edge)) return;
    const slot = `${edgeId}\ntext ${end}`;
    // Texte déjà là (fichier, ou écrit plus tôt dans l'opération) à ce bout.
    let cell = this.#endTexts.get(slot);
    if (!cell) {
      const id = endLabelOf(edge, end)?.id;
      cell = { id, exists: id !== undefined, replaced: false };
      this.#endTexts.set(slot, cell);
    }
    const target = cell;
    const pageTree = this.#pageTree;
    if (text === undefined) {
      if (!target.exists) return;
      target.exists = false;
      target.replaced = true;
      this.#writes.push(() => {
        removeCells(pageTree, [target.id!]);
        target.id = undefined;
        return true;
      });
      return;
    }
    // Configuration d'un texte créé à ce bout (comme `EdgeTexts.setEdgeEndLabel`), sur une flèche réduite à sa
    // direction.
    // `direction` part du bout : la flèche réduite va donc du bout vers lui au début, de lui vers le bout à la fin.
    const origin = { x: 0, y: 0 };
    const route = end === 'start' ? [origin, direction] : [direction, origin];
    const { along, across } = this.#context.endText.gap;
    const gap = { along: along + (margin.along ?? 0), across: across + (margin.across ?? 0) };
    const layout = edgeTextLayout(route, end, false, gap);
    const style: Record<string, string> = {
      fontSize: String(this.#context.endText.size),
      fontColor: this.#context.endText.color,
      align: layout.align,
      verticalAlign: layout.verticalAlign,
    };
    // Texte du fichier encore en place (ni retiré ni récrit dans l'opération) : on ne récrit pas le même.
    const current = target.replaced ? undefined : byId(edge.labels, target.id);
    const { placement } = layout;
    const same =
      current &&
      current.label === text &&
      current.placement.position === placement.position &&
      current.placement.distance === placement.distance &&
      current.placement.offset.x === placement.offset.x &&
      current.placement.offset.y === placement.offset.y &&
      Object.entries(style).every(([key, value]) => current.style[key] === value);
    if (same) return;
    target.exists = true;
    target.replaced = true;
    this.#writes.push(() => {
      target.id ??= addEdgeLabelCell(pageTree, edgeId, { value: '', position: placement.position });
      setCellLabel(pageTree, target.id, text);
      setLabelPlacement(pageTree, target.id, placement);
      for (const [key, value] of Object.entries(style)) setCellStyleValue(pageTree, target.id, key, value);
      return true;
    });
  }

  removeEdge(edgeId: string): void {
    const edge = edgeOf(this.#model, edgeId);
    const slot = `${edgeId}\nremoved`;
    if (!edge || isLocked(edge) || this.#written.has(slot)) return;
    this.#written.set(slot, undefined);
    // Ses textes (cellules enfants) partent avec elle.
    this.#writes.push(() => {
      removeCellsDeep(this.#pageTree, [edgeId]);
      return true;
    });
  }

  sendToBack(shapeIds: readonly string[]): void {
    const locked = new Set(this.#model.shapes.filter(isLocked).map((shape) => shape.id));
    const ids = shapeIds.filter((id) => !locked.has(id));
    this.#writes.push(() => sendToBackInOrder(this.#pageTree, ids));
  }

  /**
   * Écritures rassemblées appliquées à l'arbre, dans l'ordre ; vrai si quelque chose a changé. Une écriture qui échoue
   * en route (ex. cellule disparue de l'arbre) : la page revient à l'état d'avant les écritures de l'opération (sujet
   * 302), l'erreur remonte comme une opération en panne.
   */
  apply(): boolean {
    if (this.#writes.length === 0) return false;
    const restore = snapshotPage(this.#pageTree);
    let changed = false;
    try {
      for (const write of this.#writes) changed = write() || changed;
    } catch (error) {
      restore();
      throw error;
    }
    return changed;
  }
}

/**
 * Opération `edit` du mode `owner` sur la page : ses écritures (`ModeEditWriter`) appliquées à l'arbre une fois
 * l'opération terminée ; vrai si quelque chose a changé. Les autres clés du style draw.io passent par
 * `setElementStyle` (ni `spatial.*`, ni clé de verrou), les bornes d'une forme par `setShapeBounds` (sujet 179), les
 * labels enfants d'une flèche par `setEdgeEndText` (sujet 265).
 */
export function applyModeEdit(
  page: PageModel,
  pageTree: PageTree,
  owner: ModeKeyOwner,
  edit: (edit: ModeEdit) => void,
  context: ModeEditContext = DEFAULT_MODE_EDIT_CONTEXT,
): boolean {
  const writer = new ModeEditWriter(page, pageTree, owner, context);
  edit(writer);
  return writer.apply();
}
