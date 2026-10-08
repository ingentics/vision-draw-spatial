import type { Document, Element, Node } from '@xmldom/xmldom';
import { formatNumber } from './cellEdits';
import { createEmptyDrawio, randomId } from './skeleton';
import { childElements, markPageDirty, parseXml, readDiagram, reindexPage } from './xmlTree';
import type { DrawioTree, PageTree } from './xmlTree';
import { byId } from '../model/pageIndex';

/**
 * Création dans l'arbre XML (SPEC §14.1, §14.2) : nouvelles cellules et nouvelles pages, ajoutées
 * comme des nœuds draw.io valides, sans toucher au reste du fichier. L'indentation des voisins est
 * reprise pour que le fichier reste lisible.
 */

export interface NewShape {
  /** Style draw.io complet (ex. `rounded=0;whiteSpace=wrap;html=1;`). */
  style: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Ajoute un vertex sur le premier calque de la page (créé s'il manque) et renvoie son id.
 * Une page vide reçoit d'abord un `<mxGraphModel>` en clair.
 */
export function addShapeCell(page: PageTree, shape: NewShape): string {
  if (page.encoding === 'unreadable') throw new Error(`Page ${page.id} illisible : ajout impossible`);
  const rootEl = ensureRoot(page);
  const document = ownerOf(rootEl);
  const layerId = ensureLayer(page, rootEl);

  const id = newCellId(page);
  const cell = document.createElement('mxCell');
  cell.setAttribute('id', id);
  cell.setAttribute('value', shape.value);
  cell.setAttribute('style', shape.style);
  cell.setAttribute('vertex', '1');
  cell.setAttribute('parent', layerId);
  const geometry = document.createElement('mxGeometry');
  for (const [name, value] of [
    ['x', shape.x],
    ['y', shape.y],
    ['width', shape.width],
    ['height', shape.height],
  ] as const) {
    if (value !== 0 || name === 'width' || name === 'height') geometry.setAttribute(name, formatNumber(value));
  }
  geometry.setAttribute('as', 'geometry');
  cell.appendChild(geometry);
  appendIndented(rootEl, cell);

  reindexPage(page);
  markPageDirty(page);
  return id;
}

/**
 * Ajoute une arête sur le premier calque (style des connecteurs draw.io), entre deux cellules ; un bout sans cellule
 * est libre (à poser ensuite avec `setEdgeTerminal`).
 */
export function addEdgeCell(page: PageTree, edge: { source?: string; target?: string; style: string }): string {
  if (page.encoding === 'unreadable') throw new Error(`Page ${page.id} illisible : ajout impossible`);
  for (const end of [edge.source, edge.target])
    if (end !== undefined && !page.cells.has(end)) throw new Error(`Cellule ${end} introuvable`);
  const rootEl = ensureRoot(page);
  const document = ownerOf(rootEl);
  const layerId = ensureLayer(page, rootEl);
  const id = newCellId(page);
  const cell = document.createElement('mxCell');
  cell.setAttribute('id', id);
  cell.setAttribute('style', edge.style);
  cell.setAttribute('edge', '1');
  cell.setAttribute('parent', layerId);
  if (edge.source !== undefined) cell.setAttribute('source', edge.source);
  if (edge.target !== undefined) cell.setAttribute('target', edge.target);
  const geometry = document.createElement('mxGeometry');
  geometry.setAttribute('relative', '1');
  geometry.setAttribute('as', 'geometry');
  cell.appendChild(geometry);
  appendIndented(rootEl, cell);
  reindexPage(page);
  markPageDirty(page);
  return id;
}

/**
 * Ajoute un label enfant à une arête, comme draw.io : vertex `edgeLabel` non connectable, géométrie
 * relative (`x` = position le long de l'arête, -1 = source, 1 = cible). Renvoie son id.
 */
export function addEdgeLabelCell(page: PageTree, edgeId: string, label: { value: string; position: number }): string {
  if (page.encoding === 'unreadable') throw new Error(`Page ${page.id} illisible : ajout impossible`);
  const edge = page.cells.get(edgeId)?.element;
  if (!edge?.parentNode) throw new Error(`Arête ${edgeId} introuvable`);
  const document = ownerOf(edge);
  const id = newCellId(page);
  const cell = document.createElement('mxCell');
  cell.setAttribute('id', id);
  cell.setAttribute('value', label.value);
  cell.setAttribute('style', 'edgeLabel;html=1;align=center;verticalAlign=middle;resizable=0;points=[];');
  cell.setAttribute('vertex', '1');
  cell.setAttribute('connectable', '0');
  cell.setAttribute('parent', edgeId);
  const geometry = document.createElement('mxGeometry');
  geometry.setAttribute('x', formatNumber(label.position));
  geometry.setAttribute('relative', '1');
  geometry.setAttribute('as', 'geometry');
  const offset = document.createElement('mxPoint');
  offset.setAttribute('as', 'offset');
  geometry.appendChild(offset);
  cell.appendChild(geometry);
  // Juste après l'arête (là où draw.io les écrit), avec la même indentation qu'elle.
  const parent = edge.parentNode as Element;
  const before = edge.previousSibling;
  const next = edge.nextSibling;
  if (before && isWhitespace(before)) parent.insertBefore(document.createTextNode(before.nodeValue!), next);
  parent.insertBefore(cell, next);
  reindexPage(page);
  markPageDirty(page);
  return id;
}

/**
 * Lien d'une cellule (attribut `link`, ex. `data:page/id,…`), absent = retiré. Comme draw.io,
 * une cellule sans enveloppe est d'abord enveloppée dans un `<UserObject>` qui reprend son id et
 * son label (`value` → `label`).
 */
export function setCellLink(page: PageTree, cellId: string, href: string | undefined): void {
  setCellWrapperAttribute(page, cellId, 'link', href);
}

/**
 * Attribut de l'enveloppe d'une cellule (ex. `link`, `tooltip`), absent ou vide = retiré. Une cellule sans
 * enveloppe est d'abord enveloppée dans un `<UserObject>`, comme pour un lien.
 */
export function setCellWrapperAttribute(page: PageTree, cellId: string, name: string, value: string | undefined): void {
  const nodes = page.cells.get(cellId);
  if (!nodes?.cell) throw new Error(`Cellule ${cellId} introuvable`);
  let wrapper = nodes.wrapper;
  if (!wrapper) {
    if (!value) return;
    const cell = nodes.cell;
    wrapper = ownerOf(cell).createElement('UserObject');
    wrapper.setAttribute('label', cell.getAttribute('value') ?? '');
    wrapper.setAttribute('id', cellId);
    cell.removeAttribute('value');
    cell.removeAttribute('id');
    cell.parentNode!.replaceChild(wrapper, cell);
    wrapper.appendChild(cell);
  }
  if (value) wrapper.setAttribute(name, value);
  else wrapper.removeAttribute(name);
  reindexPage(page);
  markPageDirty(page);
}

/**
 * Retire des cellules avec tout ce qui en dépend, comme la suppression de draw.io : leurs
 * descendants (contenu d'un groupe, labels d'une arête) et les arêtes qui y sont reliées.
 */
export function removeCellsDeep(page: PageTree, cellIds: Iterable<string>): void {
  const removed = new Set(cellIds);
  for (let grew = true; grew;) {
    grew = false;
    for (const { id, cell } of page.cellList) {
      if (removed.has(id) || !cell) continue;
      const ends = [cell.getAttribute('parent'), cell.getAttribute('source'), cell.getAttribute('target')];
      if (ends.some((end) => end && removed.has(end))) {
        removed.add(id);
        grew = true;
      }
    }
  }
  removeCells(page, removed);
}

/** Retire des cellules (leur nœud et l'indentation qui le précède). */
export function removeCells(page: PageTree, cellIds: Iterable<string>): void {
  let removed = false;
  for (const id of cellIds) {
    const element = page.cells.get(id)?.element;
    if (!element?.parentNode) continue;
    const previous = element.previousSibling;
    if (previous && isWhitespace(previous)) previous.parentNode?.removeChild(previous);
    element.parentNode.removeChild(element);
    removed = true;
  }
  if (!removed) return;
  reindexPage(page);
  markPageDirty(page);
}

/** Ajoute une page vide (calque par défaut) à la fin du fichier. */
export function addPage(tree: DrawioTree, name: string): PageTree {
  const mxfile = tree.xml.documentElement;
  if (!mxfile || mxfile.tagName !== 'mxfile') throw new Error('Ancien format sans <mxfile> : ajout de page impossible');
  const ids = new Set(tree.pages.map((p) => p.id));
  let id = randomId();
  while (ids.has(id)) id = randomId();
  const template = childElements(parseXml(createEmptyDrawio(name, id)).documentElement!, 'diagram')[0]!;
  const diagram = tree.xml.importNode(template, true) as Element;
  appendIndented(mxfile, diagram);
  const page = readDiagram(diagram, tree.pages.length);
  tree.pages.push(page);
  return page;
}

export function renamePage(tree: DrawioTree, pageId: string, name: string): void {
  const page = pageOf(tree, pageId);
  if (!page.diagram) throw new Error('Ancien format : page sans nom');
  page.diagram.setAttribute('name', name);
  page.name = name;
}

/** Retire une page (son `<diagram>` et l'indentation qui le précède). Le fichier garde au moins une page. */
export function removePage(tree: DrawioTree, pageId: string): void {
  const page = pageOf(tree, pageId);
  if (!page.diagram) throw new Error('Ancien format : page unique');
  if (tree.pages.length <= 1) throw new Error('Un fichier garde au moins une page');
  const previous = page.diagram.previousSibling;
  if (previous && isWhitespace(previous)) previous.parentNode?.removeChild(previous);
  page.diagram.parentNode?.removeChild(page.diagram);
  tree.pages.splice(tree.pages.indexOf(page), 1);
}

/**
 * Identifiant de cellule à la manière de draw.io : un préfixe aléatoire par page puis un compteur
 * (`Fs-0jHc4KjceeW8xsn6R-4`), jamais déjà pris dans la page.
 */
export function newCellId(page: PageTree): string {
  let prefix = prefixes.get(page);
  if (!prefix) {
    prefix = { value: randomId(), next: 1 };
    prefixes.set(page, prefix);
  }
  let id: string;
  do id = `${prefix.value}-${prefix.next++}`;
  while (page.cells.has(id));
  return id;
}

const prefixes = new WeakMap<PageTree, { value: string; next: number }>();

function pageOf(tree: DrawioTree, pageId: string): PageTree {
  const page = byId(tree.pages, pageId);
  if (!page) throw new Error(`Page inconnue : ${pageId}`);
  return page;
}

/** `<root>` de la page ; une page vide reçoit un modèle minimal (cellule racine et calque). */
export function ensureRoot(page: PageTree): Element {
  if (!page.model) {
    if (!page.diagram) throw new Error(`Page ${page.id} sans modèle`);
    const template = childElements(parseXml(createEmptyDrawio()).documentElement!, 'diagram')[0]!;
    const model = childElements(template, 'mxGraphModel')[0]!;
    const diagram = page.diagram;
    while (diagram.firstChild) diagram.removeChild(diagram.firstChild);
    page.model = ownerOf(diagram).importNode(model, true) as Element;
    diagram.appendChild(page.model);
    page.encoding = 'inline';
    reindexPage(page);
  }
  let rootEl = childElements(page.model, 'root')[0];
  if (!rootEl) {
    rootEl = ownerOf(page.model).createElement('root');
    page.model.appendChild(rootEl);
  }
  return rootEl;
}

/** Premier calque (cellule enfant de la cellule racine) ; créé avec la racine s'il n'y en a pas. */
export function ensureLayer(page: PageTree, rootEl: Element): string {
  const parentOf = (id: string) => page.cells.get(id)?.cell?.getAttribute('parent') || undefined;
  const isStructural = (id: string) => {
    const cell = page.cells.get(id)?.cell;
    return cell !== undefined && cell.getAttribute('vertex') !== '1' && cell.getAttribute('edge') !== '1';
  };
  const roots = page.cellList.filter((c) => isStructural(c.id) && !parentOf(c.id)).map((c) => c.id);
  const layer = page.cellList.find((c) => isStructural(c.id) && roots.includes(parentOf(c.id) ?? ''));
  if (layer) return layer.id;

  const document = ownerOf(rootEl);
  let rootId = roots[0];
  if (!rootId) {
    rootId = page.cells.has('0') ? newCellId(page) : '0';
    const root = document.createElement('mxCell');
    root.setAttribute('id', rootId);
    appendIndented(rootEl, root);
    reindexPage(page);
  }
  const layerId = page.cells.has('1') ? newCellId(page) : '1';
  const cell = document.createElement('mxCell');
  cell.setAttribute('id', layerId);
  cell.setAttribute('parent', rootId);
  appendIndented(rootEl, cell);
  reindexPage(page);
  return layerId;
}

/** Ajoute un enfant en reprenant l'indentation de ses frères (s'il y en a). */
export function appendIndented(parent: Element, child: Element): void {
  const trailing = parent.lastChild && isWhitespace(parent.lastChild) ? parent.lastChild : undefined;
  const lastElement = childElements(parent).pop();
  const before = lastElement?.previousSibling;
  const indent = before && isWhitespace(before) ? before.nodeValue! : undefined;
  if (indent) {
    parent.insertBefore(ownerOf(parent).createTextNode(indent), trailing ?? null);
  } else if (trailing) {
    // Premier enfant d'un parent indenté : un niveau de plus que sa fermeture.
    parent.insertBefore(ownerOf(parent).createTextNode(`${trailing.nodeValue}  `), trailing);
  }
  parent.insertBefore(child, trailing ?? null);
}

function isWhitespace(node: Node): boolean {
  return node.nodeType === 3 && !(node.nodeValue ?? '').trim();
}

function ownerOf(node: Node): Document {
  if (!node.ownerDocument) throw new Error('Nœud XML sans document');
  return node.ownerDocument;
}
