import { XMLSerializer, type Element } from '@xmldom/xmldom';
import type { Point } from '../model/types';
import { appendIndented, ensureLayer, ensureRoot, newCellId } from './create';
import { decodeDiagram } from './decode';
import { formatNumber } from './edit';
import { childElements, markPageDirty, parseXml, reindexPage } from './xmlTree';
import type { PageTree } from './xmlTree';

/**
 * Copier-coller (ticket 59) au format du presse-papier de draw.io : un `<mxGraphModel>` autonome
 * (cellule racine `0`, calque `1`, puis les cellules copiées). Les cellules du haut de la copie y
 * sont rattachées au calque, en coordonnées absolues ; leurs descendants gardent leur géométrie
 * relative. Coller recrée les cellules avec de nouveaux id, sans toucher au reste de la page.
 */

export interface CopyOptions {
  /** Coin haut-gauche absolu d'un vertex de la page (emprise du modèle). */
  origin: (cellId: string) => Point | undefined;
  /** Bout dessiné d'une flèche, en coordonnées absolues (pour un bout dont la forme n'est pas copiée). */
  edgeEnd: (edgeId: string, end: 'source' | 'target') => Point | undefined;
}

/**
 * Contenu du presse-papier pour ces cellules : elles, leurs descendants (contenu d'un conteneur,
 * labels d'une flèche) et les flèches entre cellules copiées. Une flèche copiée dont un bout ne
 * l'est pas garde ce bout en point libre, à sa position actuelle. Undefined : rien à copier.
 */
export function copyCells(page: PageTree, cellIds: Iterable<string>, options: CopyOptions): string | undefined {
  const copied = new Set([...cellIds].filter((id) => page.cells.get(id)?.cell));
  if (copied.size === 0) return undefined;
  for (let grew = true; grew;) {
    grew = false;
    for (const { id, cell } of page.cellList) {
      if (copied.has(id) || !cell) continue;
      const parent = cell.getAttribute('parent');
      const source = cell.getAttribute('source');
      const target = cell.getAttribute('target');
      const between = cell.getAttribute('edge') === '1' && source && target && copied.has(source) && copied.has(target);
      if ((parent && copied.has(parent)) || between) {
        copied.add(id);
        grew = true;
      }
    }
  }

  const document = parseXml('<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>');
  const rootEl = childElements(document.documentElement!, 'root')[0]!;
  for (const nodes of page.cellList) {
    if (!copied.has(nodes.id) || !nodes.cell) continue;
    const clone = document.importNode(nodes.element, true) as Element;
    const cell = clone.tagName === 'mxCell' ? clone : childElements(clone, 'mxCell')[0]!;
    const geometry = childElements(cell, 'mxGeometry')[0];
    const parentId = cell.getAttribute('parent') ?? '';
    const isRoot = !copied.has(parentId);
    // Repère de la géométrie : origine absolue du parent (calque : origine de la page).
    const frame = options.origin(parentId) ?? ZERO;
    if (isRoot) cell.setAttribute('parent', '1');

    if (cell.getAttribute('edge') === '1') {
      if (isRoot && geometry) shiftPoints(geometry, frame);
      for (const end of ['source', 'target'] as const) {
        const terminal = cell.getAttribute(end);
        if (!terminal || copied.has(terminal)) continue;
        cell.removeAttribute(end);
        const point = options.edgeEnd(nodes.id, end);
        if (point && geometry) {
          const local = isRoot ? point : { x: point.x - frame.x, y: point.y - frame.y };
          setPoint(geometry, `${end}Point`, local);
        }
      }
    } else if (isRoot && geometry) {
      // Vertex du haut : position absolue (une géométrie relative, ex. un port, devient absolue).
      const origin = options.origin(nodes.id);
      if (origin) {
        geometry.removeAttribute('relative');
        for (const offset of childElements(geometry, 'mxPoint')) {
          if (offset.getAttribute('as') === 'offset') geometry.removeChild(offset);
        }
        setNumber(geometry, 'x', origin.x);
        setNumber(geometry, 'y', origin.y);
      }
    }
    rootEl.appendChild(clone);
  }
  return new XMLSerializer().serializeToString(document);
}

/**
 * `<mxGraphModel>` lu dans un texte du presse-papier : XML en clair, encodé en URI (`%3CmxGraphModel…`),
 * compressé comme une page draw.io, ou fichier `<mxfile>` entier (sa première page). Undefined sinon,
 * ou s'il ne contient aucune forme ni flèche.
 */
export function readClipboardModel(text: string): Element | undefined {
  let xml = text.trim();
  if (!xml) return undefined;
  try {
    if (/^%3C/i.test(xml)) xml = decodeURIComponent(xml);
    else if (!xml.startsWith('<')) xml = decodeDiagram(xml);
    let root = parseXml(xml).documentElement;
    if (root?.tagName === 'mxfile') {
      const diagram = childElements(root, 'diagram')[0];
      if (!diagram) return undefined;
      root =
        childElements(diagram, 'mxGraphModel')[0] ?? parseXml(decodeDiagram(diagram.textContent ?? '')).documentElement;
    }
    return root?.tagName === 'mxGraphModel' && contentCells(root).length > 0 ? root : undefined;
  } catch {
    return undefined;
  }
}

