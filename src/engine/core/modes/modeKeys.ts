import type { PageModel } from '../model/types';
import { SPATIAL_PREFIX, spatialValue } from '../spatial';

/**
 * Clés d'un mode (sujet 301) : `spatial.<espace de noms>.<nom>`. Le mode ne désigne ses clés que par leur nom court ;
 * le moteur ajoute le préfixe, si bien qu'un mode n'écrit jamais hors de son espace de noms (ni les clés du tronc, ni
 * celles d'un autre mode).
 */

/** Espace de noms d'un mode (ex. `rdd`, `seq`). */
export const NAMESPACE_PATTERN = /^[a-z][a-z0-9]*$/;
/** Nom court d'une clé de mode (ex. `flow`, `fields`) : ni `;`, ni `=`, ni espace, qui casseraient le style draw.io. */
const NAME_PATTERN = /^[A-Za-z][\w.-]*$/;

/** Ce qui situe les clés d'un mode : son espace de noms. */
export interface ModeKeyOwner {
  namespace: string;
}

/** Clé complète d'un nom court du mode ; un nom invalide (ou déjà complet) lève une exception. */
export function modeKey(namespace: string, name: string): string {
  if (!NAME_PATTERN.test(name) || name.startsWith(SPATIAL_PREFIX))
    throw new Error(`clé de mode invalide : « ${name} »`);
  return `${SPATIAL_PREFIX}${namespace}.${name}`;
}

interface SpatialSource {
  style: Record<string, string>;
  attributes: Record<string, string>;
}

/** Lecture des clés d'un mode par leur nom court. */
export interface ModeKeys {
  readonly namespace: string;
  /** Clé complète, pour l'écrire soi-même dans un style (modèle de palette, aperçu d'une forme). */
  key(name: string): string;
  /** Valeur sur une forme ou une flèche (style, sinon objet). */
  value(element: SpatialSource, name: string): string | undefined;
  /** Drapeau sur une forme ou une flèche : vrai pour `1`. */
  flag(element: SpatialSource, name: string): boolean;
  /** Nombre fini sur une forme ou une flèche ; `undefined` si la clé est absente, vide ou pas un nombre. */
  number(element: SpatialSource, name: string): number | undefined;
  /** Valeur sur la page (attribut de `<diagram>`). */
  pageValue(page: Pick<PageModel, 'attributes'>, name: string): string | undefined;
  /**
   * Drapeau de la page. Défaut éteint : vrai pour `1`. Défaut allumé (`defaultOn`) : vrai sauf pour `0`, ce qu'un
   * réglage « affiché » écrit pour se masquer (le fichier n'a pas à le porter pour être affiché).
   */
  pageFlag(page: Pick<PageModel, 'attributes'>, name: string, defaultOn?: boolean): boolean;
}

export function modeKeys(owner: ModeKeyOwner): ModeKeys {
  const key = (name: string) => modeKey(owner.namespace, name);
  const value = (element: SpatialSource, name: string) => spatialValue(element, key(name));
  return {
    namespace: owner.namespace,
    key,
    value,
    flag: (element, name) => value(element, name) === '1',
    number: (element, name) => {
      const text = value(element, name)?.trim();
      const parsed = text ? Number(text) : NaN;
      return Number.isFinite(parsed) ? parsed : undefined;
    },
    pageValue: (page, name) => page.attributes[key(name)],
    pageFlag: (page, name, defaultOn = false) => {
      const text = page.attributes[key(name)];
      return defaultOn ? text !== '0' : text === '1';
    },
  };
}
