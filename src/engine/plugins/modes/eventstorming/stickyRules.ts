import { stickyOfKey } from './kinds';
import type { StickyKey } from './kinds';

/**
 * Règles du mode Event storming, par type de post-it (sujet 520) : fichier de configuration. Une seule grammaire
 * sert aux cases proposées au glisser (`places/placesAround.ts`) et à la lecture du mur (`export/wallRules.ts` :
 * liens et avertissements) ; une case proposée est donc toujours un contact qui se lit. Les textes des avertissements
 * (pastilles, export JSON) sont aussi ici ; leurs conditions de déclenchement restent dans `wallRules.ts`.
 */

/**
 * Liens déduits des contacts. Les avertissements et les règles R3 / R5 de `wallRules.ts` en reconnaissent certains
 * (`produces`, `triggers`, `issues`, `causes`, `performs`) : les renommer demande d'y toucher.
 */
export type LinkType =
  | 'performs'
  | 'produces'
  | 'triggers'
  | 'issues'
  | 'causes'
  | 'feeds'
  | 'calls'
  | 'involves'
  | 'informs'
  | 'constrains'
  | 'checks';

export interface StickyRules {
  /**
   * R1, séquence lue de gauche à droite : post-it collés **à sa droite** → lien de lui vers eux. Case au glisser à sa
   * droite (et, pour lui, à leur gauche).
   */
  right?: Partial<Record<StickyKey, LinkType>>;
  /** R2, attache : post-it collés contre lui, **de n'importe quel côté** → lien de lui vers eux. Cases sur 4 côtés. */
  glued?: Partial<Record<StickyKey, LinkType>>;
  /**
   * Post-it qui peuvent s'intercaler à sa droite, en pile : ses liens `right` traversent la pile vers les post-it
   * collés à droite de celle-ci (Command | Policies | Domain Events : la Command produit les Events). Le contact avec
   * le post-it intercalé ne crée pas de lien. Cases à sa droite (et, pour lui, à leur gauche).
   */
  through?: readonly StickyKey[];
  /**
   * Deux post-it de ce type collés l'un sous l'autre s'empilent, sans lien ni W1 entre eux. Un lien `right` vers l'un
   * d'eux vaut pour toute la pile (R5 : Domain Events produits par une même Command, empilés à sa droite). Cases
   * au-dessus et au-dessous.
   */
  stacks?: boolean;
  /** Se colle à n'importe quel côté de n'importe quel post-it, et inversement ; vise un seul voisin (R4, Hotspot). */
  anywhere?: boolean;
  /** Case aussi à cheval au-dessus d'une Command et du post-it collé à sa droite, centrée sur leur jointure (486). */
  astride?: boolean;
  /** Où il se colle, en une phrase : message des avertissements qui touchent tous les types (W1, W7, W8). */
  place: string;
  /** Mur d'exemple où il figure, avec le message. */
  example: string;
}

/** Post-it nommé : type et texte entre guillemets (espaces insécables : ils ne vont pas seuls à la ligne). */
export const named = (key: StickyKey, text: string) => `${stickyOfKey(key).label} «\u00a0${text}\u00a0»`;

/** Exemple : post-it typés lus de gauche à droite. */
const sequence = (...stickies: [StickyKey, string][]) => stickies.map(([key, text]) => named(key, text)).join(' → ');

