/**
 * Appel protégé d'un plugin (sujets 288, 300, 378) : le seul endroit où le moteur rattrape l'exception d'une forme, d'un
 * mode ou d'un effet. Une exception n'arrête ni la lecture, ni le rendu, ni le geste : le point d'entrée est traité
 * comme absent (la valeur de repli de l'appelant).
 */

/** Famille d'un plugin, en tête de ses messages (« Forme rectangle », « Mode rdd », « Effet forest »). */
export type PluginFamily = 'Forme' | 'Mode' | 'Effet';

/** Reçoit l'erreur d'un plugin (`hook` : point d'entrée, ex. `flat.create`) ; dans le moteur, `PluginGuard`. */
export type PluginReport = (family: PluginFamily, id: string, hook: string, error: unknown) => void;

/**
 * `run` protégé : sa valeur, ou celle de `fallback` s'il lève une exception. L'erreur va à `report` ; sans rapporteur
 * (registre utilisé hors du moteur, tests), à la console : jamais d'exception qui remonte.
 */
export function callPlugin<T>(
  family: PluginFamily,
  id: string,
  hook: string,
  fallback: () => T,
  run: () => T,
  report?: PluginReport,
): T {
  try {
    return run();
  } catch (error) {
    if (report) report(family, id, hook, error);
    else console.error(`${family} ${id} : erreur dans ${hook}`, error);
    return fallback();
  }
}
