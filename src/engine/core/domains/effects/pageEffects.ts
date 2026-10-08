import type { Object3D } from 'three';
import { setPageAttribute } from '../../format/cellEdits';
import { pageEffectIds, withPageEffect } from '../../effects/registry';
import type { PageEffectDefinition } from '../../effects/types';
import type { DocumentModel, PageModel, ParseWarning } from '../../model/types';
import { SPATIAL } from '../../spatial';
import type { EngineCore } from '../EngineCore';

/**
 * Hôte des effets de page (sujets 143, 378) : le moteur ne pose ses questions sur les effets qu'à lui. Il joint le
 * registre (déclaration des effets), le mode de la page (maître : `PageModes.allowsEffect`), les réglages et le
 * rapporteur des erreurs (`PluginGuard`).
 */
export class PageEffects {
  constructor(private readonly core: EngineCore) {}

  /** Effets possibles sur la page : permis par son mode et ses modes d'affichage (appel du mode protégé). */
  allowed(page: PageModel): string[] {
    return this.core.effects
      .list()
      .filter(this.allows(page))
      .map((effect) => effect.id);
  }

  /** Active ou retire un effet d'une page (`spatial.effects`), en une étape d'annulation. */
  setPageEffect(pageId: string, effectId: string, enabled: boolean): void {
    const target = this.core.targets.editablePageById(pageId);
    if (!target) return;
    const { page, pageTree } = target;
    if (pageEffectIds(page).includes(effectId) === enabled) return;
    const name = this.core.effects.get(effectId)?.name ?? effectId;
    this.core.edits.recordEdit(enabled ? `Effet ${name}` : `Sans effet ${name}`);
    setPageAttribute(pageTree, SPATIAL.effects, withPageEffect(page, effectId, enabled));
    this.core.file.documentChanged([pageId], { distribute: false });
  }

  /** Ajoute les décors en volume des effets actifs à la scène d'une page ; un décor en panne est signalé et omis. */
  decorate(page: PageModel, root: Object3D): void {
    const { effects, view } = this.core.settings;
    this.core.effects.decorate(page, root, {
      allows: this.allows(page),
      settings: effects,
      shading: { light: view.shadeLight, dark: view.shadeDark },
      report: this.core.pluginGuard.reporter,
    });
  }

  /** La page a-t-elle un décor en volume actif (elle passe alors en volume en iso / 3D) ? */
  hasVolume(page: PageModel): boolean {
    return this.core.effects.hasVolume(page, this.allows(page));
  }

  /** Effets inconnus, pour le panneau Diagnostics. */
  warnings(document: Pick<DocumentModel, 'pages'>): ParseWarning[] {
    return this.core.effects.warnings(document);
  }

  private allows(page: PageModel): (effect: PageEffectDefinition) => boolean {
    return (effect) => this.core.pageModes.allowsEffect(page, effect);
  }
}
