import type { Point } from '../model/types';
import type { Element } from '@xmldom/xmldom';
import { parseStyle } from './style';
import { childElements, markPageDirty } from './xmlTree';
import type { PageTree } from './xmlTree';

/**
 * Modifications in situ de l'arbre XML (SPEC §14.2) : seuls les attributs concernés changent.
 */

/** Grille de la page (`grid`, `gridSize` de `<mxGraphModel>`) ; 0 si elle est désactivée. */
export function gridSizeOf(page: PageTree): number {
  if (!page.model || page.model.getAttribute('grid') === '0') return 0;
  const size = parseFloat(page.model.getAttribute('gridSize') ?? '');
  return Number.isFinite(size) && size > 0 ? size : 10;
}

/**
 * Vrai si la cellule peut être déplacée en réécrivant sa géométrie : elle a un `<mxGeometry>`
 * non relatif (une géométrie relative, ex. un port, est exprimée en fractions de son parent).
 */
export function canMoveCell(page: PageTree, cellId: string): boolean {
  if (page.encoding === 'unreadable' || page.encoding === 'empty') return false;
  const geometry = page.cells.get(cellId)?.geometry;
  return geometry !== undefined && geometry.getAttribute('relative') !== '1';
}

/**
 * Déplace une cellule : `x` et `y` de son `<mxGeometry>` (relatifs à son parent, ses enfants
 * suivent donc d'eux-mêmes). Un attribut absent vaut 0, comme dans draw.io.
 */
export function moveCell(page: PageTree, cellId: string, delta: Point): void {
  shiftGeometry(page, cellId, { x: delta.x, y: delta.y });
}

/**
 * Redimensionne une cellule : variations de position (bord gauche / haut déplacé) et de taille,
 * appliquées aux attributs de son `<mxGeometry>`. Seuls les attributs qui changent sont réécrits.
 */
export function resizeCell(page: PageTree, cellId: string, delta: Partial<Record<GeometryKey, number>>): void {
  shiftGeometry(page, cellId, delta);
}

type GeometryKey = 'x' | 'y' | 'width' | 'height';

function shiftGeometry(page: PageTree, cellId: string, delta: Partial<Record<GeometryKey, number>>): void {
  if (!canMoveCell(page, cellId)) throw new Error(`Cellule ${cellId} non modifiable`);
  const changes = (Object.entries(delta) as Array<[GeometryKey, number]>).filter(([, d]) => d !== 0);
  if (changes.length === 0) return;
  const geometry = page.cells.get(cellId)!.geometry!;
  for (const [name, d] of changes) {
    const current = parseFloat(geometry.getAttribute(name) ?? '');
    const value = (Number.isFinite(current) ? current : 0) + d;
    if (value === 0 && (name === 'x' || name === 'y')) geometry.removeAttribute(name);
    else geometry.setAttribute(name, formatNumber(value));
  }
  markPageDirty(page);
}

/**
 * Remplace le label d'une cellule (attribut `label` de l'enveloppe, sinon `value`). Avec
 * `html=1`, le texte est échappé et les retours à la ligne deviennent des `<br>`, comme draw.io.
 */
export function setCellLabel(page: PageTree, cellId: string, text: string): void {
  const nodes = page.cells.get(cellId);
  if (!nodes?.cell) throw new Error(`Cellule ${cellId} introuvable`);
  const html = /(^|;)\s*html=1\s*(;|$)/.test(nodes.cell.getAttribute('style') ?? '');
  const value = html ? textToHtml(text) : text;
  if (nodes.wrapper) nodes.wrapper.setAttribute('label', value);
  else nodes.cell.setAttribute('value', value);
  markPageDirty(page);
}

/** Label tel qu'écrit dans le fichier (HTML si `html=1`) : attribut `label` de l'enveloppe, sinon `value`. */
export function cellLabelValue(page: PageTree, cellId: string): string {
  const nodes = page.cells.get(cellId);
  return (nodes?.wrapper ? nodes.wrapper.getAttribute('label') : nodes?.cell?.getAttribute('value')) ?? '';
}

/**
 * Label riche (HTML draw.io : `<b>`, `<span style>`…) : écrit tel quel, et le style passe en `html=1`
 * s'il ne l'est pas (draw.io affiche alors la mise en forme).
 */
