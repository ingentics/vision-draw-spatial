import type { ReadonlyPageModel as PageModel } from '../model/readonly';
import type { ModeEdit } from './modeEdit';
import type { ModeIcon, ModeTarget } from './types';

export interface ModeOption {
  value: string;
  label: string;
  /** Pastille de couleur devant l'option (#rrggbb). */
  color?: string;
  /** Icône de l'option, mêmes tracés que l'icône d'un mode (sujet 319). */
  icon?: ModeIcon;
  /** Aide au survol d'une option en bouton (sujet 319) : ce que fait le choix ; défaut : `label`. */
  title?: string;
}

/**
 * Réglage déclaré par un mode, rendu par un champ générique. Par défaut, il lit et écrit l'attribut du mode de nom
 * court `key` sur sa cible (`spatial.<namespace>.<key>`) ; `value` et `write` le remplacent quand le réglage passe par
 * les règles du mode (ex. un rang qui s'échange).
 */
export type ModeProperty = {
  key: string;
  label: string;
  /** Aide au survol. */
  title?: string;
  placeholder?: string;
  /**
   * Réglage d'une partie de la forme (sujet 249) : montré seulement quand une partie est sélectionnée, et les autres
   * réglages de forme seulement quand aucune ne l'est ; `part` est alors passé à `value`, `write` et `hidden`.
   */
  part?: boolean;
  /** Montré que la forme seule ou une de ses parties soit sélectionnée (ex. bouton d'ajout d'un séparateur, 253). */
  anyPart?: boolean;
  /** Valeur affichée ; défaut : l'attribut `key`. */
  value?(page: PageModel, target: ModeTarget, part?: string): string | undefined;
  /**
   * Écriture (undefined = vide) ; défaut : l'attribut `key`. Peut renvoyer la partie de la forme à sélectionner ensuite,
   * dont le texte passe en édition s'il en a un (ex. séparateur ajouté, sujet 253).
   */
  write?(edit: ModeEdit, target: ModeTarget, value: string | undefined, part?: string): string | void;
  /** Champ masqué pour cette cible (ex. rang d'une flèche sans flux). */
  hidden?(page: PageModel, target: ModeTarget, part?: string): boolean;
  /** Affiché sans être modifiable (ex. clé primaire d'une entité) ; selon la cible (ex. label de la clé, sujet 260). */
  readOnly?: boolean | ((page: PageModel, target: ModeTarget, part?: string) => boolean);
  /** Section du panneau (titre) ; défaut : celle au nom du mode (sujet 260, ex. « PostgreSQL »). */
  section?: string;
} & (
  | { type: 'toggle' }
  | { type: 'number' }
  /** Bouton pleine largeur (sujet 253) : son clic appelle `write` (valeur undefined). */
  | { type: 'button' }
  | {
      type: 'text';
      /** Plusieurs lignes (zone de texte, ⌘ + Entrée ou sortie du champ pour valider). */
      multiline?: boolean;
      /** Zone de texte en police à chasse fixe, sans retour automatique (sujet 331). */
      monospace?: boolean;
      /** Écrit à chaque frappe, une seule étape d'annulation par saisie (sujet 271) ; sinon à la validation. */
      live?: boolean;
    }
  | {
      type: 'select';
      /**
       * Choix offerts (valeur vide = aucun) ; `palette` : couleurs proposées par l'appli (`ModeEdit.palette`). Si toutes
       * les options ont une icône ou une couleur, le panneau les montre en boutons (pastilles), sinon en liste (sujet
       * 319).
       */
      options(page: PageModel, palette: readonly string[]): ModeOption[];
    }
);