export const STICKY_RULES: Record<StickyKey, StickyRules> = {
  actor: {
    right: { command: 'performs' },
    glued: { command: 'performs' },
    place: 'Un Actor se colle à gauche de la Command qu’il lance ; un Query Model peut l’informer, collé contre lui.',
    example: sequence(['actor', 'Client'], ['command', 'Passer commande']),
  },
  command: {
    right: { event: 'produces' },
    through: ['policy'],
    glued: { system: 'calls' },
    place:
      'Une Command se colle à droite de ce qui la lance (Actor, Policy ou Domain Event) et à gauche des Domain Events ' +
      'qu’elle produit, empilés (des Policies peuvent s’intercaler entre elle et eux) ; System, Query Model et ' +
      'Constraint se collent contre elle.',
    example: sequence(['actor', 'Client'], ['command', 'Payer'], ['event', 'Paiement effectué']),
  },
  event: {
    right: { policy: 'triggers', command: 'causes', query: 'feeds' },
    glued: { system: 'involves', policy: 'triggers' },
    stacks: true,
    place:
      'Un Domain Event se colle à droite de la Command qui le produit ; à sa droite, la Policy, la Command ou le ' +
      'Query Model qui en découlent. Les issues d’une même Command s’empilent à sa droite.',
    example: sequence(
      ['command', 'Payer'],
      ['event', 'Paiement effectué'],
      ['policy', 'Quand le paiement est effectué, préparer le colis'],
    ),
  },
  policy: {
    right: { command: 'issues' },
    stacks: true,
    place:
      'Une Policy se colle à droite ou sous le Domain Event qui la déclenche, et à gauche de la Command qu’elle émet ; ' +
      'elle peut aussi s’intercaler entre une Command et le Domain Event qu’elle produit. Plusieurs Policies ' +
      's’empilent.',
    example: sequence(
      ['event', 'Paiement refusé'],
      ['policy', 'Quand le paiement échoue, prévenir'],
      ['command', 'Prévenir le client'],
    ),
  },
  system: {
    place:
      'Un System se colle, de n’importe quel côté, contre la Command qui l’appelle ou le Domain Event qui l’implique.',
    example: `${named('system', 'Prestataire de paiement')} collé sous la ${named('command', 'Payer')}`,
  },
  query: {
    glued: { actor: 'informs', command: 'informs' },
    place:
      'Un Query Model se colle à droite du Domain Event qui l’alimente, ou contre l’Actor ou la Command qu’il informe.',
    example: sequence(['event', 'Commande expédiée'], ['query', 'Suivi de commande']),
  },
  constraint: {
    glued: { command: 'constrains', query: 'checks' },
    stacks: true,
    astride: true,
    place:
      'Une Constraint se colle contre la Command qu’elle limite, ou contre le Query Model qu’elle vérifie ; ' +
      'plusieurs Constraints s’empilent.',
    example: `${named('constraint', 'Pas plus que le stock disponible')} collée au-dessus de la ${named('command', 'Passer commande')}`,
  },
  hotspot: {
    anywhere: true,
    place: 'Un Hotspot se colle contre le post-it qu’il questionne : au-dessus, en dessous ou à côté.',
    example: `${named('hotspot', 'Règle floue')} collé sous la ${named('command', 'Payer')}`,
  },
};

export type WarningCode = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7' | 'W8';

export interface WarningText {
  level: 'info' | 'attention';
  /** Message court : export JSON, et titre de la pastille. */
  message: string;
  /** Ce qui est attendu, dans le message de la pastille. */
  hint: string;
  /** Exemple ; absent, la place du type du post-it suit `hint`, avec son exemple (W1, W7, W8). */
  example?: string;
}

export const WARNINGS: Record<WarningCode, WarningText> = {
  W1: { level: 'info', message: 'Contact sans règle', hint: '' },
  W2: {
    level: 'attention',
    message: 'Policy sans commande émise',
    hint:
      'Une Policy réagit en émettant une commande : colle à sa droite la Command qu’elle émet. Si la suite reste ' +
      'à trancher, colle-lui un Hotspot qui pose la question.',
    example: sequence(['policy', 'Quand le paiement échoue, prévenir'], ['command', 'Prévenir le client']),
  },
  W3: {
    level: 'attention',
    message: 'Policy sans événement déclencheur',
    hint: 'Une Policy est déclenchée par un événement : colle à sa gauche le Domain Event qui la déclenche.',
    example: sequence(['event', 'Paiement refusé'], ['policy', 'Quand le paiement échoue, prévenir']),
  },
  W4: {
    level: 'attention',
    message: 'Hotspot isolé',
    hint: 'Un Hotspot questionne un post-it : colle-le contre celui qu’il concerne (au-dessus, en dessous ou à côté).',
    example: STICKY_RULES.hotspot.example,
  },
  W5: {
    level: 'attention',
    message: 'Événement sans commande qui le produit',
    hint: 'Un événement est le résultat d’une commande : colle à sa gauche la Command qui le produit.',
    example: sequence(['command', 'Payer'], ['event', 'Paiement effectué']),
  },
  W6: {
    level: 'attention',
    message: 'Commande sans déclencheur',
    hint: 'Une commande est lancée par quelqu’un ou quelque chose : colle à sa gauche un Actor, une Policy ou un Domain Event.',
    example: sequence(['actor', 'Client'], ['command', 'Passer commande']),
  },
  W7: {
    level: 'info',
    message: 'Post-it isolé',
    hint: 'Ce post-it ne touche aucun autre : il n’entre dans aucun lien.',
  },
  W8: {
    level: 'info',
    message: 'Post-it qui se chevauchent',
    hint: 'Deux post-it posés l’un sur l’autre se cachent et ne se lisent pas : décale-les bord à bord.',
  },
};
