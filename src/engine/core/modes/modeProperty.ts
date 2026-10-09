import type { FieldOfType, FieldOption } from '../fields/fieldSchema';
import type { ReadonlyPageModel as PageModel } from '../model/readonly';
import type { ModeEdit } from './modeEdit';
import type { ModeTarget } from './types';

/**
 * Choix d'un réglage `choice` de mode, selon la page ; `palette` : couleurs proposées par l'appli (`ModeEdit.palette`).
 */
export type ModeOptions = (page: PageModel, palette: readonly string[]) => FieldOption[];

/**
 * Réglage déclaré par un mode : champ du schéma commun (`Field`, sujet 391) rendu par le champ générique. Par défaut,
 * il lit et écrit l'attribut du mode de nom court `key` sur sa cible (`spatial.<namespace>.<key>`) ; `value` et
 * `write` le remplacent quand le réglage passe par les règles du mode (ex. un rang qui s'échange). Un `button` appelle
 * `write` (valeur undefined).
 */
export type ModeProperty = {
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
  /** Section du panneau (titre) ; défaut : celle au nom du mode (sujet 260, ex. « Couche physique »). */
  section?: string;
} & FieldOfType<'toggle' | 'number' | 'text' | 'choice' | 'button', ModeOptions>;
