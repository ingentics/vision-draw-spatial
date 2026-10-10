import {
  DRAWIO_STYLES,
  inflate,
  lighten,
  readableOn,
  rectContains,
  rectContainsRect,
  rectsOverlap,
  shapeOf,
  styleColor,
  unionOf,
} from '../../../../core/plugins';
import type { ModeEdit, ModeObstacles, PageModel, Rect, ShapeModel, StylePreset } from '../../../../core/plugins';
import { isComposite, isNode } from '../kinds';

/**
 * Ensembles d'états du mode Machine à états (sujet 435), repris de la région RDD (sujets 182 à 241 ; mise en commun :
 * idée 437) : rectangles posés derrière leur contenu, qui l'emportent quand on les déplace. Le contenu (formes du mode
 * dont le coin haut-gauche est dedans) est calculé, rien n'en est écrit dans le fichier. Différence avec la région : un
 * ensemble est un état, il porte des transitions (sujet 434).
 */

/**
 * Fond d'un ensemble : opaque ; nom : taille du texte, sur un onglet au fond et à la bordure de l'ensemble.
 */
export const COMPOSITE = {
  /** Marge de sécurité autour d'une forme qui dépasse de son ensemble, qui s'agrandit (sujets 183, 329). */
  margin: 40,
  fontSize: 9,
  /**
   * Onglet du nom (sujets 227, 228) : hauteur, marge du texte (à gauche jusqu'au bord, à droite jusqu'au milieu du S),
   * largeur du S qui le termine.
   */
  tab: { height: 16, padding: 6, curve: 10 },
  width: 320,
  height: 180,
} as const;

const area = (shape: ShapeModel) => shape.bounds.width * shape.bounds.height;

/**
 * Un ensemble peut-il contenir `composite`, dont le coin haut-gauche est dedans (sujet 231) ? Oui, quelle que soit sa
 * taille, comme un état ; seul cas ambigu, deux coins au même point : la plus grande contient l'autre, à taille
 * égale celle de derrière (pas de cycle).
 */
function canContainComposite(parent: ShapeModel, composite: ShapeModel): boolean {
  if (parent.bounds.x !== composite.bounds.x || parent.bounds.y !== composite.bounds.y) return true;
  return area(parent) > area(composite) || (area(parent) === area(composite) && parent.z < composite.z);
}

/**
 * Ensemble qui contient une forme du mode : la plus petite dont le coin haut-gauche de la forme est dedans, à taille
 * égale celle de devant (la plus imbriquée).
 */
export function compositeOf(page: PageModel, shape: ShapeModel): ShapeModel | undefined {
  return ownerAmong(page.shapes, shape);
}

/** Ensembles qui contiennent `shape`, du plus proche au plus lointain. */
export function compositeAncestors(page: PageModel, shape: ShapeModel): ShapeModel[] {
  const chain: ShapeModel[] = [];
  for (let parent = compositeOf(page, shape); parent && !chain.includes(parent); parent = compositeOf(page, parent))
    chain.push(parent);
  return chain;
}

/** `compositeOf` parmi `candidates` (les formes de la page, ou ses seuls ensembles). */
function ownerAmong(candidates: readonly ShapeModel[], shape: ShapeModel): ShapeModel | undefined {
  if (!isNode(shape)) return undefined;
  let owner: ShapeModel | undefined;
  for (const composite of candidates) {
    if (!isComposite(composite) || composite.id === shape.id || !rectContains(composite.bounds, shape.bounds)) continue;
    if (isComposite(shape) && !canContainComposite(composite, shape)) continue;
    if (!owner || area(composite) < area(owner) || (area(composite) === area(owner) && composite.z > owner.z))
      owner = composite;
  }
  return owner;
}

/** Contenu d'un ensemble : les formes qu'il contient, et celles des ensembles qu'il contient. */
export function compositeContent(page: PageModel, composite: ShapeModel, owned = ownedBy(page)): string[] {
  if (!isComposite(composite)) return [];
  const content = new Set<string>();
  const stack = [...(owned.get(composite.id) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === composite.id || content.has(id)) continue;
    content.add(id);
    stack.push(...(owned.get(id) ?? []));
  }
  return [...content];
}

