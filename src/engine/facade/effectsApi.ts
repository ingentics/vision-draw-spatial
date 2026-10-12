import type { EffectRegistryView } from '../core/effects/registry';
import type { PageModel } from '../core/model/types';
import type { EngineCore } from '../core/domains/EngineCore';

/** Effets de page (sujet 143). */
export class EffectsApi {
  constructor(private readonly core: EngineCore) {}

  /** Effets de page du moteur, en lecture seule (sujets 290, 304 : l'appli n'en suppose pas d'autre). */
  registry(): EffectRegistryView {
    return this.core.effects.view();
  }

  /** Effets actifs possibles sur la page : permis par son mode et ses modes d'affichage (appel du mode protégé). */
  allowed(page: PageModel): string[] {
    return this.core.pageEffects.allowed(page);
  }

  /** Active ou retire un effet d'une page (`spatial.effects`), en une étape d'annulation. */
  setPageEffect(pageId: string, effectId: string, enabled: boolean): void {
    this.core.pageEffects.setPageEffect(pageId, effectId, enabled);
  }
}
