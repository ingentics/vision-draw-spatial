import type { Element } from '@xmldom/xmldom';
import type { LayerModel, ParseWarning, Point, Rect } from '../model/types';
import { childElements, type PageTree } from './xmlTree';

/**
 * Index des cellules brutes d'une page (SPEC §7) : lecture des `<mxCell>`, calques, calque et emprise absolue de
 * chaque cellule. Les avertissements (doublon, parent introuvable, cycle) vont dans `warnings`, au moment où la
 * cellule est consultée, comme le parcours de `parseGraphModel` les rencontre.
 */

export interface RawGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  relative: boolean;
  points: Point[];
  sourcePoint?: Point;
  targetPoint?: Point;
  offset?: Point;
}

export interface RawCell {
  id: string;
  parent?: string;
  label: string;
  styleString: string;
  vertex: boolean;
  edge: boolean;
  source?: string;
  target?: string;
  visible: boolean;
  geometry?: RawGeometry;
  attributes: Record<string, string>;
  link?: string;
  placeholders: boolean;
  order: number;
}

export class CellIndex {
  /** Cellules dans l'ordre du fichier (doublons compris). */
  readonly cells: RawCell[];
  /** Première cellule de chaque id. */
  readonly byId = new Map<string, RawCell>();
  readonly layers: LayerModel[];
  private readonly rootIds: Set<string>;
  private readonly fallbackLayerId: string;
  private readonly layerCache = new Map<string, string>();
  private readonly boundsCache = new Map<string, Rect>();
  private readonly visiting = new Set<string>();

  constructor(
    private readonly page: PageTree,
    private readonly warnings: ParseWarning[],
  ) {
    this.cells = readCells(page, warnings);
    for (const cell of this.cells) {
      if (this.byId.has(cell.id)) this.warn(cell.id, 'Identifiant de cellule dupliqué');
      else this.byId.set(cell.id, cell);
    }
    this.rootIds = new Set(this.cells.filter((c) => !c.parent && !c.vertex && !c.edge).map((c) => c.id));
    this.layers = this.cells
      .filter((c) => this.isLayer(c))
      .map((c) => ({ id: c.id, name: c.label, visible: c.visible }));
    this.fallbackLayerId = this.layers[0]?.id ?? '';
  }

  warn(cellId: string, message: string): void {
    this.warnings.push({ pageId: this.page.id, cellId, message });
  }

  isRoot(cell: RawCell): boolean {
    return this.rootIds.has(cell.id);
  }

  isLayer(cell: RawCell): boolean {
    return !cell.vertex && !cell.edge && cell.parent !== undefined && this.rootIds.has(cell.parent);
  }

  /** Calque d'une cellule : on remonte les parents jusqu'à une cellule-calque. */
  layerOf(cell: RawCell): string {
    const cached = this.layerCache.get(cell.id);
    if (cached !== undefined) return cached;
    let current: RawCell | undefined = cell;
    const seen = new Set<string>();
    let result = this.fallbackLayerId;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      if (this.isLayer(current)) {
        result = current.id;
        break;
      }
      current = current.parent ? this.byId.get(current.parent) : undefined;
    }
    this.layerCache.set(cell.id, result);
    return result;
  }

  /** Emprise absolue d'un vertex : les coordonnées draw.io sont relatives au parent. */
  absoluteBounds(cell: RawCell): Rect {
    const cached = this.boundsCache.get(cell.id);
    if (cached) return cached;

    const geo = cell.geometry;
    const parentRect = this.parentVertexBounds(cell);
    let rect: Rect;
    if (!geo) {
      rect = { x: parentRect?.x ?? 0, y: parentRect?.y ?? 0, width: 0, height: 0 };
    } else if (geo.relative && parentRect) {
      // Géométrie relative (ex. port) : x, y sont des fractions de la taille du parent.
      rect = {
        x: parentRect.x + geo.x * parentRect.width + (geo.offset?.x ?? 0),
        y: parentRect.y + geo.y * parentRect.height + (geo.offset?.y ?? 0),
        width: geo.width,
        height: geo.height,
      };
    } else {
      rect = { x: (parentRect?.x ?? 0) + geo.x, y: (parentRect?.y ?? 0) + geo.y, width: geo.width, height: geo.height };
    }
    this.boundsCache.set(cell.id, rect);
    return rect;
  }

  /** Emprise du parent si c'est un vertex (groupe, conteneur), sinon undefined (calque : origine). */
  parentVertexBounds(cell: RawCell): Rect | undefined {
    if (!cell.parent) return undefined;
    const parent = this.byId.get(cell.parent);
    if (!parent) {
      this.warn(cell.id, `Parent introuvable : ${cell.parent}`);
      return undefined;
    }
    if (!parent.vertex) return undefined;
    if (this.visiting.has(parent.id)) {
      this.warn(cell.id, 'Cycle dans la hiérarchie des parents');
      return undefined;
    }
    this.visiting.add(cell.id);
    const rect = this.absoluteBounds(parent);
    this.visiting.delete(cell.id);
    return rect;
  }
}

