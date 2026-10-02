import type { Document, Element, Node } from '@xmldom/xmldom';
import { formatNumber } from './edit';
import { createEmptyDrawio, randomId } from './skeleton';
import { childElements, markPageDirty, parseXml, readDiagram, reindexPage } from './xmlTree';
import type { DrawioTree, PageTree } from './xmlTree';

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
  const page = tree.pages.find((p) => p.id === pageId);
  if (!page) throw new Error(`Page inconnue : ${pageId}`);
  return page;
}

/** `<root>` de la page ; une page vide reçoit un modèle minimal (cellule racine et calque). */
function ensureRoot(page: PageTree): Element {
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
function ensureLayer(page: PageTree, rootEl: Element): string {
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
function appendIndented(parent: Element, child: Element): void {
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
