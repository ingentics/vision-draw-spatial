import type { EngineCore } from '../../src/engine/core/domains/EngineCore';
import { PageModes } from '../../src/engine/core/domains/modes/pageModes';
import { PluginGuard } from '../../src/engine/core/domains/modes/pluginGuard';
import { PageEffectRegistry } from '../../src/engine/core/effects/registry';
import type { DocumentModel } from '../../src/engine/core/model/types';
import type { PageModeRegistry } from '../../src/engine/core/modes/registry';
import { DEFAULT_SETTINGS } from '../../src/engine/core/settings';
import type { PluginSettings } from '../../src/engine/core/settings/pluginSettings';
import { createDefaultModeRegistry } from '../../src/engine/plugins';

/**
 * Hôte des modes sur un cœur réduit (sujet 304 : habillage, avertissements et effets permis ne sont plus demandés au
 * registre, mais à l'hôte, qui protège chaque appel). `modes` : réglages des modes (`settings.modes`).
 */
export function modeHost(registry: PageModeRegistry = createDefaultModeRegistry(), modes: PluginSettings = {}) {
  const core = {
    modes: registry,
    effects: new PageEffectRegistry(),
    settings: { ...DEFAULT_SETTINGS, modes },
    file: { publishWarnings: () => {} },
  } as unknown as EngineCore;
  Object.assign(core, { pluginGuard: new PluginGuard(core) });
  const host = new PageModes(core);
  return {
    host,
    /** Avertissements des modes pour le document (mode inconnu, données remises en ordre). */
    warnings: (document: Pick<DocumentModel, 'pages'>) => host.withModeWarnings({ ...document, warnings: [] }).warnings,
  };
}