/**
 * Formes que chaque ensemble contient directement (sujet 455) : un passage sur les seuls ensembles pour chaque forme,
 * calculé une fois par appel de `compositeContent`, ou une fois pour toute une chaîne d'ajustement.
 */
function ownedBy(page: PageModel): Map<string, string[]> {
  const candidates = page.shapes.filter(isComposite);
  const owned = new Map<string, string[]>();
  for (const shape of page.shapes) {
    const owner = ownerAmong(candidates, shape);
    if (!owner) continue;
    const ids = owned.get(owner.id);
    if (ids) ids.push(shape.id);
    else owned.set(owner.id, [shape.id]);
  }
  return owned;
}

/**
 * Styles d'un ensemble neuf, dans l'ordre (sujet 345) : les styles de base de l'appli à partir du 3ᵉ (Bleu), puis les
 * suivants, en boucle.
 */
export const COMPOSITE_STYLES: readonly StylePreset[] = [...DRAWIO_STYLES.slice(2), ...DRAWIO_STYLES.slice(0, 2)];

/** Style d'un ensemble neuf depuis la palette. */
export const DEFAULT_COMPOSITE_STYLE = COMPOSITE_STYLES[0]!;

/** Couleur du nom d'un ensemble de ce style : celle du style, sinon lisible sur son fond. */
const fontColorOf = (preset: StylePreset) => preset.fontColor ?? readableOn(preset.fillColor);

/**
 * Style d'un ensemble pour draw.io : fond et bordure du style, cadre de la couleur de la bordure autour du nom (l'onglet
 * n'y est pas dessiné), texte lisible sur le fond.
 */
export function compositeStyle(preset: StylePreset): string {
  return (
    `fillColor=${preset.fillColor};strokeColor=${preset.strokeColor};` +
    `labelBorderColor=${preset.strokeColor};fontColor=${fontColorOf(preset)};`
  );
}

/**
 * Style d'un ensemble (sujet 345) : fond opaque (`fillColor`), bordure (`strokeColor`) et cadre du nom
 * (`labelBorderColor`, `fontColor`), pour draw.io aussi.
 */
function setCompositeStyle(edit: ModeEdit, shape: ShapeModel, preset: StylePreset): void {
  if (!isComposite(shape)) return;
  edit.setElementStyle(shape.id, 'fillColor', preset.fillColor);
  // Fond opaque (sujet 232) : l'opacité des ensembles posés avant est retirée.
  edit.setElementStyle(shape.id, 'fillOpacity', undefined);
  edit.setElementStyle(shape.id, 'strokeColor', preset.strokeColor);
  edit.setElementStyle(shape.id, 'labelBackgroundColor', undefined);
  edit.setElementStyle(shape.id, 'labelBorderColor', preset.strokeColor);
  edit.setElementStyle(shape.id, 'fontColor', fontColorOf(preset));
}

/**
 * Fond dessiné d'un ensemble (sujet 345) : la couleur de son style rapprochée du blanc de `amount` (réglage du mode),
 * au dessin seulement ; undefined hors d'un ensemble ou sans fond.
 */
export function compositeDrawnStyle(shape: ShapeModel, amount: number): Record<string, string> | undefined {
  const fill =
    isComposite(shape) && amount > 0 ? styleColor(shape.style, 'fillColor', DEFAULT_COMPOSITE_STYLE.fillColor) : null;
  return fill ? { fillColor: lighten(fill, amount) } : undefined;
}

/**
 * Emprise d'une forme dans son ensemble parent (sujet 237) : ses bornes, onglet compris pour un ensemble qui a un nom
 * (il dépasse au-dessus de lui).
 */
function extentOf(shape: ShapeModel, bounds: Rect = shape.bounds): Rect {
  if (!isComposite(shape) || !shape.label.trim()) return bounds;
  const { height } = COMPOSITE.tab;
  return { ...bounds, y: bounds.y - height, height: bounds.height + height };
}