export function setCellRichLabel(page: PageTree, cellId: string, html: string): void {
  const nodes = page.cells.get(cellId);
  if (!nodes?.cell) throw new Error(`Cellule ${cellId} introuvable`);
  if (!/(^|;)\s*html=1\s*(;|$)/.test(nodes.cell.getAttribute('style') ?? ''))
    setCellStyleValue(page, cellId, 'html', '1');
  if (nodes.wrapper) nodes.wrapper.setAttribute('label', html);
  else nodes.cell.setAttribute('value', html);
  markPageDirty(page);
}

/**
 * Valeur d'une clé du style d'une cellule (`clé=valeur;`), en place : la clé garde sa position si
 * elle existe, sinon elle est ajoutée à la fin ; undefined la retire. Le reste du style est intact.
 */
export function setCellStyleValue(page: PageTree, cellId: string, key: string, value: string | undefined): void {
  const cell = page.cells.get(cellId)?.cell;
  if (!cell) throw new Error(`Cellule ${cellId} introuvable`);
  const style = cell.getAttribute('style') ?? '';
  const tokens = style.split(';').filter((token) => token.trim() !== '');
  const index = tokens.findIndex((token) => token.split('=')[0]!.trim() === key && token.includes('='));
  if (value === undefined) {
    if (index < 0) return;
    tokens.splice(index, 1);
  } else if (index >= 0) {
    if (tokens[index] === `${key}=${value}`) return;
    tokens[index] = `${key}=${value}`;
  } else {
    tokens.push(`${key}=${value}`);
  }
  // draw.io termine ses styles par « ; » : on garde la forme d'origine.
  const ended = style.trimEnd().endsWith(';') || style.trim() === '';
  const next = tokens.join(';') + (ended && tokens.length ? ';' : '');
  if (next) cell.setAttribute('style', next);
  else cell.removeAttribute('style');
  markPageDirty(page);
}

/** Attribut de l'objet (`<object>` / `<UserObject>`) d'une cellule ; false si elle n'a pas d'objet. */
export function setCellObjectAttribute(
  page: PageTree,
  cellId: string,
  name: string,
  value: string | undefined,
): boolean {
  const wrapper = page.cells.get(cellId)?.wrapper;
  if (!wrapper) return false;
  if (value === undefined) wrapper.removeAttribute(name);
  else wrapper.setAttribute(name, value);
  markPageDirty(page);
  return true;
}

/**
 * Attribut de la page (`<diagram>`, ex. `spatial.mode`) ; undefined le retire. Hors du contenu de la page : une
 * page compressée n'a pas à être recompressée, et draw.io garde le nœud `<diagram>` en réenregistrant. False si la
 * page n'a pas de `<diagram>` (ancien format).
 */
export function setPageAttribute(page: PageTree, name: string, value: string | undefined): boolean {
  if (!page.diagram) return false;
  if (value === undefined) page.diagram.removeAttribute(name);
  else page.diagram.setAttribute(name, value);
  return true;
}

/**
 * Placement d'un label d'arête (le label de l'arête, ou un label enfant) dans sa géométrie relative,
 * comme draw.io : `x` = position le long de l'arête (−1 … 1), `y` = distance perpendiculaire,
 * `<mxPoint as="offset">` = décalage libre. Une valeur nulle n'est pas écrite.
 */
export function setLabelPlacement(
  page: PageTree,
  cellId: string,
  placement: { position: number; distance: number; offset: Point },
): void {
  const geometry = page.cells.get(cellId)?.geometry;
  if (!geometry) throw new Error(`Cellule ${cellId} sans géométrie`);
  const write = (element: Element, name: string, value: number) => {
    const text = formatNumber(value);
    if (text === '0') element.removeAttribute(name);
    else element.setAttribute(name, text);
  };
  write(geometry, 'x', placement.position);
  write(geometry, 'y', placement.distance);
  geometry.setAttribute('relative', '1');
  let offset = childElements(geometry, 'mxPoint').find((point) => point.getAttribute('as') === 'offset');
  if (!offset && (placement.offset.x !== 0 || placement.offset.y !== 0) && geometry.ownerDocument) {
    offset = geometry.ownerDocument.createElement('mxPoint');
    offset.setAttribute('as', 'offset');
    geometry.appendChild(offset);
  }
  if (offset) {
    write(offset, 'x', placement.offset.x);
    write(offset, 'y', placement.offset.y);
  }
  markPageDirty(page);
}