/** Attributs de `<object>` / `<UserObject>` qui ne sont pas des attributs personnalisés. */
const OBJECT_RESERVED_ATTRIBUTES = new Set(['id', 'label', 'link', 'placeholders']);

function readCells(page: PageTree, warnings: ParseWarning[]): RawCell[] {
  return page.cellList.map((nodes, order) => {
    const { id, cell: cellEl, wrapper, element } = nodes;
    if (nodes.generatedId) {
      warnings.push({ pageId: page.id, message: `Cellule sans id (<${element.tagName}>), identifiant généré : ${id}` });
    }

    const attributes: Record<string, string> = {};
    if (wrapper) {
      for (let i = 0; i < wrapper.attributes.length; i++) {
        const attr = wrapper.attributes.item(i);
        if (attr && !OBJECT_RESERVED_ATTRIBUTES.has(attr.name)) attributes[attr.name] = attr.value;
      }
    }

    return {
      id,
      parent: cellEl?.getAttribute('parent') || undefined,
      label: (wrapper ? wrapper.getAttribute('label') : cellEl?.getAttribute('value')) ?? '',
      styleString: cellEl?.getAttribute('style') ?? '',
      vertex: cellEl?.getAttribute('vertex') === '1',
      edge: cellEl?.getAttribute('edge') === '1',
      source: cellEl?.getAttribute('source') || undefined,
      target: cellEl?.getAttribute('target') || undefined,
      visible: cellEl?.getAttribute('visible') !== '0',
      geometry: nodes.geometry ? readGeometry(nodes.geometry) : undefined,
      attributes,
      link: wrapper?.getAttribute('link') ?? undefined,
      placeholders: wrapper?.getAttribute('placeholders') === '1',
      order,
    } satisfies RawCell;
  });
}

function readGeometry(el: Element): RawGeometry {
  const geometry: RawGeometry = {
    x: num(el, 'x'),
    y: num(el, 'y'),
    width: num(el, 'width'),
    height: num(el, 'height'),
    relative: el.getAttribute('relative') === '1',
    points: [],
  };

  for (const child of childElements(el)) {
    const as = child.getAttribute('as');
    if (child.tagName === 'mxPoint') {
      if (as === 'sourcePoint') geometry.sourcePoint = readPoint(child);
      else if (as === 'targetPoint') geometry.targetPoint = readPoint(child);
      else if (as === 'offset') geometry.offset = readPoint(child);
    } else if (child.tagName === 'Array' && as === 'points') {
      geometry.points = childElements(child, 'mxPoint').map(readPoint);
    }
  }
  return geometry;
}

function readPoint(el: Element): Point {
  return { x: num(el, 'x'), y: num(el, 'y') };
}

function num(el: Element, name: string): number {
  const value = parseFloat(el.getAttribute(name) ?? '');
  return Number.isFinite(value) ? value : 0;
}
