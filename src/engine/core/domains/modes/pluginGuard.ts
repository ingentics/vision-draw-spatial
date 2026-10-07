import type { ParseWarning } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/**
 * Appels protégés des plugins (sujet 288) : une exception levée par un mode, un effet ou une forme (sujet 300, appels
 * protégés par le registre des formes) n'arrête ni la lecture, ni le rendu, ni le geste. Le point d'appel est traité comme absent (la valeur de repli de l'appelant) et l'erreur est
 * signalée une fois par plugin et par point d'appel, dans les Diagnostics, pour toute la session.
 */
export class PluginGuard {
  private readonly errors = new Map<string, ParseWarning>();
  private publishing = false;

  constructor(private readonly core: EngineCore) {}

  /** `run` protégé : sa valeur, ou `fallback` s'il lève une exception. `plugin` : ex. « Mode rdd ». */
  call<T>(plugin: string, hook: string, fallback: T, run: () => T): T {
    try {
      return run();
    } catch (error) {
      this.report(plugin, hook, error);
      return fallback;
    }
  }

  /** Erreur d'un plugin, signalée une fois ; les Diagnostics la montrent après l'appel en cours. */
  report(plugin: string, hook: string, error: unknown): void {
    const key = `${plugin}\n${hook}`;
    if (this.errors.has(key)) return;
    const detail = error instanceof Error ? error.message : String(error);
    this.errors.set(key, { message: `${plugin} : erreur dans ${hook} (${detail})`, level: 'error' });
    console.error(`${plugin} : erreur dans ${hook}`, error);
    // Hors de l'appel en cours (lecture, rendu, geste), qui peut être au milieu d'une relecture du document.
    if (this.publishing) return;
    this.publishing = true;
    queueMicrotask(() => {
      this.publishing = false;
      this.core.file.publishWarnings();
    });
  }

  /** Erreurs signalées, au niveau `error` dans les avertissements des Diagnostics. */
  warnings(): ParseWarning[] {
    return [...this.errors.values()];
  }

  /** L'avertissement est-il une erreur de plugin (pour la remplacer à la republication) ? */
  owns(warning: ParseWarning): boolean {
    return [...this.errors.values()].includes(warning);
  }
}
