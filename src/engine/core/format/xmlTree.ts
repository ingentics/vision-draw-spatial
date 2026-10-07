import { DOMParser, type Document, type Element } from '@xmldom/xmldom';
import { decodeDiagram } from './decode';

/**
 * Arbre XML d'origine d'un fichier draw.io (SPEC §14.2), conservé à côté du modèle neutre.
 *
 * Le parseur construit le modèle à partir de cet arbre ; l'éditeur modifiera ensuite les
 * nœuds en place (via `cells`) et `writeDrawio` resérialisera l'arbre. Rien n'est régénéré :
 * tout ce que le parseur ne comprend pas reste tel quel.
 */

export class DrawioParseError extends Error {
  override name = 'DrawioParseError';
}

/** Nœuds XML d'une cellule : `<mxCell>`, éventuellement enveloppé dans `<object>` / `<UserObject>`. */
export interface CellNodes {
  /** Identifiant de la cellule (généré `__anonymous-n` si l'XML n'en a pas). */
  id: string;
  /** Vrai si l'identifiant a été généré faute d'attribut `id`. */
  generatedId: boolean;
  /** Élément enfant direct de `<root>` : l'enveloppe si elle existe, sinon le `<mxCell>`. */
  element: Element;
  /** `<mxCell>` portant style, parent, géométrie… (absent d'une enveloppe vide). */
  cell?: Element;
  /** `<object>` / `<UserObject>` portant label, lien et attributs personnalisés. */
  wrapper?: Element;
  /** `<mxGeometry>` de la cellule. */
  geometry?: Element;
}

/**
 * Forme de la page dans le fichier, conservée à l'écriture :
 * - `inline` : `<mxGraphModel>` en clair dans `<diagram>` ;
 * - `compressed` : texte base64 deflate dans `<diagram>` ;
 * - `legacy` : ancien format, `<mxGraphModel>` à la racine du fichier ;
 * - `empty` : `<diagram>` sans contenu ;
 * - `unreadable` : contenu illisible, recopié tel quel et jamais réécrit.
 */
export type PageEncoding = 'inline' | 'compressed' | 'legacy' | 'empty' | 'unreadable';

export interface PageTree {
  id: string;
  name: string;
  encoding: PageEncoding;
  /** `<diagram>` de la page (absent en format `legacy`). */
  diagram?: Element;
  /** `<mxGraphModel>` de la page ; pour une page compressée, il vit dans son propre document décodé. */
  model?: Element;
  /** Raison de l'échec de lecture (`unreadable`). */
  error?: string;
  /** Cellules dans l'ordre du fichier (ordre de dessin), doublons d'id compris. */
  cellList: CellNodes[];
  /** Correspondance id → nœuds ; en cas de doublon, la première cellule l'emporte. */
  cells: Map<string, CellNodes>;
  /** Page modifiée depuis la lecture : une page compressée est alors recompressée à l'écriture. */
  dirty: boolean;
}

export interface DrawioTree {
  /** Document XML du fichier (`<mxfile>`, ou `<mxGraphModel>` en format `legacy`). */
  xml: Document;
  pages: PageTree[];
}

/** Lit l'arbre d'un fichier draw.io. Seul un XML illisible ou une racine inconnue fait échouer. */
export function readDrawioTree(xml: string): DrawioTree {
  const document = parseXml(xml);
  const root = document.documentElement;
  if (!root) throw new DrawioParseError('Document XML vide');

  if (root.tagName === 'mxfile') {
    return { xml: document, pages: childElements(root, 'diagram').map(readDiagram) };
  }
  if (root.tagName === 'mxGraphModel') {
    return { xml: document, pages: [pageTree('page-1', 'Page-1', 'legacy', root)] };
  }
  throw new DrawioParseError(`Racine inattendue <${root.tagName}> : ce n'est pas un fichier draw.io`);
}

/** Signale qu'une page a été modifiée en place (sa forme compressée devra être recalculée). */
export function markPageDirty(page: PageTree): void {
  if (page.encoding === 'unreadable' || page.encoding === 'empty') {
    throw new Error(`Page ${page.id} non modifiable (${page.encoding})`);
  }
  page.dirty = true;
}

/** Réindexe les cellules d'une page après l'ajout ou le retrait de nœuds. */
export function reindexPage(page: PageTree): void {
  page.cellList = page.model ? readCells(page.model) : [];
  page.cells = new Map();
  for (const nodes of page.cellList) if (!page.cells.has(nodes.id)) page.cells.set(nodes.id, nodes);
}

/** Lit une page `<diagram>` (aussi pour une page ajoutée au fichier). */
export function readDiagram(diagram: Element, index: number): PageTree {
  const id = diagram.getAttribute('id') || `page-${index + 1}`;
  const name = diagram.getAttribute('name') || `Page-${index + 1}`;

  const inline = childElements(diagram, 'mxGraphModel')[0];
  if (inline) return pageTree(id, name, 'inline', inline, diagram);

  const text = diagram.textContent ?? '';
  if (!text.trim()) return pageTree(id, name, 'empty', undefined, diagram);

  try {
    const model = parseXml(decodeDiagram(text)).documentElement;
    if (!model || model.tagName !== 'mxGraphModel') throw new Error('<mxGraphModel> attendu');
    return pageTree(id, name, 'compressed', model, diagram);
  } catch (error) {
    return { ...pageTree(id, name, 'unreadable', undefined, diagram), error: errorMessage(error) };
  }
}

function pageTree(id: string, name: string, encoding: PageEncoding, model?: Element, diagram?: Element): PageTree {
  const page: PageTree = { id, name, encoding, diagram, model, cellList: [], cells: new Map(), dirty: false };
  reindexPage(page);
  return page;
}

function readCells(model: Element): CellNodes[] {
  const rootEl = childElements(model, 'root')[0];
  if (!rootEl) return [];

  const cells: CellNodes[] = [];
  let anonymous = 0;
  for (const element of childElements(rootEl)) {
    let cell: Element | undefined;
    let wrapper: Element | undefined;
    if (element.tagName === 'mxCell') {
      cell = element;
    } else if (element.tagName === 'UserObject' || element.tagName === 'object') {
      wrapper = element;
      cell = childElements(element, 'mxCell')[0];
    } else {
      continue;
    }

    const xmlId = element.getAttribute('id');
    const geometry = cell && childElements(cell, 'mxGeometry')[0];
    cells.push({
      id: xmlId || `__anonymous-${++anonymous}`,
      generatedId: !xmlId,
      element,
      cell,
      wrapper,
      geometry,
    });
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Utilitaires XML

export function parseXml(xml: string): Document {
  try {
    return new DOMParser({ onError: onXmlError }).parseFromString(xml, 'text/xml');
  } catch (error) {
    throw new DrawioParseError(`XML invalide (${xmlErrorDetail(error)})`, { cause: error });
  }
}

function onXmlError(level: 'warning' | 'error' | 'fatalError', message: string): void {
  if (level !== 'warning') throw new Error(message);
}

export function childElements(parent: Element, tagName?: string): Element[] {
  const result: Element[] = [];
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === 1 && (!tagName || (node as Element).tagName === tagName)) result.push(node as Element);
  }
  return result;
}

/** Détail lisible d'une erreur xmldom (« Reporting fatalError "x" caused Error: x » → « x »). */
function xmlErrorDetail(error: unknown): string {
  const message = errorMessage(error);
  const detail = /caused (?:\w*Error: )?(.+)$/s.exec(message)?.[1] ?? message;
  return detail.replace(/\s+/g, ' ').trim();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
