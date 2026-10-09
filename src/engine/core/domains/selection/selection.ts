import type { PickedElement } from '../../interaction/pick';
import { marqueeTakes } from '../../interaction/marquee';
import { toggleSelected } from '../../interaction/selectionRules';
import type { PageModel, Rect, ShapeModel } from '../../model/types';
import type { Selection } from '../types';
import type { EngineCore } from '../EngineCore';
import { edgeOf, shapeOf } from '../../model/pageIndex';

/** Sélection de la page courante (SPEC §11) : un ou plusieurs éléments, par clic, ajout / retrait, zone ou « tout ». */
export class Selections {
  current: Selection | undefined;

  constructor(private readonly core: EngineCore) {}

  getSelection(): Selection | undefined {
    return this.current;
  }

  select(picked: PickedElement | undefined): void {
    this.selectItems(picked ? [picked] : []);
  }

  toggleSelect(picked: PickedElement): void {
    const current = this.current?.pageId === this.core.pages.currentPageId ? (this.current?.items ?? []) : [];
    this.selectItems(toggleSelected(current, picked));
  }

  /**
   * Sélection reprise sur les éléments de `page` de même id (sujet 312 : copie de travail d'un geste) ; inchangée si
   * elle est sur une autre page ou si un élément y manque. Contrairement à `reselectIn`, rien n'est remis à jour que
   * l'événement : en plein geste, contour et mode courant suivent déjà ces éléments.
   */
  rebind(page: PageModel): void {
    const current = this.current;
    if (!current || current.pageId !== page.id) return;
    const items = sameElementsIn(page, current.items);
    if (items.length !== current.items.length) return;
    this.current = { ...current, items, picked: items[items.length - 1]! };
    this.core.events.emit('selectionChange', this.current);
  }

  /**
   * Après relecture du document : `previous` (sélection d'avant, sur la page affichée `page`) reprise sur les éléments
   * de même id qui restent, avec sa partie ; plus rien si aucun ne reste (une sélection complète, contour et mode
   * courant compris).
   */
  reselectIn(page: PageModel, previous: Selection | undefined): void {
    if (!previous || previous.pageId !== page.id) return;
    const items = sameElementsIn(page, previous.items);
    if (items.length > 0) this.selectItems(items, previous.part);
  }

  /** `part` : partie de la forme sélectionnée seule (sujet 249), gardée si le mode la connaît encore. */
  selectItems(items: PickedElement[], part?: string): void {
    const page = this.core.pages.getCurrentPage();
    const picked = items[items.length - 1];
    const kept =
      part !== undefined && page && items.length === 1 && picked?.type === 'shape'
        ? this.core.shapeParts.validPart(page, picked.element as ShapeModel, part)
        : undefined;
    this.current = picked && page ? { pageId: page.id, picked, items: [...items], part: kept } : undefined;
    this.core.highlight.update();
    this.core.highlight.syncAnimation();
    this.core.events.emit('selectionChange', this.current);
    this.core.pointer.syncHoverComment();
    this.core.keys.emitModeHint();
    if (page && items.length === 1) this.core.modeCurrents.pickModeCurrent(page, items[0]!.element);
  }

  selectInRect(rect: Rect, options: { add: boolean; touch: boolean }): void {
    const page = this.core.pages.getCurrentPage();
    if (!page) return;
    const taken = this.selectableItems(page).filter((item) => {
      const footprint = this.core.projection.screenFootprint(item);
      return footprint !== undefined && marqueeTakes(footprint, rect, options.touch);
    });
    const roots = takenRoots(page, taken);
    const current = options.add && this.current?.pageId === page.id ? this.current.items : [];
    const kept = current.filter((item) => !roots.some((r) => r.element.id === item.element.id));
    this.selectItems([...kept, ...roots]);
  }

  selectAll(): void {
    const page = this.core.pages.getCurrentPage();
    if (page) this.selectItems(takenRoots(page, this.selectableItems(page)));
  }

  /** Éléments sélectionnables de la page : visibles, sur un calque visible. */
  private selectableItems(page: PageModel): PickedElement[] {
    const hiddenLayers = new Set(page.layers.filter((l) => !l.visible).map((l) => l.id));
    return [
      ...page.shapes
        // Comme au clic : un groupe invisible n'est pris que s'il porte un lien (sinon on prend ses formes).
        .filter((s) => this.core.registry.isPickable(s))
        .map((element) => ({ type: 'shape' as const, element })),
      ...page.edges.map((element) => ({ type: 'edge' as const, element })),
    ].filter(({ element }) => element.visible && !hiddenLayers.has(element.layerId));
  }

  /** La sélection compte-t-elle plusieurs éléments ? */
  isMultiSelection(): boolean {
    return (this.current?.items.length ?? 0) > 1;
  }

  clearSelection(): void {
    if (!this.current) return;
    this.select(undefined);
  }

  /** Échap : d'une partie sélectionnée, revient à sa forme ; sinon, plus rien de sélectionné. */
  escape(): void {
    if (this.current?.part !== undefined) this.selectItems(this.current.items);
    else this.clearSelection();
  }

  /** Nouveau document : plus rien de sélectionné. */
  resetDocument(): void {
    this.clearSelection();
  }
}

/** Éléments de `page` de même id que `items`, dans le même ordre ; ceux qui manquent sont omis. */
function sameElementsIn(page: PageModel, items: readonly PickedElement[]): PickedElement[] {
  return items.flatMap(({ element }): PickedElement[] => {
    const shape = shapeOf(page, element.id);
    if (shape) return [{ type: 'shape', element: shape }];
    const edge = edgeOf(page, element.id);
    return edge ? [{ type: 'edge', element: edge }] : [];
  });
}

/** Éléments pris sans leur conteneur (un élément pris avec lui n'est pas sélectionné à part), par ordre de z. */
function takenRoots(page: PageModel, taken: PickedElement[]): PickedElement[] {
  const ids = new Set(taken.map((item) => item.element.id));
  const parentOf = new Map(page.shapes.map((s) => [s.id, s.parentId]));
  const hasTakenAncestor = (id: string | undefined): boolean =>
    id !== undefined && (ids.has(id) || hasTakenAncestor(parentOf.get(id)));
  return taken.filter((item) => !hasTakenAncestor(item.element.parentId)).sort((a, b) => a.element.z - b.element.z);
}
