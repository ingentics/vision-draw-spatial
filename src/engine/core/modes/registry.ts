import type { PageModePalette } from '../edit/palette';
import type { PageEffectDefinition } from '../effects/types';
import type { ViewMode } from '../interaction/cameraState';
import type { DocumentModel, PageModel, ParseWarning } from '../model/types';
import { pluginValues } from '../settings/pluginSettings';
import type { SelectionStyle } from '../settings/types';
import type { PluginSettings, PluginValues } from '../settings/pluginSettings';
import type { PaletteCategory, ShapeDefinition, ShapeTemplate } from '../shapes/types';
import { PLUGIN_ID_PATTERN, SPATIAL } from '../spatial';
import { modeKey, NAMESPACE_PATTERN } from './modeKeys';
import type { ModeProperty } from './modeProperty';
import type { PageModeDefinition } from './types';
import { freezePlain } from '../model/freeze';

/** Modes d'affichage, dans l'ordre des boutons. */
const VIEW_MODES: ViewMode[] = ['top', 'iso', '3d'];

/** Portée d'un réglage déclaré : la page, une flèche, une forme. */
export type ModeScope = 'page' | 'edge' | 'shape';

/** Ce que l'appli voit d'un mode (sujet 304) : sa déclaration, sans ses points d'entrée. */
export type ModeInfo = Readonly<
  Pick<PageModeDefinition, 'id' | 'name' | 'shortName' | 'description' | 'icon' | 'settings'> & {
    /** Mise en valeur de la sélection imposée sur une page du mode (`page.selectionStyle`). */
    selectionStyle?: Exclude<SelectionStyle, 'none'>;
  }
>;

/** Ce que l'appli voit du registre des modes (sujet 304). */
export interface ModeRegistryView {
  list(): ModeInfo[];
  get(id: string): ModeInfo | undefined;
  modeId(page: PageModel): string | undefined;
  modeOf(page: PageModel): ModeInfo | undefined;
  allowsViewMode(page: PageModel, mode: ViewMode): boolean;
  values(modeId: string, stored: Record<string, unknown> | undefined): PluginValues;
}

/**
 * Registre des modes de page (sujet 69) : ajouter un mode = déposer son dossier `plugins/modes/<id>/` ; la racine de
 * composition (`plugins/index.ts`) l'enregistre.
 * Le moteur ne pose ses questions qu'à lui : mode d'une page, réglages, palette ; l'appli n'en voit qu'une vue en
 * lecture seule (`view`). Les points d'entrée des modes ne sont appelés que par leur hôte (`core/domains/modes/`).
 */
export class PageModeRegistry {
  private readonly definitions = new Map<string, PageModeDefinition>();
  /** Ids des formes propres à chaque mode (`plugins/modes/<id>/shapes/`), réservées à la palette de ses pages. */
  private readonly shapeIds = new Map<string, string[]>();

  /**
   * `shapes` : ses formes propres (enregistrées à part dans le registre des formes, qui les dessine sur toute page).
   * Lèvent une exception : un id déjà pris (sujet 304) ou hors de `PLUGIN_ID_PATTERN` (sujet 378), un espace de noms
   * invalide ou déjà pris (sujet 301), une forme du mode dont l'id n'est pas préfixé par celui du mode, ou qui déclare
   * `kinds` ou `matches` : elle ne capte pas les noms draw.io des autres formes (sujet 304).
   */
  register(definition: PageModeDefinition, shapes: ShapeDefinition[] = []): this {
    if (typeof definition.id !== 'string' || !PLUGIN_ID_PATTERN.test(definition.id))
      throw new Error(`Mode ${definition.id} : id invalide (minuscules, chiffres et tirets)`);
    if (this.definitions.has(definition.id)) throw new Error(`Mode ${definition.id} : id déjà pris`);
    for (const shape of shapes) {
      if (!shape.id.startsWith(`${definition.id}-`))
        throw new Error(`Mode ${definition.id} : forme ${shape.id} non préfixée par « ${definition.id}- »`);
      if (shape.kinds || shape.matches)
        throw new Error(`Mode ${definition.id} : forme ${shape.id} avec kinds ou matches`);
    }
    // `typeof` d'abord : `test(undefined)` lit la chaîne « undefined », qui passerait.
    if (typeof definition.namespace !== 'string' || !NAMESPACE_PATTERN.test(definition.namespace))
      throw new Error(`Mode ${definition.id} : espace de noms invalide « ${definition.namespace} »`);
    const owner = [...this.definitions.values()].find((mode) => mode.namespace === definition.namespace);
    if (owner)
      throw new Error(`Mode ${definition.id} : espace de noms « ${definition.namespace} » déjà pris par ${owner.id}`);
    // Gelée (sujet 303) : un plugin ne modifie pas la définition d'un autre.
    this.definitions.set(definition.id, freezePlain(definition));
    this.shapeIds.set(
      definition.id,
      shapes.map((shape) => shape.id),
    );
    return this;
  }

  /**
   * Vue en lecture seule pour l'appli (sujet 304) : déclaration des modes, mode d'une page, modes d'affichage permis,
   * valeurs des réglages ; jamais les points d'entrée des modes, appelés par le moteur seul.
   */
  view(): ModeRegistryView {
    const info = (mode: PageModeDefinition): ModeInfo =>
      Object.freeze({
        id: mode.id,
        name: mode.name,
        shortName: mode.shortName,
        description: mode.description,
        icon: mode.icon,
        settings: mode.settings,
        selectionStyle: mode.page?.selectionStyle,
      });
    return {
      list: () => this.list().map(info),
      get: (id) => {
        const mode = this.get(id);
        return mode && info(mode);
      },
      modeId: (page) => this.modeId(page),
      modeOf: (page) => {
        const mode = this.modeOf(page);
        return mode && info(mode);
      },
      allowsViewMode: (page, mode) => this.allowsViewMode(page, mode),
      values: (modeId, stored) => this.values(modeId, stored),
    };
  }