/**
 * Extrémité d'une arête (`source` ou `target`) : attachée à une cellule (attribut `source` / `target`),
 * ou libre en un point (relatif au parent de l'arête), écrit dans `<mxPoint as="sourcePoint|targetPoint">`
 * comme draw.io. Le point libre déjà écrit reste en place quand l'extrémité est attachée (draw.io
 * l'ignore alors). Les clés de style du point d'attache sont à écrire à part (`setCellStyleValue`).
 */
export function setEdgeTerminal(
  page: PageTree,
  edgeId: string,
  end: 'source' | 'target',
  terminal: { cellId: string } | { point: Point },
): void {
  const nodes = page.cells.get(edgeId);
  const cell = nodes?.cell;
  if (!cell) throw new Error(`Arête ${edgeId} introuvable`);
  if ('cellId' in terminal) {
    if (!page.cells.has(terminal.cellId)) throw new Error(`Cellule ${terminal.cellId} introuvable`);
    cell.setAttribute(end, terminal.cellId);
    markPageDirty(page);
    return;
  }
  cell.removeAttribute(end);
  const document = cell.ownerDocument;
  if (!document) throw new Error(`Arête ${edgeId} hors document`);
  let geometry = nodes.geometry;
  if (!geometry) {
    geometry = document.createElement('mxGeometry');
    geometry.setAttribute('relative', '1');
    geometry.setAttribute('as', 'geometry');
    cell.appendChild(geometry);
    nodes.geometry = geometry;
  }
  const as = `${end}Point`;
  let point = childElements(geometry, 'mxPoint').find((p) => p.getAttribute('as') === as);
  if (!point) {
    point = document.createElement('mxPoint');
    point.setAttribute('as', as);
    // draw.io écrit `sourcePoint`, puis `targetPoint`, puis les points intermédiaires.
    const source = childElements(geometry, 'mxPoint').find((p) => p.getAttribute('as') === 'sourcePoint');
    geometry.insertBefore(point, end === 'target' && source ? source.nextSibling : geometry.firstChild);
  }
  point.setAttribute('x', formatNumber(terminal.point.x));
  point.setAttribute('y', formatNumber(terminal.point.y));
  markPageDirty(page);
}

/**
 * Déplace une arête (mxGeometry.translate) : points intermédiaires et extrémités libres décalés ; les bouts
 * attachés suivent leurs formes. Le décalage du label n'est pas touché.
 */
export function moveEdgeCell(page: PageTree, edgeId: string, delta: Point): void {
  const geometry = page.cells.get(edgeId)?.geometry;
  if (!geometry || (delta.x === 0 && delta.y === 0)) return;
  const shift = (point: Element) => {
    for (const [name, d] of [
      ['x', delta.x],
      ['y', delta.y],
    ] as const) {
      const current = parseFloat(point.getAttribute(name) ?? '');
      point.setAttribute(name, formatNumber((Number.isFinite(current) ? current : 0) + d));
    }
  };
  for (const point of childElements(geometry, 'mxPoint'))
    if (['sourcePoint', 'targetPoint'].includes(point.getAttribute('as') ?? '')) shift(point);
  for (const array of childElements(geometry, 'Array'))
    if (array.getAttribute('as') === 'points') childElements(array, 'mxPoint').forEach(shift);
  markPageDirty(page);
}

/**
 * Points intermédiaires d'une arête (relatifs à son parent), dans `<Array as="points">` comme draw.io ;
 * une liste vide retire le tableau.
 */