export interface PasteOptions {
  /** Décalage appliqué aux cellules du haut. */
  delta: Point;
  /**
   * Parent où recoller une cellule du haut (par son id dans le presse-papier) et son origine
   * absolue ; undefined = sur le calque.
   */
  parentOf?: (clipboardId: string) => { id: string; origin: Point } | undefined;
}

/**
 * Colle un `<mxGraphModel>` du presse-papier sur la page : nouvelles cellules (nouveaux id), flèches
 * rebranchées sur les copies, cellules du haut sur le premier calque (ou le parent donné) et
 * décalées. Renvoie les id des nouvelles cellules du haut (à sélectionner).
 */
export function pasteCells(page: PageTree, model: Element, options: PasteOptions): string[] {
  if (page.encoding === 'unreadable') throw new Error(`Page ${page.id} illisible : collage impossible`);
  const entries = contentCells(model);
  if (entries.length === 0) return [];

  const rootEl = ensureRoot(page);
  const document = rootEl.ownerDocument!;
  const layerId = ensureLayer(page, rootEl);
  const newIds = new Map(entries.map(({ id }) => [id, newCellId(page)]));
  const roots: string[] = [];
  for (const { id, element } of entries) {
    const clone = document.importNode(element, true) as Element;
    const cell = clone.tagName === 'mxCell' ? clone : childElements(clone, 'mxCell')[0]!;
    const geometry = childElements(cell, 'mxGeometry')[0];
    clone.setAttribute('id', newIds.get(id)!);
    const parent = newIds.get(cell.getAttribute('parent') ?? '');
    if (parent) {
      cell.setAttribute('parent', parent);
    } else {
      const target = options.parentOf?.(id);
      cell.setAttribute('parent', target?.id ?? layerId);
      const shift = {
        x: options.delta.x - (target?.origin.x ?? 0),
        y: options.delta.y - (target?.origin.y ?? 0),
      };
      if (geometry && cell.getAttribute('edge') === '1') shiftPoints(geometry, shift);
      else if (geometry && geometry.getAttribute('relative') !== '1') {
        setNumber(geometry, 'x', numberOf(geometry, 'x') + shift.x);
        setNumber(geometry, 'y', numberOf(geometry, 'y') + shift.y);
      }
      roots.push(newIds.get(id)!);
    }
    for (const end of ['source', 'target'] as const) {
      const terminal = cell.getAttribute(end);
      if (!terminal) continue;
      const mapped = newIds.get(terminal);
      if (mapped) cell.setAttribute(end, mapped);
      else cell.removeAttribute(end);
    }
    appendIndented(rootEl, clone);
  }
  reindexPage(page);
  markPageDirty(page);
  return roots;
}

/** Formes et flèches d'un modèle (sans la cellule racine ni les calques), avec un id. */
function contentCells(model: Element): Array<{ id: string; element: Element; cell: Element }> {
  const rootEl = childElements(model, 'root')[0];
  return (rootEl ? childElements(rootEl) : []).flatMap((element) => {
    const cell = element.tagName === 'mxCell' ? element : childElements(element, 'mxCell')[0];
    const id = element.getAttribute('id');
    const content = cell && (cell.getAttribute('vertex') === '1' || cell.getAttribute('edge') === '1');
    return id && cell && content ? [{ id, element, cell }] : [];
  });
}

const ZERO: Point = { x: 0, y: 0 };

/** Décale les points d'une géométrie de flèche (bouts libres, points de passage), pas le décalage du label. */
function shiftPoints(geometry: Element, delta: Point): void {
  if (delta.x === 0 && delta.y === 0) return;
  const points = [
    ...childElements(geometry, 'mxPoint').filter((p) => p.getAttribute('as') !== 'offset'),
    ...childElements(geometry, 'Array').flatMap((array) => childElements(array, 'mxPoint')),
  ];
  for (const point of points) {
    setNumber(point, 'x', numberOf(point, 'x') + delta.x);
    setNumber(point, 'y', numberOf(point, 'y') + delta.y);
  }
}

function setPoint(geometry: Element, as: string, point: Point): void {
  let element = childElements(geometry, 'mxPoint').find((p) => p.getAttribute('as') === as);
  if (!element) {
    element = geometry.ownerDocument!.createElement('mxPoint');
    element.setAttribute('as', as);
    geometry.appendChild(element);
  }
  setNumber(element, 'x', point.x);
  setNumber(element, 'y', point.y);
}

function numberOf(element: Element, name: string): number {
  const value = parseFloat(element.getAttribute(name) ?? '');
  return Number.isFinite(value) ? value : 0;
}

/** Écrit une coordonnée ; 0 = attribut absent, comme draw.io. */
function setNumber(element: Element, name: string, value: number): void {
  if (value === 0) element.removeAttribute(name);
  else element.setAttribute(name, formatNumber(value));
}
