import type { AlignMove, AlignReference, DistributeMove } from '../core/edit/align';
import type { OrderMove } from '../core/format/order';
import type { PickedElement } from '../core/interaction/pick';
import type { Selection } from '../core/domains/types';
import type { EngineCore } from '../core/domains/EngineCore';

/** Sélection (SPEC §11) et commandes sur elle : ordre, alignement, suppression, presse-papier. */
export class SelectionApi {
  constructor(private readonly core: EngineCore) {}

  current(): Selection | undefined {
    return this.core.selection.getSelection();
  }

  select(picked: PickedElement | undefined): void {
    this.core.selection.select(picked);
  }

  /** Tout sélectionner (⌘ + A, ticket 122) : tous les éléments de la page courante, comme une zone qui les couvrirait. */
  selectAll(): void {
    this.core.selection.selectAll();
  }

  clear(): void {
    this.core.selection.clearSelection();
  }

  /** Ordre de dessin de la sélection (ticket 130) : premier plan, arrière-plan, avancer, reculer. */
  order(move: OrderMove): void {
    this.core.arrange.orderSelection(move);
  }

  /**
   * Aligne les formes de la sélection (ticket 136) sur la référence : cadre de la sélection, premier ou dernier
   * élément sélectionné ; une étape d'annulation, flèches réparties à nouveau en ancrage automatique.
   */
  align(move: AlignMove, reference: AlignReference): void {
    this.core.arrange.alignSelection(move, reference);
  }

  /** Répartit les formes de la sélection (ticket 136) à intervalles égaux, les deux extrêmes restant en place. */
  distribute(move: DistributeMove): void {
    this.core.arrange.distributeSelection(move);
  }

  /** Supprime la sélection : avec son contenu, ses labels et les arêtes qui y sont reliées (comme draw.io). */
  delete(label?: string): void {
    this.core.elements.deleteSelection(label);
  }

  /**
   * Copie la sélection (ticket 59) : renvoie le XML à mettre dans le presse-papier (format draw.io),
   * aussi gardé comme presse-papier interne. Undefined : rien à copier.
   */
  copy(): string | undefined {
    return this.core.clipboard.copySelection();
  }

  /** Coupe la sélection : copiée puis supprimée ; le premier collage la remet à sa place. */
  cut(): string | undefined {
    return this.core.clipboard.cutSelection();
  }

  /**
   * Colle sur la page courante : `text` lu dans le presse-papier système (sans lui : le presse-papier
   * interne). Les éléments collés sont décalés d'un pas de grille de plus à chaque collage du même
   * contenu, puis sélectionnés. Renvoie false si le texte n'est pas un contenu draw.io.
   */
  paste(text?: string): boolean {
    return this.core.clipboard.paste(text);
  }

  /** Duplique la sélection (copier + coller sans toucher au presse-papier), décalée d'un pas de grille. */
  duplicate(): void {
    this.core.clipboard.duplicateSelection();
  }
}