export function setEdgePoints(page: PageTree, edgeId: string, points: Point[]): void {
  const nodes = page.cells.get(edgeId);
  const cell = nodes?.cell;
  if (!cell) throw new Error(`Arête ${edgeId} introuvable`);
  const document = cell.ownerDocument;
  if (!document) throw new Error(`Arête ${edgeId} hors document`);
  let geometry = nodes.geometry;
  if (!geometry) {
    if (points.length === 0) return;
    geometry = document.createElement('mxGeometry');
    geometry.setAttribute('relative', '1');
    geometry.setAttribute('as', 'geometry');
    cell.appendChild(geometry);
    nodes.geometry = geometry;
  }
  const existing = childElements(geometry, 'Array').find((a) => a.getAttribute('as') === 'points');
  if (points.length === 0) {
    if (!existing) return;
    geometry.removeChild(existing);
    markPageDirty(page);
    return;
  }
  const array = document.createElement('Array');
  array.setAttribute('as', 'points');
  for (const p of points) {
    const point = document.createElement('mxPoint');
    point.setAttribute('x', formatNumber(p.x));
    point.setAttribute('y', formatNumber(p.y));
    array.appendChild(point);
  }
  if (existing) {
    geometry.replaceChild(array, existing);
  } else {
    // Après les extrémités libres, avant le décalage du label (ordre de draw.io).
    const terminals = childElements(geometry, 'mxPoint').filter((p) =>
      ['sourcePoint', 'targetPoint'].includes(p.getAttribute('as') ?? ''),
    );
    const after = terminals[terminals.length - 1];
    geometry.insertBefore(array, after ? after.nextSibling : geometry.firstChild);
  }
  markPageDirty(page);
}

/** Clés de style échangées entre les deux bouts quand on inverse une flèche (comme « Inverser » de draw.io). */
const REVERSED_STYLE_KEYS: Array<[string, string]> = [
  ...['X', 'Y', 'Dx', 'Dy', 'Perimeter'].map((suffix): [string, string] => [`exit${suffix}`, `entry${suffix}`]),
  ['sourcePerimeterSpacing', 'targetPerimeterSpacing'],
];

/**
 * Inverse une arête comme draw.io (`Graph.turnShapes`) : source et cible échangées, extrémités libres échangées,
 * points intermédiaires dans l'ordre inverse, points d'attache (`exit…` ↔ `entry…`) et espacements échangés. Les
 * pointes (`startArrow`, `endArrow`) et les labels restent en place. Seules les valeurs des nœuds changent :
 * l'indentation du fichier est intacte.
 */
export function reverseEdgeCell(page: PageTree, edgeId: string): void {
  const nodes = page.cells.get(edgeId);
  const cell = nodes?.cell;
  if (!cell) throw new Error(`Arête ${edgeId} introuvable`);
  const swapAttributes = (element: Element, a: string, b: string) => {
    const [first, second] = [element.getAttribute(a), element.getAttribute(b)];
    if (second === null) element.removeAttribute(a);
    else element.setAttribute(a, second);
    if (first === null) element.removeAttribute(b);
    else element.setAttribute(b, first);
  };
  swapAttributes(cell, 'source', 'target');
  const geometry = nodes.geometry;
  if (geometry) {
    // Coordonnées échangées entre nœuds (sans les déplacer) : extrémités libres, puis points intermédiaires.
    const reverseCoordinates = (points: Element[]) => {
      const values = points.map((point) => [point.getAttribute('x'), point.getAttribute('y')] as const).reverse();
      points.forEach((point, i) => {
        for (const [index, name] of (['x', 'y'] as const).entries()) {
          const value = values[i]![index];
          if (value === null || value === undefined) point.removeAttribute(name);
          else point.setAttribute(name, value);
        }
      });
    };
    const terminals = childElements(geometry, 'mxPoint');
    const source = terminals.find((point) => point.getAttribute('as') === 'sourcePoint');
    const target = terminals.find((point) => point.getAttribute('as') === 'targetPoint');
    if (source && target) reverseCoordinates([source, target]);
    else (source ?? target)?.setAttribute('as', source ? 'targetPoint' : 'sourcePoint');
    for (const array of childElements(geometry, 'Array'))
      if (array.getAttribute('as') === 'points') reverseCoordinates(childElements(array, 'mxPoint'));
  }
  const style = parseStyle(cell.getAttribute('style')).values;
  for (const [a, b] of REVERSED_STYLE_KEYS) {
    setCellStyleValue(page, edgeId, a, style[b]);
    setCellStyleValue(page, edgeId, b, style[a]);
  }
  markPageDirty(page);
}

/** Texte brut → label HTML draw.io. */
export function textToHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>');
}

/** Nombre au format draw.io : entier tel quel, sinon au plus deux décimales. */
export function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}