/** `ancestor` contient-il `composite`, de proche en proche ? */
function encloses(page: PageModel, ancestor: ShapeModel, composite: ShapeModel): boolean {
  const seen = new Set<string>();
  for (let parent = compositeOf(page, composite); parent && !seen.has(parent.id); parent = compositeOf(page, parent)) {
    if (parent.id === ancestor.id) return true;
    seen.add(parent.id);
  }
  return false;
}

/**
 * Formes posées (déplacées ou ajoutées, sujets 183, 234) : une forme du mode qui dépasse de l'ensemble qui la contient
 * l'agrandit, dans les quatre directions, pour la contenir avec la marge de sécurité ; l'ensemble agrandi fait de même
 * avec le sien, de proche en proche. Un ensemble ne rétrécit jamais ici.
 *
 * L'ensemble d'une forme est celui de son coin haut-gauche ; après un déplacement (`before` : la page d'avant), une
 * forme sortie de son ensemble par la gauche ou le haut y reste tant qu'elle le chevauche, sauf si son coin est entré dans
 * un autre ensemble qui n'englobe pas le sien.
 */
function growComposites(edit: ModeEdit, shapeIds: string[], before?: PageModel): void {
  const { page } = edit;
  /** Bornes des ensembles déjà agrandis par cette opération. */
  const grown = new Map<string, Rect>();
  const boundsOf = (shape: ShapeModel) => grown.get(shape.id) ?? shape.bounds;
  const ownerOf = (shape: ShapeModel): ShapeModel | undefined => {
    const owner = compositeOf(page, shape);
    const earlier = shapeOf(before, shape.id);
    const previousId = earlier && before && compositeOf(before, earlier)?.id;
    const previous = shapeOf(page, previousId);
    if (!previous || previous.id === owner?.id || !rectsOverlap(boundsOf(shape), boundsOf(previous))) return owner;
    return !owner || encloses(page, owner, previous) ? previous : owner;
  };
  for (const id of shapeIds) {
    let shape = shapeOf(page, id);
    const seen = new Set<string>();
    while (shape && !seen.has(shape.id)) {
      seen.add(shape.id);
      const composite = ownerOf(shape);
      if (!composite) break;
      // La forme compte avec son onglet si c'est un ensemble (sujet 237).
      const inner = extentOf(shape, boundsOf(shape));
      const outer = boundsOf(composite);
      if (rectContainsRect(outer, inner)) break;
      // Elle dépasse : l'ensemble s'agrandit pour garder la marge de chaque côté où la forme en est trop près.
      const next = unionOf([outer, inflate(inner, COMPOSITE.margin)])!;
      grown.set(composite.id, next);
      edit.setShapeBounds(composite.id, next);
      shape = composite;
    }
  }
}

/** Profondeur d'une forme dans les ensembles : 0 hors de tout ensemble, 1 dans un ensemble, 2 dans un ensemble d'un ensemble… */
function depthOf(page: PageModel, shape: ShapeModel): number {
  let depth = 0;
  const seen = new Set<string>();
  for (
    let composite = compositeOf(page, shape);
    composite && !seen.has(composite.id);
    composite = compositeOf(page, composite)
  ) {
    seen.add(composite.id);
    depth++;
  }
  return depth;
}

/**
 * Ordre de dessin des ensembles (sujet 230) : tous au fond de la pile, les plus englobants derrière, chaque ensemble
 * devant celui qui le contient ; leur contenu est ainsi toujours devant eux. À égalité, l'ordre en place est gardé.
 */
function orderComposites(edit: ModeEdit): void {
  const { page } = edit;
  const composites = page.shapes
    .filter(isComposite)
    .map((composite) => ({ composite, depth: depthOf(page, composite) }))
    .sort((a, b) => a.depth - b.depth || a.composite.z - b.composite.z)
    .map(({ composite }) => composite.id);
  if (composites.length > 0) edit.sendToBack(composites);
}

