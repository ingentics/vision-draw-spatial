import { callPlugin } from '../../diagnostics/pluginCalls';
import type { PluginFamily, PluginReport } from '../../diagnostics/pluginCalls';
import type { ParseWarning } from '../../model/types';
import type { EngineCore } from '../EngineCore';

/**
 * Rapporteur des erreurs des plugins (sujets 288, 378) : formes (par leur registre), modes (par leur hôte `PageModes`)
 * et effets (par leur hôte `PageEffects`) passent par le même appel protégé (`callPlugin`). L'erreur est signalée une
 * fois par plugin et par point d'appel, dans les Diagnostics, pour toute la session.
 */
export class PluginGuard {
  private readonly errors = new Map<string, ParseWarning>();
  private publishing = false;

  constructor(private readonly core: EngineCore) {}

  /** Rapporteur à passer à un registre ou à `callPlugin`. */
  readonly reporter: PluginReport = (family, id, hook, error) => this.report(`${family} ${id}`, hook, error);

  /** `run` protégé : sa valeur, ou `fallback` s'il lève une exception, signalée dans les Diagnostics. */
  call<T>(family: PluginFamily, id: string, hook: string, fallback: T, run: () => T): T {
    return callPlugin(family, id, hook, () => fallback, run, this.reporter);
  }

  /** Erreur d'un plugin (`plugin` : ex. « Mode rdd »), signalée une fois ; les Diagnostics la montrent après l'appel en cours. */
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
