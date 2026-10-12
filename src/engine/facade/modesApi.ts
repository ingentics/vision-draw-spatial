import type { PageModel } from '../core/model/types';
import type { ModeRegistryView, ModeScope } from '../core/modes/registry';
import type { ModeEdit } from '../core/modes/modeEdit';
import type { ModeTarget } from '../core/modes/types';
import type { ModeIndicator, ModePropertyView } from '../core/domains/types';
import type { EngineCore } from '../core/domains/EngineCore';

/** Modes de page (sujet 69) : mode d'une page, opérations, réglages déclarés, courant du mode. */
export class ModesApi {
  constructor(private readonly core: EngineCore) {}

  /** Modes de page du moteur, en lecture seule (sujet 304) : choix du mode, réglages déclarés, modes d'affichage. */
  registry(): ModeRegistryView {
    return this.core.modes.view();
  }

  /**
   * Mode d'une page (`spatial.mode`) ; undefined : page normale. Les données du mode restent en sommeil sur la page
   * et ses éléments : revenir au mode les retrouve.
   */
  setPageMode(pageId: string, modeId: string | undefined): void {
    this.core.pageModes.setPageMode(pageId, modeId);
  }

  /**
   * Opération d'un mode sur la page courante (ex. ajouter un flux) : ses écritures forment une étape d'annulation ;
   * rien n'est enregistré si elle ne change rien.
   */
  edit(label: string, edit: (edit: ModeEdit) => void): void {
    this.core.pageModes.editPageMode(label, edit);
  }

  /**
   * Réglages déclarés par le mode de la page pour une cible, évalués (valeur, lecture seule, choix) : le panneau les
   * affiche sans appeler le mode (sujet 294). `palette` : couleurs proposées aux choix.
   */
  propertyViews(
    page: PageModel,
    scope: ModeScope,
    target: ModeTarget,
    part?: string,
    palette?: readonly string[],
  ): ModePropertyView[] {
    return this.core.modePanel.propertyViews(page, scope, target, part, palette);
  }

  /**
   * Réglage déclaré par le mode de la page courante (`scope` : la page, ou la flèche / forme `targetId`), écrit par
   * sa règle s'il en a une, sinon dans son attribut. undefined = vide. `part` : partie sélectionnée de la forme, pour
   * un réglage de partie (sujet 249). `merge` : réglage en direct (`ModeProperty.live`), une seule étape d'annulation
   * tant que la clé est la même (sujet 271).
   */
  setProperty(
    scope: ModeScope,
    targetId: string | undefined,
    key: string,
    value: string | undefined,
    part?: string,
    merge?: string,
  ): void {
    this.core.modePanel.setModeProperty(scope, targetId, key, value, part, merge);
  }

  /**
   * « Courant » du mode d'une page (ex. flux courant) : le dernier choisi s'il est encore valable, sinon la valeur
   * initiale du mode ; undefined pour une page sans mode ou sans courant.
   */
  current(pageId?: string): string | undefined {
    return this.core.modeCurrents.getModeCurrent(pageId);
  }

  /**
   * Barre du courant du mode de la page, en haut de la zone de dessin : couleur, libellé, valeurs possibles dans
   * l'ordre (boutons précédent / suivant). Undefined : pas de barre (pas de mode, pas de courant, pas de couleur).
   */
  indicator(pageId?: string): ModeIndicator | undefined {
    return this.core.modeCurrents.getModeIndicator(pageId);
  }

  /**
   * Renomme le courant du mode de la page courante (ex. titre du flux courant, depuis la barre) : une étape
   * d'annulation. Un nom vide (ou fait d'espaces) est ignoré.
   */
  renameCurrent(label: string): void {
    this.core.modeCurrents.renameModeCurrent(label);
  }

  /** Choisit le courant du mode d'une page (ex. bouton « suivant » de la barre) ; ignoré s'il n'est pas valable. */
  setCurrent(value: string, pageId?: string): void {
    this.core.modeCurrents.setModeCurrent(value, pageId);
  }

  /** Flèche gérée par le mode de la page courante (`edges.manages`, ex. relation RDD) : réglages imposés. */
  managesEdge(edgeId: string): boolean {
    return this.core.pageModes.managesEdge(edgeId);
  }
}