/**
 * Style d'un ensemble ajouté (sujets 236, 345) : celui des styles des ensembles au rang du nombre de ses frères (ensembles
 * du même ensemble parent, ou du premier niveau de la page), en boucle. `ignored` : ensembles ajoutés dans la même
 * opération et pas encore stylés (collage de plusieurs ensembles, sujet 239).
 */
function styleNewComposite(edit: ModeEdit, composite: ShapeModel, ignored: ReadonlySet<string> = new Set()): void {
  const { page } = edit;
  const parent = compositeOf(page, composite)?.id;
  const siblings = page.shapes.filter(
    (shape) =>
      isComposite(shape) &&
      shape.id !== composite.id &&
      !ignored.has(shape.id) &&
      compositeOf(page, shape)?.id === parent,
  ).length;
  setCompositeStyle(edit, composite, COMPOSITE_STYLES[siblings % COMPOSITE_STYLES.length]!);
}

/**
 * Formes posées (sujets 183, 230, 236) : un ensemble ajouté (pas de `before`) prend le style de son rang parmi ses
 * frères ; ensembles agrandis pour contenir les formes, puis remis en ordre de dessin.
 */
export function placeInComposites(edit: ModeEdit, shapeIds: string[], before?: PageModel): void {
  if (!before) {
    // Une à une, dans l'ordre : chaque ensemble ajouté compte ceux stylés avant lui (collage, sujet 239).
    const pending = new Set(shapeIds);
    for (const id of shapeIds) {
      pending.delete(id);
      const shape = shapeOf(edit.page, id);
      if (shape && isComposite(shape)) styleNewComposite(edit, shape, pending);
    }
  }
  growComposites(edit, shapeIds, before);
  orderComposites(edit);
}

/**
 * Ajuste un ensemble à son contenu (touche « f », sujets 184, 239) : rectangle englobant des formes qu'il contient
 * (un ensemble contenu avec son onglet, sujet 237), plus la marge de sécurité de chaque côté ; il grandit ou
 * rétrécit. Puis son ensemble parent est ajusté à son tour, et ainsi de suite jusqu'au premier niveau. Ensemble vide :
 * rien ne change. L'ordre de dessin des ensembles est ensuite remis en place (sujet 230).
 */
export function fitComposite(edit: ModeEdit, composite: ShapeModel): void {
  const { page } = edit;
  if (!isComposite(composite)) return;
  const owned = ownedBy(page);
  /** Bornes écrites par cet ajustement (ensembles déjà ajustés, plus bas dans la chaîne). */
  const fitted = new Map<string, Rect>();
  const seen = new Set<string>();
  for (
    let current: ShapeModel | undefined = composite;
    current && !seen.has(current.id);
    current = compositeOf(page, current)
  ) {
    seen.add(current.id);
    const content = compositeContent(page, current, owned)
      .map((id) => shapeOf(page, id))
      .filter((shape): shape is ShapeModel => shape !== undefined);
    const union = unionOf(content.map((s) => extentOf(s, fitted.get(s.id) ?? s.bounds)));
    if (!union) break;
    const bounds = inflate(union, COMPOSITE.margin);
    fitted.set(current.id, bounds);
    edit.setShapeBounds(current.id, bounds);
  }
  if (fitted.size > 0) orderComposites(edit);
}

/**
 * Bornes d'un ensemble qu'on déplace ou redimensionne (sujet 241) : ses frères (ensembles de même ensemble parent, ou du
 * premier niveau de la page), onglets compris. Son parent ne le borne pas (il s'agrandit), son contenu bouge avec lui.
 * `gap` : écart à garder (réglage du mode).
 */
export function compositeObstacles(page: PageModel, shape: ShapeModel, gap: number): ModeObstacles | undefined {
  if (!isComposite(shape)) return undefined;
  const parent = compositeOf(page, shape)?.id;
  const content = new Set(compositeContent(page, shape));
  const rects = page.shapes
    .filter((s) => isComposite(s) && s.id !== shape.id && !content.has(s.id) && compositeOf(page, s)?.id === parent)
    .map((s) => ({ id: s.id, rect: extentOf(s) }));
  return { rects, above: shape.bounds.y - extentOf(shape).y, gap };
}
