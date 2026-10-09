import { describe, expect, it } from 'vitest';
import { backticked, readRepo } from '../../../docHelpers';

/**
 * Symboles des guides des plugins (sujet 390) : un type (`ShapeModel`), une constante (`PART_ORDER`) ou une fonction
 * appelée (`flatBox(outline)`) cités entre backticks sont exportés par l'API des plugins (`core/plugins/index.ts`), le
 * seul fichier du tronc qu'un plugin importe. Font exception les membres des contrats (`outline(shape, ctx)`) et la
 * liste blanche : des noms du tronc ou de l'appli cités pour situer, qu'un plugin n'importe pas.
 */
const GUIDES = [
  'docs/AJOUTER_UN_PLUGIN.md',
  'docs/AJOUTER_UNE_FORME.md',
  'docs/AJOUTER_UN_MODE.md',
  'docs/AJOUTER_UN_EFFET.md',
];

/** Fichiers des contrats : leurs membres (`  nom?:`, `  nom(`) se citent sans être des exports. */
const CONTRACTS = [
  'src/engine/core/shapes/types.ts',
  'src/engine/core/modes/types.ts',
  'src/engine/core/modes/modeEdit.ts',
  'src/engine/core/modes/modeProperty.ts',
  'src/engine/core/effects/types.ts',
  'src/engine/core/fields/fieldSchema.ts',
  'src/engine/core/settings/pluginSettings.ts',
  'src/engine/core/render/types.ts',
];

/** Noms cités par les guides hors de l'API des plugins, et pourquoi. */
const NOT_API: Record<string, string> = {
  // JavaScript et Three.js.
  Object3D: 'Three.js, importé de three',
  WeakMap: 'JavaScript',
  // Membres et types de contrat reçus par inférence.
  options: 'membre `choice` du schéma des champs (une ligne, hors de la lecture des membres)',
  Field: 'schéma commun, que les champs des plugins étendent (`ShapeProperty`, `ModeProperty`, `PluginSetting`)',
  // Tronc, cité pour situer ce qui héberge les plugins.
  PLUGIN_ID_PATTERN: 'vérification de l’id à l’enregistrement',
  SHAPE_ALIASES: 'synonymes des noms draw.io, dans le tronc (ce qui touche encore le tronc)',
  PARTS_PER_ELEMENT: 'ordre de dessin, géré par le moteur',
  ShapeRegistry: 'registre des formes, hors de l’API publique',
  ModeEditWriter: 'écritures d’un mode, côté moteur',
  DEFAULT_EDGE_BADGE: 'défaut de l’habillage, côté moteur',
  Settings: 'paramètres du tronc',
  sceneRenderer: 'repli des niveaux de rendu, cité par les tests',
  buildPageScene: 'scène d’une page, cité par les tests',
  decorate: 'pose des décors par le registre des effets, cité par les tests',
  paletteFor: 'question au registre des modes',
  allowsViewMode: 'question au registre des modes',
  // Racine de composition et plugins.
  SHAPE_DEFINITIONS: 'collecte des formes (racine de composition)',
  createDefaultRegistry: 'registre par défaut (racine de composition)',
  createDefaultEffectRegistry: 'registre par défaut (racine de composition)',
  PALETTE_CATEGORIES: 'catégories de la palette, `plugins/shapes/categories.ts`',
  FACADE_TAGS_SETTING: 'réglage déclaré par une base de formes (`shapes/generic/building/`)',
  stencilOutline: 'brique de la base `shapes/generic/stencil/`',
  stencilPathXml: 'brique de la base `shapes/generic/stencil/`',
  // Appli.
  ShapeTemplate: 'modèle de palette vu par l’appli',
  onEdit: 'prop des sections React d’un mode',
  getModeRegistry: 'façade du moteur, pour l’appli',
  getEffectRegistry: 'façade du moteur, pour l’appli',
};

/** Noms exportés par l'API des plugins (alias compris : `ReadonlyPageModel as PageModel` → `PageModel`). */
function apiExports(): Set<string> {
  const api = readRepo('src/engine/core/plugins/index.ts');
  const names = [...api.matchAll(/export (?:type )?\{([^}]*)\}/g)].flatMap((match) =>
    match[1]!
      .split(',')
      .map((name) =>
        name
          .trim()
          .split(/\s+as\s+/)
          .at(-1)!,
      )
      .filter((name) => name !== ''),
  );
  return new Set(names);
}

/** Membres des contrats, à toute profondeur. */
function contractMembers(): Set<string> {
  return new Set(CONTRACTS.flatMap((path) => [...readRepo(path).matchAll(/^\s+(\w+)\??[(:]/gm)].map((m) => m[1]!)));
}

/** Symboles cités : type ou constante (majuscule en tête), ou fonction appelée (`nom(…)`). */
function citedSymbols(guide: string): string[] {
  return backticked(guide).flatMap((text) => {
    const match = /^([A-Za-z_]\w*)(\(.*\))?$/.exec(text);
    if (!match) return [];
    const [, name, call] = match as unknown as [string, string, string | undefined];
    const type = /^[A-Z]/.test(name) && /[a-z]/.test(name);
    const constant = /^[A-Z][A-Z0-9_]+$/.test(name);
    return type || constant || call ? [name] : [];
  });
}

describe('symboles des guides des plugins (sujet 390)', () => {
  const exported = apiExports();
  const members = contractMembers();
  const cited = new Map(GUIDES.map((path) => [path, citedSymbols(readRepo(path))]));

  it('chaque symbole cité est exporté par l’API des plugins, membre d’un contrat ou dans la liste blanche', () => {
    expect(exported.size).toBeGreaterThan(100);
    const missing = [...cited].flatMap(([path, names]) =>
      names
        .filter((name) => !exported.has(name) && !members.has(name) && !(name in NOT_API))
        .map((name) => `${path} : ${name}`),
    );
    expect([...new Set(missing)]).toEqual([]);
  });

  it('la liste blanche ne contient que des noms cités, absents de l’API', () => {
    const all = new Set([...cited.values()].flat());
    for (const name of Object.keys(NOT_API)) {
      expect(all.has(name), name).toBe(true);
      expect(exported.has(name), name).toBe(false);
    }
  });
});
