import type { PageModel, ShapeModel } from '../../../core/plugins';

/**
 * Les 8 post-it typés du mode Event storming (sujet 475). Leurs ids sont préfixés par celui du mode
 * (`eventstorming-`), comme le registre l'exige de toute forme de mode. Le label est le nom du type en anglais
 * (vocabulaire universel de l'event storming) ; les exemples sont montrés dans l'infobulle de la palette
 * (et cherchés).
 */
export interface StickyType {
  /** Le kind sans le préfixe du mode : clé du type dans les règles (`stickyRules.ts`). */
  key: StickyKey;
  kind: string;
  label: string;
  fill: string;
  examples: readonly string[];
  /** Mots-clés français de la recherche. */
  keywords: readonly string[];
}

export type StickyKey = 'event' | 'command' | 'constraint' | 'system' | 'policy' | 'query' | 'actor' | 'hotspot';

const sticky = (type: StickyKey, label: string, fill: string, keywords: string[], examples: string[]): StickyType => ({
  key: type,
  kind: `eventstorming-${type}`,
  label,
  fill,
  examples,
  keywords,
});

export const EVENT = sticky(
  'event',
  'Domain Event',
  '#ffb74d',
  ['événement'],
  ['Commande passée', 'Paiement effectué'],
);
export const COMMAND = sticky('command', 'Command', '#64b5f6', ['commande', 'action'], ['Passer commande', 'Payer']);
export const CONSTRAINT = sticky(
  'constraint',
  'Constraint',
  '#cfd8dc',
  ['contrainte', 'règle', 'invariant'],
  ['Pas plus que le stock disponible'],
);
export const SYSTEM = sticky('system', 'System', '#f48fb1', ['système', 'externe'], ['Prestataire de paiement', 'ERP']);
export const POLICY = sticky(
  'policy',
  'Policy',
  '#ce93d8',
  ['politique', 'réaction'],
  ['Quand le paiement échoue, prévenir'],
);
export const QUERY = sticky(
  'query',
  'Query Model',
  '#a5d6a7',
  ['lecture', 'vue', 'read model'],
  ['Historique des commandes', 'Stock'],
);
export const ACTOR = sticky(
  'actor',
  'Actor',
  '#fff59d',
  ['acteur', 'utilisateur', 'rôle'],
  ['Client', 'Administrateur'],
);
export const HOTSPOT = sticky(
  'hotspot',
  'Hotspot',
  '#e57373',
  ['point chaud', 'question', 'problème'],
  ['Règle floue', 'Goulot'],
);

/** Dans l'ordre de la palette. */
export const STICKY_TYPES: readonly StickyType[] = [EVENT, COMMAND, CONSTRAINT, SYSTEM, POLICY, QUERY, ACTOR, HOTSPOT];

const BY_KIND = new Map(STICKY_TYPES.map((type) => [type.kind, type]));
const BY_KEY = new Map(STICKY_TYPES.map((type) => [type.key, type]));

/** Type de clé `key` (`event`, `command`…). */
export const stickyOfKey = (key: StickyKey): StickyType => BY_KEY.get(key)!;

/** Type du post-it, reconnu par son `spatial.kind` ; undefined pour une autre forme. */
export const stickyType = (shape: ShapeModel): StickyType | undefined => BY_KIND.get(shape.kind);

export const isSticky = (shape: ShapeModel): boolean => BY_KIND.has(shape.kind);

/** Les autres post-it de la page que `shape` (aimantation, cases au glisser). */
export const otherStickies = (page: PageModel, shape: ShapeModel): ShapeModel[] =>
  page.shapes.filter((other) => other.id !== shape.id && isSticky(other));
