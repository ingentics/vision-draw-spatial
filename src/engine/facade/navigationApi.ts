import type { HistoryEntry, LinkUsage, ParentLink } from '../core/interaction/navigationHistory';
import type { EngineCore } from '../core/domains/EngineCore';

/** Liens et navigation entre pages (SPEC §11) : suivre un lien, revenir, pages parentes. */
export class NavigationApi {
  constructor(private readonly core: EngineCore) {}

  /**
   * Suit le lien d'un élément de la page courante : transition vers la page cible, ou ouverture
   * de l'URL dans un nouvel onglet. Sans effet si l'élément n'a pas de lien exploitable.
   */
  followLink(elementId: string): void {
    this.core.links.followLink(elementId);
  }

  /** Dernière utilisation des liens entre pages du fichier (à persister). */
  linkUsage(): LinkUsage {
    return this.core.links.getLinkUsage();
  }

  /** Pile de navigation (de la plus ancienne à la plus récente entrée). */
  history(): HistoryEntry[] {
    return this.core.history.getHistory();
  }

  /**
   * Retour : dépile et revient exactement à la vue d'origine, par la transition inverse
   * (la page courante rétrécit dans la forme d'où l'on venait). Sans historique : un seul parent
   * → on y va ; plusieurs → événement `backChoice` (l'UI propose la liste, puis `backTo`).
   */
  back(): void {
    this.core.history.back();
  }

  /** Pages parentes de la page courante (pages ayant un lien vers elle), la plus récemment utilisée d'abord. */
  parentPages(): ParentLink[] {
    return this.core.history.parents();
  }

  /**
   * Remonte vers une page parente choisie : comme `back` si la pile y ramène (vue d'origine exacte), sinon sortie par
   * la forme qui porte le lien.
   */
  backTo(parentPageId: string): void {
    this.core.history.backTo(parentPageId);
  }
}
