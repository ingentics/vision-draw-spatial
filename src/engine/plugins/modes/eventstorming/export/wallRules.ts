import type { PageModel, ShapeModel } from '../../../../core/plugins';
import { contacts } from '../contacts/contacts';
import type { Contact } from '../contacts/contacts';
import { COMMAND, EVENT, POLICY, stickyType } from '../kinds';
import type { StickyType } from '../kinds';
import { STICKY_RULES } from '../stickyRules';
import type { WarningCode } from '../stickyRules';

/**
 * Règles de lecture du mur (sujet 518) : liens déduits des contacts entre post-it (R1 à R5, grammaire de
 * `stickyRules.ts`) et avertissements (W1 à W8, textes dans `stickyRules.ts`), sans flèche dessinée. Une position
 * qu'aucune règle n'explique donne un avertissement, jamais un lien ; un contact sans règle entre deux post-it liés
 * par ailleurs est ignoré (sujet 519).
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

export interface WallWarning {
  code: WarningCode;
  /** Ids des formes concernées. */
  shapeIds: string[];
}

/** Règles du type du post-it. */
const rulesOf = (type: StickyType) => STICKY_RULES[type.key];

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
  const sequence = horizontal && rulesOf(left).right?.[right.key];
  if (sequence) return { from: first.id, to: second.id, type: sequence, rule: 'R1' };
  const forward = rulesOf(left).glued?.[right.key];
  if (forward) return { from: first.id, to: second.id, type: forward, rule: 'R2' };
  const backward = rulesOf(right).glued?.[left.key];
  if (backward) return { from: second.id, to: first.id, type: backward, rule: 'R2' };
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
  const stacked = (touch: Touch) =>
    !touch.horizontal && typeOf(touch.first) === typeOf(touch.second) && Boolean(rulesOf(typeOf(touch.first)).stacks);
  /** Pile de `shape` : lui et les post-it empilés avec lui, de proche en proche (contacts suffisants). */
  const pileOf = (shape: ShapeModel): ShapeModel[] => {
    const pile = [shape];
    for (let index = 0; index < pile.length; index++) {
      for (const touch of touches.filter((touch) => touch.strong && stacked(touch))) {
        const other =
          touch.first === pile[index] ? touch.second : touch.second === pile[index] ? touch.first : undefined;
        if (other && !pile.includes(other)) pile.push(other);
      }
    }
    return pile;
  };
  /** Contacts sans règle (W1), gardés si l'un des deux post-it n'a aucun lien (sujet 519). */
  const unruled: [string, string][] = [];

  for (const touch of touches) {
    const { first, second } = touch;
    // Hotspot : seul son voisin visé compte (R4), ses autres contacts sont ignorés.
    if (rulesOf(typeOf(first)).anywhere || rulesOf(typeOf(second)).anywhere) continue;
    // Pile : deux post-it du même type empilés (Events : issues alternatives, R5) ; pas de lien entre eux.
    if (stacked(touch)) continue;
    // Post-it intercalé à droite (Policy entre une Command et ses Events) : le lien le traverse, plus bas.
    if (touch.horizontal && rulesOf(typeOf(first)).through?.includes(typeOf(second).key)) continue;
    const link = touch.strong ? linkOf(touch) : undefined;
    if (link) links.push(link);
    else unruled.push([first.id, second.id]);
  }

  // R1 à travers une pile intercalée (sujet 520) : Command | Policies empilées | Events, la Command produit les
  // Events collés à droite de ces Policies.
  for (const touch of touches) {
    const { first, second } = touch;
    if (!touch.horizontal || !touch.strong || !rulesOf(typeOf(first)).through?.includes(typeOf(second).key)) continue;
    for (const middle of pileOf(second)) {
      for (const next of touches.filter((next) => next.horizontal && next.strong && next.first === middle)) {
        const type = rulesOf(typeOf(first)).right?.[typeOf(next.second).key];
        if (type) links.push({ from: first.id, to: next.second.id, type, rule: 'R1' });
      }
    }
  }

  // Un lien vers un post-it d'une pile vaut pour toute la pile : Events produits par une même Command, empilés à sa
  // droite, même ceux qui ne la touchent pas (R5 : le premier lu reste R1, les suivants passent en R5) ; Policies
  // empilées sur l'Event qui les déclenche (R2, chacune). Seulement vers ceux qui n'ont pas déjà un lien du même type
  // (Policies intercalées, chacune face à son Event : pas de liens croisés).
  const own = new Set(links.map((link) => `${link.to} ${link.type}`));
  for (const link of links.filter((link) => link.rule === 'R1' || link.rule === 'R2')) {
    const rule = link.rule === 'R1' ? 'R5' : 'R2';
    for (const other of pileOf(byId.get(link.to)!).slice(1)) {
      if (!own.has(`${other.id} ${link.type}`)) links.push({ ...link, to: other.id, rule });
    }
  }
  const piled = new Map<string, WallLink[]>();
  for (const link of links.filter((link) => link.rule === 'R1' || link.rule === 'R5')) {
    if (!rulesOf(typeOf(byId.get(link.to)!)).stacks) continue;
    const key = `${link.from} ${link.type}`;
    piled.set(key, [...(piled.get(key) ?? []), link]);
  }
  for (const group of piled.values()) {
    group
      .sort((a, b) => byReading(byId.get(a.to)!, byId.get(b.to)!))
      .forEach((link, index) => (link.rule = index === 0 ? 'R1' : 'R5'));
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
  for (const hotspot of stickies.filter((shape) => rulesOf(typeOf(shape)).anywhere)) {
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
    if (!touching && !rulesOf(type).anywhere) warnings.push({ code: 'W7', shapeIds: [id] });
  }
  for (const [a, b] of overlaps) warnings.push({ code: 'W8', shapeIds: [a, b] });

  return { links: kept, warnings };
}