  /** Modes enregistrés, par nom. */
  list(): PageModeDefinition[] {
    return [...this.definitions.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: string): PageModeDefinition | undefined {
    return this.definitions.get(id);
  }

  /** Identifiant du mode écrit sur la page (`spatial.mode`), connu ou non ; undefined = page normale. */
  modeId(page: PageModel): string | undefined {
    return page.attributes[SPATIAL.mode]?.trim() || undefined;
  }

  /** Mode de la page ; undefined pour une page normale ou un mode inconnu. */
  modeOf(page: PageModel): PageModeDefinition | undefined {
    const id = this.modeId(page);
    return id === undefined ? undefined : this.definitions.get(id);
  }

  /** Modes inconnus (écrits par une version plus récente), pour le panneau Diagnostics. */
  warnings(document: Pick<DocumentModel, 'pages'>): ParseWarning[] {
    return document.pages.flatMap((page) => {
      const id = this.modeId(page);
      return id === undefined || this.definitions.has(id)
        ? []
        : [{ pageId: page.id, message: `Mode de page inconnu : ${id}` }];
    });
  }

  /**
   * Valeurs des réglages d'un mode (ticket 283) : celles des paramètres (`settings.modes[id]`) bornées, le défaut pour
   * les autres ; les clés inconnues et les valeurs du mauvais type sont ignorées.
   */
  values(modeId: string, stored: Record<string, unknown> | undefined): PluginValues {
    return pluginValues(this.definitions.get(modeId)?.settings, stored);
  }

  /** Valeurs des réglages du mode de la page ; vide pour une page normale. */
  valuesOf(page: PageModel, settings: PluginSettings | undefined): PluginValues {
    const mode = this.modeOf(page);
    return mode ? this.values(mode.id, settings?.[mode.id]) : {};
  }

  /** L'effet existe-t-il dans l'un des modes d'affichage permis sur la page (sujet 196) ? */
  effectViewable(page: PageModel, effect: Pick<PageEffectDefinition, 'viewModes'>): boolean {
    return !effect.viewModes || effect.viewModes.some((mode) => this.allowsViewMode(page, mode));
  }

  /** Le mode de la page permet-il ce mode d'affichage (sujet 178) ? Oui pour une page normale ou sans `page.viewModes`. */
  allowsViewMode(page: PageModel, mode: ViewMode): boolean {
    const allowed = this.modeOf(page)?.page?.viewModes;
    return !allowed || allowed.length === 0 || allowed.includes(mode);
  }

  /** Mode d'affichage de la page pour celui demandé : lui s'il est permis, sinon le premier permis par le mode. */
  viewModeFor(page: PageModel, mode: ViewMode): ViewMode {
    if (this.allowsViewMode(page, mode)) return mode;
    return VIEW_MODES.find((m) => this.modeOf(page)!.page!.viewModes!.includes(m))!;
  }

  /**
   * Palette d'une page (sujet 178) : sur une page normale, les formes générales ; sur une page d'un mode, sa liste
   * blanche (`page.palette.shapes`) ou, à défaut, les formes générales et celles du mode. Les formes d'un autre mode n'y sont
   * jamais. Catégories : celles des formes (`categories`, du registre des formes) et du mode, par rang, sans les vides.
   */
  paletteFor(
    page: PageModel | undefined,
    templates: ShapeTemplate[],
    categories: readonly PaletteCategory[],
  ): PageModePalette {
    const mode = page && this.modeOf(page);
    const own = new Set(mode ? this.shapeIds.get(mode.id) : []);
    const others = new Set([...this.shapeIds.values()].flat().filter((id) => !own.has(id)));
    const whitelist = mode?.page?.palette?.shapes;
    const offered = whitelist ? new Set(whitelist) : undefined;
    const shown = templates.filter((template) => (offered ? offered.has(template.id) : !others.has(template.id)));
    const used = new Set(shown.map((template) => template.category));
    return {
      categories: [...categories, ...(mode?.page?.palette?.categories ?? [])]
        .filter((category) => used.has(category.id))
        .sort((a, b) => a.order - b.order),
      templates: shown,
    };
  }

  /** Réglages déclarés par le mode de la page pour une portée. */
  properties(page: PageModel, scope: ModeScope, part?: string): ModeProperty[] {
    const mode = this.modeOf(page);
    if (!mode) return [];
    const all = (scope === 'page' ? mode.page : scope === 'edge' ? mode.edges : mode.gestures)?.properties ?? [];
    // Partie sélectionnée (sujet 249) : ses réglages seulement ; sinon, ceux de la forme.
    return scope === 'shape'
      ? all.filter((property) => property.anyPart || (property.part === true) === (part !== undefined))
      : all;
  }

  /**
   * Attributs à retirer des éléments collés : ceux de tous les modes (ils dorment sur une page d'un autre mode), clés
   * complètes.
   */
  pasteKeys(): string[] {
    return [...this.definitions.values()].flatMap((mode) =>
      (mode.pasteKeys ?? []).map((name) => modeKey(mode.namespace, name)),
    );
  }
}
