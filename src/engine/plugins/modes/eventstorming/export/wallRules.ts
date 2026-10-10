import type { PageModel, ShapeModel } from '../../../../core/plugins';
import { contacts } from '../contacts/contacts';
import type { Contact } from '../contacts/contacts';
import { ACTOR, COMMAND, CONSTRAINT, EVENT, HOTSPOT, POLICY, QUERY, stickyType, SYSTEM } from '../kinds';
import type { StickyType } from '../kinds';

/**
 * Règles de lecture du mur (sujet 518) : liens déduits des contacts entre post-it (R1 à R5) et avertissements
 * (W1 à W8), sans flèche dessinée. Une position qu'aucune règle n'explique donne un avertissement, jamais un lien ;
 * un contact sans règle entre deux post-it liés par ailleurs est ignoré (sujet 519).
 */

/** Part minimale du plus petit côté prise par un contact pour qu'il crée un lien (décalage d'une demi-hauteur permis). */
export const MIN_CONTACT_SHARE = 0.2;

export type WallRule = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

/** Lien entre deux post-it (ids des formes). */
export interface WallLink {
  from: string;
  to: string;
  type: string;
  rule: WallRule;
}

export type WarningCode = 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'W6' | 'W7' | 'W8';

export interface WallWarning {
  code: WarningCode;
  /** Ids des formes concernées. */
  shapeIds: string[];
}

export const WARNINGS: Record<WarningCode, { level: 'info' | 'attention'; message: string }> = {
  W1: { level: 'info', message: 'Contact sans règle' },
  W2: { level: 'attention', message: 'Policy sans commande émise' },
  W3: { level: 'attention', message: 'Policy sans événement déclencheur' },
  W4: { level: 'attention', message: 'Hotspot isolé' },
  W5: { level: 'attention', message: 'Événement sans commande qui le produit' },
  W6: { level: 'attention', message: 'Commande sans déclencheur' },
  W7: { level: 'info', message: 'Post-it isolé' },
  W8: { level: 'info', message: 'Post-it qui se chevauchent' },
};

/** R1 : B à droite de A. */
const SEQUENCE: ReadonlyArray<readonly [StickyType, StickyType, string]> = [
  [ACTOR, COMMAND, 'performs'],
  [COMMAND, EVENT, 'produces'],
  [EVENT, POLICY, 'triggers'],
  [POLICY, COMMAND, 'issues'],
  [EVENT, COMMAND, 'causes'],
  [EVENT, QUERY, 'feeds'],
];

/** R2 : post-it collés, de n'importe quel côté ; le lien va du premier au second. */
const ATTACHMENT: ReadonlyArray<readonly [StickyType, StickyType, string]> = [
  [ACTOR, COMMAND, 'performs'],
  [COMMAND, SYSTEM, 'calls'],
  [EVENT, SYSTEM, 'involves'],
  [EVENT, POLICY, 'triggers'],
  [QUERY, ACTOR, 'informs'],
  [QUERY, COMMAND, 'informs'],
  [CONSTRAINT, COMMAND, 'constrains'],
  [CONSTRAINT, QUERY, 'checks'],
];

/** Liens qui déclenchent une Command (W6). */
const COMMAND_TRIGGERS = new Set(['performs', 'issues', 'causes']);

/** Ordre de lecture : de haut en bas, puis de gauche à droite. */
export const byReading = (a: ShapeModel, b: ShapeModel) => a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x;

/** Un contact orienté : `first` à gauche de `second` (horizontal), ou au-dessus (vertical). */
interface Touch {
  first: ShapeModel;
  second: ShapeModel;
  horizontal: boolean;
  strong: boolean;
}

function touchOf(contact: Contact, shapes: Map<string, ShapeModel>): Touch {
  const a = shapes.get(contact.a.shapeId)!;
  const b = shapes.get(contact.b.shapeId)!;
  const side = contact.a.side;
  const aFirst = side === 'e' || side === 's';
  return {
    first: aFirst ? a : b,
    second: aFirst ? b : a,
    horizontal: side === 'e' || side === 'w',
    strong: Math.max(contact.a.share, contact.b.share) >= MIN_CONTACT_SHARE,
  };
}

/** Lien R1 puis R2 d'un contact (sans hotspot), ou undefined. */
function linkOf({ first, second, horizontal }: Touch): WallLink | undefined {
  const left = stickyType(first)!;
  const right = stickyType(second)!;
  if (horizontal) {
    const sequence = SEQUENCE.find(([a, b]) => a === left && b === right);
    if (sequence) return { from: first.id, to: second.id, type: sequence[2], rule: 'R1' };
  }
  for (const [a, b, type] of ATTACHMENT) {
    if (a === left && b === right) return { from: first.id, to: second.id, type, rule: 'R2' };
    if (a === right && b === left) return { from: second.id, to: first.id, type, rule: 'R2' };
  }
  return undefined;
}

/** Voisin visé par un hotspot (R4) : au-dessus, en dessous, à gauche, à droite ; le premier lu sur un même côté. */
function hotspotTarget(hotspot: ShapeModel, touches: Touch[]): ShapeModel | undefined {
  const around = touches.filter((touch) => touch.strong && (touch.first === hotspot || touch.second === hotspot));
  const on = (horizontal: boolean, hotspotFirst: boolean) =>
    around
      .filter((touch) => touch.horizontal === horizontal && (touch.first === hotspot) === hotspotFirst)
      .map((touch) => (hotspotFirst ? touch.second : touch.first))
      .sort(byReading)[0];
  return on(false, false) ?? on(false, true) ?? on(true, false) ?? on(true, true);
}

