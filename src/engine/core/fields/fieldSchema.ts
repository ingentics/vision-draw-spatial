import { isHexColor } from '../model/styleValues';
import type { ModeIcon } from '../modes/types';

/**
 * Schéma commun des champs déclarés (sujet 391) : réglages d'une forme (`ShapeProperty`), d'un mode (`ModeProperty`)
 * et réglages globaux d'un plugin (`PluginSetting`) étendent tous `Field`, en n'ajoutant que ce qui leur est propre
 * (cible et chemin d'écriture, défaut, section…). L'appli les rend par un seul composant de champ.
 */

/** Choix d'un champ `choice`. */
export interface FieldOption {
  value: string;
  label: string;
  /** Aide au survol d'une option en bouton (sujet 319) : ce que fait le choix ; défaut : `label`. */
  title?: string;
  /** Pastille de couleur de l'option (#rrggbb). */
  color?: string;
  /** Icône de l'option, mêmes tracés que l'icône d'un mode (sujet 319). */
  icon?: ModeIcon;
}

/** Ce que tout champ déclare. */
interface FieldBase {
  key: string;
  label: string;
  /** Aide au survol. */
  title?: string;
  /** Aide affichée sous le champ (sujet 515, ex. exemple pour répondre à une question). */
  help?: string;
}

/**
 * Champ déclaré, selon son `type` ; `Options` : forme des choix d'un `choice` (liste fixe, ou fonction de la page
 * pour un mode).
 */
export type FieldOf<Options> = FieldBase &
  (
    | { type: 'toggle' }
    | {
        type: 'number';
        /** Valeur affichée quand il n'y en a pas (la valeur par défaut). */
        placeholder?: string;
        /** Bornes : la valeur y est ramenée ; avec `step`, le champ est un curseur. */
        min?: number;
        max?: number;
        step?: number;
        /** Affichage : `px`, `ms`, ou `%` (fraction de 0 à 1 affichée en pourcentage). */
        unit?: 'px' | 'ms' | '%';
        /** Libellé de la valeur 0 (ex. « sans »). */
        zero?: string;
      }
    | {
        type: 'text';
        placeholder?: string;
        /** Plusieurs lignes (zone de texte, ⌘ + Entrée ou sortie du champ pour valider). */
        multiline?: boolean;
        /** Zone de texte en police à chasse fixe, sans retour automatique (sujet 331). */
        monospace?: boolean;
        /**
         * Réglé en direct (sujets 271, 306) : chaque frappe est écrite, une seule étape d'annulation par passage dans
         * le champ ; sinon à la validation.
         */
        live?: boolean;
      }
    /** Choix (valeur vide = aucun) : en boutons si toutes les options sont dessinées, sinon en liste (sujet 319). */
    | {
        type: 'choice';
        options: Options;
        /** Choix nommés en boutons écrits, libellé au-dessus (sujet 515, ex. Oui / Non d'une question) ; sinon en liste. */
        buttons?: boolean;
      }
    /** Couleur #rrggbb. */
    | { type: 'color' }
    /** Adresse http(s), sans barre finale (sujet 306, ex. serveur local). */
    | { type: 'url' }
    /** Bouton pleine largeur (sujet 253) : son clic écrit une valeur vide (une opération pour un mode). */
    | { type: 'button' }
  );

/** Champ déclaré à choix fixes. */
export type Field = FieldOf<readonly FieldOption[]>;

/** Sorte de champ. */
export type FieldType = Field['type'];

/** Champ de la sorte `T` (ou d'une des sortes de `T`). */
export type FieldOfType<T extends FieldType, Options = readonly FieldOption[]> = Extract<FieldOf<Options>, { type: T }>;

/** Valeur typée d'un champ (paramètres : nombre, booléen, ou texte). */
export type FieldValue = number | boolean | string;

/** Adresse http(s), espaces et barres finales retirés ; undefined pour tout le reste. */
export function httpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const url = value.trim().replace(/\/+$/, '');
  return /^https?:\/\/\S+$/i.test(url) ? url : undefined;
}

/** Valeur `value` si elle convient au champ (nombre ramené dans ses bornes, adresse normalisée) ; sinon undefined. */
export function readFieldValue(field: Field, value: unknown): FieldValue | undefined {
  switch (field.type) {
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
      // Pas `clamp` : les bornes sont déclarées par le plugin, rien ne garantit `min ≤ max` ; à bornes inversées, le
      // maximum l'emporte ici (`clamp` ferait gagner le minimum), comme avant la mise en commun.
      const floored = field.min === undefined ? value : Math.max(field.min, value);
      return field.max === undefined ? floored : Math.min(field.max, floored);
    }
    case 'toggle':
      return typeof value === 'boolean' ? value : undefined;
    case 'text':
      return typeof value === 'string' ? value : undefined;
    case 'color':
      return typeof value === 'string' && isHexColor(value) ? value : undefined;
    case 'choice':
      return typeof value === 'string' && field.options.some((option) => option.value === value) ? value : undefined;
    case 'url':
      return httpUrl(value);
    case 'button':
      return undefined;
  }
}

/**
 * Présentation d'un choix (sujet 319) : en boutons quand toutes ses options sont dessinées (icône ou pastille de
 * couleur), sinon en liste (choix nommés, nombreux ou qui varient avec la page).
 */
export function choiceDisplay(options: readonly FieldOption[]): 'buttons' | 'list' {
  return options.length > 0 && options.every((option) => option.icon || option.color) ? 'buttons' : 'list';
}
