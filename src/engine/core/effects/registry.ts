import type { Object3D } from 'three';
import type { DocumentModel, PageModel, ParseWarning } from '../model/types';
import { PLUGIN_ID_PATTERN, SPATIAL } from '../spatial';
import { pageRoom } from './room';
import { pluginValues } from '../settings/pluginSettings';
import type { PluginSettings, PluginValues } from '../settings/pluginSettings';
import { facetShade } from '../render/iso/block';
import type { EffectLight, EffectRoom, PageEffectDefinition } from './types';
import { freezePlain, readonlyModel } from '../model/freeze';
import { callPlugin } from '../diagnostics/pluginCalls';
import type { PluginReport } from '../diagnostics/pluginCalls';

/** Effets écrits sur une page (`spatial.effects`, séparés par des virgules), connus ou non, sans doublon. */
export function pageEffectIds(page: PageModel): string[] {
  const ids = (page.attributes[SPATIAL.effects] ?? '').split(',').map((id) => id.trim());
  return [...new Set(ids.filter((id) => id !== ''))];
}

/** Valeur de `spatial.effects` avec un effet ajouté ou retiré ; undefined quand il n'en reste aucun. */
export function withPageEffect(page: PageModel, effectId: string, enabled: boolean): string | undefined {
  const ids = pageEffectIds(page).filter((id) => id !== effectId);
  if (enabled) ids.push(effectId);
  return ids.length > 0 ? ids.join(',') : undefined;
}

/** Ce que l'appli voit d'un effet (sujet 304) : sa déclaration, sans son décor. */
export type EffectInfo = Readonly<Pick<PageEffectDefinition, 'id' | 'name' | 'description' | 'settings' | 'viewModes'>>;

/** Ce que l'appli voit du registre des effets (sujet 304). */
export interface EffectRegistryView {
  list(): EffectInfo[];
  get(id: string): EffectInfo | undefined;
  values(effectId: string, stored: Record<string, unknown> | undefined): PluginValues;
}

/**
 * Registre des effets de page (sujet 143) : déclaration des effets et questions sur eux ; `allows` (le mode de la page,
 * maître) filtre les effets actifs. Le moteur ne l'interroge que par l'hôte des effets (`core/domains/effects/`, sujet
 * 378), qui sait ce que le mode permet.
 */
export class PageEffectRegistry {
  private readonly definitions = new Map<string, PageEffectDefinition>();

  /** Lèvent une exception : un id déjà pris (sujet 304), un id hors de `PLUGIN_ID_PATTERN` (sujet 378). */
  register(definition: PageEffectDefinition): this {
    if (typeof definition.id !== 'string' || !PLUGIN_ID_PATTERN.test(definition.id))
      throw new Error(`Effet ${definition.id} : id invalide (minuscules, chiffres et tirets)`);
    if (this.definitions.has(definition.id)) throw new Error(`Effet ${definition.id} : id déjà pris`);
    // Gelée (sujet 303) : un plugin ne modifie pas la définition d'un autre.
    this.definitions.set(definition.id, freezePlain(definition));
    return this;
  }

  /** Vue en lecture seule pour l'appli (sujet 304) : déclaration des effets et valeurs de leurs réglages. */
  view(): EffectRegistryView {
    const info = (effect: PageEffectDefinition): EffectInfo =>
      Object.freeze({
        id: effect.id,
        name: effect.name,
        description: effect.description,
        settings: effect.settings,
        viewModes: effect.viewModes,
      });
    return {
      list: () => this.list().map(info),
      get: (id) => {
        const effect = this.get(id);
        return effect && info(effect);
      },
      values: (id, stored) => this.values(id, stored),
    };
  }

  /** Effets enregistrés, par nom. */
  list(): PageEffectDefinition[] {
    return [...this.definitions.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: string): PageEffectDefinition | undefined {
    return this.definitions.get(id);
  }

  /** Effets actifs d'une page : écrits, connus et permis par son mode. */
  active(page: PageModel, allows: (effect: PageEffectDefinition) => boolean = () => true): PageEffectDefinition[] {
    return pageEffectIds(page).flatMap((id) => {
      const effect = this.definitions.get(id);
      return effect && allows(effect) ? [effect] : [];
    });
  }

  /** La page a-t-elle un décor en volume (elle passe alors en volume en iso / 3D, même sans forme en volume) ? */
  hasVolume(page: PageModel, allows?: (effect: PageEffectDefinition) => boolean): boolean {
    return this.active(page, allows).some((effect) => effect.volume);
  }

  /**
   * Valeurs des réglages d'un effet : celles des paramètres (`settings.effects[id]`) bornées, le défaut pour les
   * autres ; les clés inconnues sont ignorées.
   */
  values(effectId: string, stored: Record<string, unknown> | undefined): PluginValues {
    return pluginValues(this.definitions.get(effectId)?.settings, stored);
  }

  /**
   * Ajoute les décors en volume des effets actifs à la scène d'une page (racine en espace page). `settings` : réglages
   * globaux des effets (`settings.effects`).
   */
  decorate(
    page: PageModel,
    root: Object3D,
    options: {
      allows?: (effect: PageEffectDefinition) => boolean;
      settings?: PluginSettings;
      /** Réglages d'ombrage des volumes (`view.shadeLight`, `view.shadeDark`) ; absent = leurs défauts. */
      shading?: { light: number; dark: number };
      /**
       * Erreur d'un décor (sujet 288) : la page s'affiche sans lui ; sans rapporteur, l'erreur va à la console (appel
       * protégé commun, sujet 378).
       */
      report?: PluginReport;
    } = {},
  ): void {
    let room: EffectRoom | undefined;
    const { shading } = options;
    const light: EffectLight = { shade: (normal) => facetShade(normal, shading?.light, shading?.dark) };
    for (const effect of this.active(page, options.allows)) {
      if (!effect.volume) continue;
      const { volume } = effect;
      const effectRoom = (room ??= pageRoom(page, root));
      const values = this.values(effect.id, options.settings?.[effect.id]);
      const object = callPlugin(
        'Effet',
        effect.id,
        'volume',
        () => undefined,
        () => volume(readonlyModel(page), effectRoom, values, light),
        options.report,
      );
      if (!object) continue;
      object.name = `effect:${effect.id}`;
      object.userData.effectId = effect.id;
      root.add(object);
    }
  }

  /** Effets inconnus (écrits par une version plus récente), pour le panneau Diagnostics. */
  warnings(document: Pick<DocumentModel, 'pages'>): ParseWarning[] {
    return document.pages.flatMap((page) =>
      pageEffectIds(page)
        .filter((id) => !this.definitions.has(id))
        .map((id) => ({ pageId: page.id, message: `Effet de page inconnu : ${id}` })),
    );
  }
}
