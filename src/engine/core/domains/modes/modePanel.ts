import { modeKeys } from '../../modes/modeKeys';
import { callMode } from '../../modes/modeCalls';
import type { ModeScope } from '../../modes/registry';
import type { ModeTarget } from '../../modes/types';
import type { PageModel } from '../../model/types';
import type { ModePropertyView } from '../types';
import type { EngineCore } from '../EngineCore';

/**
 * Panneau d'une page de mode (sujets 249, 271, 294), sorti de `PageModes` (sujet 379) : réglages déclarés évalués et
 * écrits, touches du mode sur l'élément sélectionné. Appels au mode par l'hôte (`PageModes.call`), opérations par
 * `PageModes.editPageMode`.
 */
export class ModePanel {
  constructor(private readonly core: EngineCore) {}

  /**
   * Réglages déclarés par le mode de `page` pour une cible et une portée, évalués pour le panneau (sujet 294) : ceux
   * qui ne sont pas masqués, avec leur valeur, leur lecture seule et leurs choix. Chaque appel au mode est protégé ; un
   * point d'entrée en panne est traité comme absent (réglage montré, valeur de l'attribut, modifiable, sans choix).
   * `part` : partie de la forme sélectionnée ; `palette` : couleurs proposées aux choix.
   */
  propertyViews(
    page: PageModel,
    scope: ModeScope,
    target: ModeTarget,
    part?: string,
    palette: readonly string[] = [],
  ): ModePropertyView[] {
    const mode = this.core.modes.modeOf(page);
    if (!mode) return [];
    const keys = modeKeys(mode);
    const host = this.core.pageModes;
    return this.core.modes.properties(page, scope, part).flatMap((property) => {
      const hook = (name: string) => `réglage « ${property.key} » : ${name}`;
      if (host.call(mode, hook('hidden'), false, property.hidden, page, target, part)) return [];
      // Attribut du mode au nom court du réglage ; un nom invalide est traité comme un attribut absent.
      const raw = host.guard(mode, hook('clé'), undefined, () =>
        'style' in target ? keys.value(target, property.key) : keys.pageValue(target, property.key),
      );
      const { readOnly } = property;
      return [
        {
          property,
          value: host.call(mode, hook('value'), raw, property.value, page, target, part),
          readOnly:
            typeof readOnly === 'function'
              ? host.call(mode, hook('readOnly'), false, readOnly, page, target, part)
              : !!readOnly,
          options:
            property.type === 'select' ? host.call(mode, hook('options'), [], property.options, page, palette) : [],
        },
      ];
    });
  }

  /**
   * `part` : partie de la forme sélectionnée, pour un réglage de partie (sujet 249) ; `merge` : réglage en direct
   * (`ModeProperty.live`, sujet 271).
   */
  setModeProperty(
    scope: ModeScope,
    targetId: string | undefined,
    key: string,
    value: string | undefined,
    part?: string,
    merge?: string,
  ): void {
    const page = this.core.targets.editablePage()?.page;
    const property = page && this.core.modes.properties(page, scope, part).find((p) => p.key === key);
    const target: ModeTarget | undefined =
      scope === 'page'
        ? page
        : scope === 'edge'
          ? page?.edges.find((e) => e.id === targetId)
          : page?.shapes.find((s) => s.id === targetId);
    if (!property || !target) return;
    let next: string | void = undefined;
    this.core.pageModes.editPageMode(
      property.label,
      (edit) => {
        if (property.write) next = callMode(property.write, edit, target, value, part);
        else if (scope === 'page') edit.setPageAttribute(key, value);
        else edit.setElementAttribute(target.id, key, value);
      },
      merge,
    );
    if (scope === 'shape') this.core.pageModes.selectPart(target.id, next);
  }

  modeKey(key: string): boolean {
    const editable = this.core.targets.editablePage();
    const selection = this.core.selection.current;
    if (!editable || selection?.pageId !== editable.page.id || selection.items.length !== 1) return false;
    const mode = this.core.modes.modeOf(editable.page);
    const action = mode?.keys?.[key];
    const id = selection.picked.element.id;
    const target = [...editable.page.edges, ...editable.page.shapes].find((element) => element.id === id);
    const part = selection.part;
    if (!mode || !action || !target) return false;
    if (!this.core.pageModes.call(mode, `touche « ${key} »`, false, action.applies, editable.page, target, part))
      return false;
    const current = this.core.modeCurrents.getModeCurrent(editable.page.id);
    let next: string | void = undefined;
    this.core.pageModes.editPageMode(action.label, (edit) => {
      next = callMode(action.run, edit, target, current, part);
    });
    this.core.pageModes.selectPart(id, next);
    return true;
  }
}
