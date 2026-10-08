import { readonlyModel } from '../model/freeze';

/**
 * Appel d'un point d'entrée de mode avec ses arguments en lecture seule (sujets 303, 324, 379) : le seul endroit où le
 * tronc remet le modèle à un mode. Chaque argument passe par `readonlyModel` : page, forme, flèche, mais aussi point,
 * liste d'ids ou réglages (objets simples) ; une opération (`ModeEditWriter`, objet d'une classe) et les valeurs simples
 * passent telles quelles. Le point d'entrée est appelé détaché de son objet (un mode n'utilise pas `this`). Pas de
 * protection ici : l'hôte (`PageModes.call`) ou l'opération qui l'englobe (`PageModes.editPageMode`) la pose.
 */
export function callMode<A extends unknown[], R>(entry: (...args: A) => R, ...args: A): R {
  return entry(...(args.map((arg) => readonlyModel(arg)) as A));
}
