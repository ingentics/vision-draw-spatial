import type { Object3D } from 'three';
import type { DocumentModel, PageModel, ParseWarning } from '../model/types';
import { SPATIAL } from '../spatial';
import { pageRoom } from './room';
import type { EffectRoom, EffectValues, PageEffectDefinition } from './types';

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

/**
 * Registre des effets de page (sujet 143). Le moteur et l'appli ne posent leurs questions qu'à lui ; `allows` (le
 * mode de la page, maître) filtre les effets actifs.
 */
export class PageEffectRegistry {
  private readonly definitions = new Map<string, PageEffectDefinition>();

  /** Un effet de même `id` déjà enregistré est remplacé. */
  register(definition: PageEffectDefinition): this {
    this.definitions.set(definition.id, definition);
    return this;
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
  values(effectId: string, stored: Record<string, number> | undefined): EffectValues {
    const values: EffectValues = {};
    for (const setting of this.definitions.get(effectId)?.settings ?? []) {
      const value = stored?.[setting.key];
      values[setting.key] =
        typeof value === 'number' && Number.isFinite(value)
          ? Math.min(setting.max, Math.max(setting.min, value))
          : setting.default;
    }
    return values;
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
      settings?: Record<string, Record<string, number>>;
    } = {},
  ): void {
    let room: EffectRoom | undefined;
    for (const effect of this.active(page, options.allows)) {
      if (!effect.volume) continue;
      room ??= pageRoom(page, root);
      const object = effect.volume(page, room, this.values(effect.id, options.settings?.[effect.id]));
      if (!object) continue;
      object.name = `effect:${effect.id}`;
      object.userData.effectId = effect.id;
      root.add(object);
    }
  }

  /** Effets inconnus (écrits par une version plus récente), pour le panneau Diagnostics. */
  warnings(document: DocumentModel): ParseWarning[] {
    return document.pages.flatMap((page) =>
      pageEffectIds(page)
        .filter((id) => !this.definitions.has(id))
        .map((id) => ({ pageId: page.id, message: `Effet de page inconnu : ${id}` })),
    );
  }
}
