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
  /** Type écrit par l'export JSON du mur (sujet 518) et préfixe des ids qu'il donne aux post-it (`E1`, `C2`…). */
  exported: { type: string; prefix: string };
}

export type StickyKey = 'event' | 'command' | 'constraint' | 'system' | 'policy' | 'query' | 'actor' | 'hotspot';

type StickyFields = Omit<StickyType, 'key' | 'kind'>;

const sticky = (key: StickyKey, fields: StickyFields): StickyType => ({ key, kind: `eventstorming-${key}`, ...fields });

export const EVENT = sticky('event', {
  label: 'Domain Event',
  fill: '#ffb74d',
  keywords: ['événement'],
  examples: ['Commande passée', 'Paiement effectué'],
  exported: { type: 'event', prefix: 'E' },
});
export const COMMAND = sticky('command', {
  label: 'Command',
  fill: '#64b5f6',
  keywords: ['commande', 'action'],
  examples: ['Passer commande', 'Payer'],
  exported: { type: 'command', prefix: 'C' },
});
export const CONSTRAINT = sticky('constraint', {
  label: 'Constraint',
  fill: '#cfd8dc',
  keywords: ['contrainte', 'règle', 'invariant'],
  examples: ['Pas plus que le stock disponible'],
  exported: { type: 'constraint', prefix: 'K' },
});
export const SYSTEM = sticky('system', {
  label: 'System',
  fill: '#f48fb1',
  keywords: ['système', 'externe'],
  examples: ['Prestataire de paiement', 'ERP'],
  exported: { type: 'system', prefix: 'S' },
});
export const POLICY = sticky('policy', {
  label: 'Policy',
  fill: '#ce93d8',
  keywords: ['politique', 'réaction'],
  examples: ['Quand le paiement échoue, prévenir'],
  exported: { type: 'policy', prefix: 'P' },
});
export const QUERY = sticky('query', {
  label: 'Query Model',
  fill: '#a5d6a7',
  keywords: ['lecture', 'vue', 'read model'],
  examples: ['Historique des commandes', 'Stock'],
  exported: { type: 'read_model', prefix: 'R' },
});
export const ACTOR = sticky('actor', {
  label: 'Actor',
  fill: '#fff59d',
  keywords: ['acteur', 'utilisateur', 'rôle'],
  examples: ['Client', 'Administrateur'],
  exported: { type: 'actor', prefix: 'A' },
});
export const HOTSPOT = sticky('hotspot', {
  label: 'Hotspot',
  fill: '#e57373',
  keywords: ['point chaud', 'question', 'problème'],
  examples: ['Règle floue', 'Goulot'],
  exported: { type: 'hotspot', prefix: 'H' },
});

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
