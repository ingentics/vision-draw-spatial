import { setCellObjectAttribute, setCellStyleValue, setPageAttribute } from '../format/cellEdits';
import type { PageTree } from '../format/xmlTree';
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

/** Ce qui situe les clés d'un mode : son espace de noms, et les anciens noms de ses clés lus le temps de la migration. */
export interface ModeKeyOwner {
  namespace: string;
  /**
   * Noms courts dont l'ancienne clé `spatial.<nom>` (avant l'espace de noms) est encore lue, puis réécrite sous son
   * nouveau nom à l'ouverture du document. À retirer quand plus aucun fichier ancien ne peut exister.
   */
  legacyKeys?: readonly string[];
}

/** Clé complète d'un nom court du mode ; un nom invalide (ou déjà complet) lève une exception. */
export function modeKey(namespace: string, name: string): string {
  if (!NAME_PATTERN.test(name) || name.startsWith(SPATIAL_PREFIX))
    throw new Error(`clé de mode invalide : « ${name} »`);
  return `${SPATIAL_PREFIX}${namespace}.${name}`;
}

/** Ancienne clé d'un nom court, avant l'espace de noms (`spatial.<nom>`). */
export const legacyKey = (name: string): string => `${SPATIAL_PREFIX}${name}`;

interface SpatialSource {
  style: Record<string, string>;
  attributes: Record<string, string>;
}

/** Lecture des clés d'un mode par leur nom court, ancienne clé comprise le temps de la migration. */
export interface ModeKeys {
  readonly namespace: string;
  /** Clé complète, pour l'écrire soi-même dans un style (modèle de palette, aperçu d'une forme). */
  key(name: string): string;
  /** Valeur sur une forme ou une flèche (style, sinon objet). */
  value(element: SpatialSource, name: string): string | undefined;
  /** Drapeau sur une forme ou une flèche : vrai pour `1`. */
  flag(element: SpatialSource, name: string): boolean;
  /** Valeur sur la page (attribut de `<diagram>`). */
  pageValue(page: Pick<PageModel, 'attributes'>, name: string): string | undefined;
}

export function modeKeys(owner: ModeKeyOwner): ModeKeys {
  const legacy = new Set(owner.legacyKeys);
  const key = (name: string) => modeKey(owner.namespace, name);
  const value = (element: SpatialSource, name: string) =>
    spatialValue(element, key(name)) ?? (legacy.has(name) ? spatialValue(element, legacyKey(name)) : undefined);
  return {
    namespace: owner.namespace,
    key,
    value,
    flag: (element, name) => value(element, name) === '1',
    pageValue: (page, name) =>
      page.attributes[key(name)] ?? (legacy.has(name) ? page.attributes[legacyKey(name)] : undefined),
  };
}

/**
 * Anciennes clés d'une page du mode réécrites sous leur nouveau nom, à la même place (attribut de `<diagram>`, style ou
 * objet de l'élément), puis retirées ; vrai si l'arbre a changé. Une nouvelle clé déjà là l'emporte : l'ancienne est
 * seulement retirée.
 */
export function migrateLegacyKeys(page: PageModel, pageTree: PageTree, owner: ModeKeyOwner): boolean {
  let changed = false;
  for (const name of owner.legacyKeys ?? []) {
    const [before, after] = [legacyKey(name), modeKey(owner.namespace, name)];
    const old = page.attributes[before];
    if (old !== undefined) {
      if (page.attributes[after] === undefined) setPageAttribute(pageTree, after, old);
      setPageAttribute(pageTree, before, undefined);
      changed = true;
    }
    for (const element of [...page.shapes, ...page.edges]) {
      const inStyle = element.style[before];
      const inObject = element.attributes[before];
      if (inStyle === undefined && inObject === undefined) continue;
      if (spatialValue(element, after) === undefined) {
        if (inStyle !== undefined) setCellStyleValue(pageTree, element.id, after, inStyle);
        else setCellObjectAttribute(pageTree, element.id, after, inObject);
      }
      if (inStyle !== undefined) setCellStyleValue(pageTree, element.id, before, undefined);
      if (inObject !== undefined) setCellObjectAttribute(pageTree, element.id, before, undefined);
      changed = true;
    }
  }
  return changed;
}