export interface WallReading {
  links: WallLink[];
  warnings: WallWarning[];
}

/** Liens et avertissements de la page, dans l'ordre de découverte (le format les range). */
export function readWall(page: PageModel): WallReading {
  const stickies = page.shapes.filter((shape) => stickyType(shape));
  const byId = new Map(stickies.map((shape) => [shape.id, shape]));
  const { contacts: found, overlaps } = contacts(page);
  const touches = found.map((contact) => touchOf(contact, byId));
  const typeOf = (shape: ShapeModel) => stickyType(shape)!;
  const links: WallLink[] = [];
  const warnings: WallWarning[] = [];
  /** Contacts sans règle (W1), gardés si l'un des deux post-it n'a aucun lien (sujet 519). */
  const unruled: [string, string][] = [];

  for (const touch of touches) {
    const { first, second } = touch;
    // Hotspot : seul son voisin visé compte (R4), ses autres contacts sont ignorés.
    if (typeOf(first) === HOTSPOT || typeOf(second) === HOTSPOT) continue;
    // R5 : deux Events empilés sont des issues alternatives, sans lien entre eux.
    if (!touch.horizontal && typeOf(first) === EVENT && typeOf(second) === EVENT) continue;
    const link = touch.strong ? linkOf(touch) : undefined;
    if (link) links.push(link);
    else unruled.push([first.id, second.id]);
  }

  // R5 : une Command qui produit plusieurs Events (empilés à sa droite) : le premier en R1, les suivants en R5.
  for (const command of stickies.filter((shape) => typeOf(shape) === COMMAND)) {
    const produced = links.filter((link) => link.from === command.id && link.type === 'produces' && link.rule === 'R1');
    produced
      .sort((a, b) => byReading(byId.get(a.to)!, byId.get(b.to)!))
      .slice(1)
      .forEach((link) => (link.rule = 'R5'));
  }

  // R3 : une Policy sans Command à sa droite émet celles à droite de l'Event qui la déclenche ; le `causes` direct
  // entre cet Event et ces Commands est retiré.
  const removed = new Set<WallLink>();
  for (const policy of stickies.filter((shape) => typeOf(shape) === POLICY)) {
    if (links.some((link) => link.from === policy.id && link.type === 'issues')) continue;
    const events = links.filter((link) => link.to === policy.id && link.type === 'triggers').map((link) => link.from);
    for (const event of events) {
      for (const causes of links.filter((link) => link.from === event && link.type === 'causes')) {
        links.push({ from: policy.id, to: causes.to, type: 'issues', rule: 'R3' });
      }
    }
  }
  for (const causes of links.filter((link) => link.type === 'causes')) {
    const through = links.some(
      (issues) =>
        issues.type === 'issues' &&
        issues.to === causes.to &&
        links.some(
          (triggers) => triggers.type === 'triggers' && triggers.from === causes.from && triggers.to === issues.from,
        ),
    );
    if (through) removed.add(causes);
  }

  // R4 : chaque hotspot vise un seul voisin.
  for (const hotspot of stickies.filter((shape) => typeOf(shape) === HOTSPOT)) {
    const target = hotspotTarget(hotspot, touches);
    if (target) links.push({ from: hotspot.id, to: target.id, type: 'concerns', rule: 'R4' });
    else warnings.push({ code: 'W4', shapeIds: [hotspot.id] });
  }

  const kept = links.filter(
    (link, index) =>
      !removed.has(link) &&
      links.findIndex((other) => other.from === link.from && other.to === link.to && other.type === link.type) ===
        index,
  );

  // W1 (sujet 519) : sur un mur dense, un post-it bien collé touche souvent aussi un voisin sans règle (System sous
  // sa Command, à côté d'une Policy) ; ce contact fortuit n'avertit que si l'un des deux n'a aucun lien.
  const linked = new Set(kept.flatMap((link) => [link.from, link.to]));
  for (const [a, b] of unruled) if (!linked.has(a) || !linked.has(b)) warnings.push({ code: 'W1', shapeIds: [a, b] });

  const has = (test: (link: WallLink) => boolean) => kept.some(test);
  for (const shape of stickies) {
    const type = typeOf(shape);
    const id = shape.id;
    if (type === POLICY) {
      // Visée par un Hotspot : sa suite est en suspens, la question est posée (sujet 519).
      const pending = has((link) => link.to === id && link.type === 'concerns');
      if (!pending && !has((link) => link.from === id && link.type === 'issues'))
        warnings.push({ code: 'W2', shapeIds: [id] });
      if (!has((link) => link.to === id && link.type === 'triggers')) warnings.push({ code: 'W3', shapeIds: [id] });
    }
    if (type === EVENT && !has((link) => link.to === id && link.type === 'produces'))
      warnings.push({ code: 'W5', shapeIds: [id] });
    if (type === COMMAND && !has((link) => link.to === id && COMMAND_TRIGGERS.has(link.type)))
      warnings.push({ code: 'W6', shapeIds: [id] });
    const touching = touches.some((touch) => touch.first === shape || touch.second === shape);
    if (!touching && type !== HOTSPOT) warnings.push({ code: 'W7', shapeIds: [id] });
  }
  for (const [a, b] of overlaps) warnings.push({ code: 'W8', shapeIds: [a, b] });

  return { links: kept, warnings };
}
