import { readonlyModel } from './freeze';
import type { ReadonlyPageModel as PageModel } from './readonly';

/**
 * Calculs d'un plugin gardés par page (sujet 552) : une page du document n'est jamais modifiée, son calcul se garde
 * tant qu'elle est la page ; la copie de travail d'un geste (`DocumentFile.livePage`, sujet 312) change en place à
 * chaque image, son calcul est refait dès que ses formes ou ses flèches changent. Les copies en cours sont marquées
 * par le document.
 */

/** Copies de travail en cours (et la vue en lecture seule qu'en reçoivent les plugins) : marque d'objet, pas un état. */
const live = new WeakSet<object>();

/** Copie de travail ouverte : son calcul suit ses changements jusqu'à `livePageSettled`. */
export function livePageOpened(page: object): void {
  live.add(page);
  live.add(readonlyModel(page));
}

/** Copie de travail rendue : désormais une page du document, son calcul se garde. */
export function livePageSettled(page: object): void {
  live.delete(page);
  live.delete(readonlyModel(page));
}

/**
 * Ce dont un calcul de page dépend, sur la copie de travail : un geste remplace les champs qu'il change (bornes,
 * texte, style, points, bouts) par de nouveaux objets, il ne les modifie jamais en place.
 */
function stampOf(page: PageModel): unknown[] {
  return [
    page.shapes.length,
    page.edges.length,
    ...page.shapes.flatMap((shape) => [
      shape,
      shape.bounds,
      shape.style,
      shape.label,
      shape.attributes,
      shape.parentId,
    ]),
    ...page.edges.flatMap((edge) => [edge, edge.points, edge.style, edge.label, edge.sourceId, edge.targetId]),
  ];
}

const sameStamp = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * `compute` gardé par page. Sur la copie de travail d'un geste, gardé tant que ses formes et flèches sont les mêmes
 * (plusieurs appels d'une image, ex. l'habillage de chaque forme de la mini-carte), refait dès qu'elles changent.
 */
export function pageMemo<T>(compute: (page: PageModel) => T): (page: PageModel) => T {
  const cache = new WeakMap<PageModel, T>();
  const liveCache = new WeakMap<PageModel, { stamp: unknown[]; value: T }>();
  return (page) => {
    if (live.has(page)) {
      const stamp = stampOf(page);
      const kept = liveCache.get(page);
      if (kept && sameStamp(kept.stamp, stamp)) return kept.value;
      const value = compute(page);
      liveCache.set(page, { stamp, value });
      return value;
    }
    if (cache.has(page)) return cache.get(page)!;
    const value = compute(page);
    cache.set(page, value);
    return value;
  };
}
