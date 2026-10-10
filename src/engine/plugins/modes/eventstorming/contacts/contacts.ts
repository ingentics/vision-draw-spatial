import type { PageModel, Point, Rect, ShapeModel } from '../../../../core/plugins';
import { isSticky } from '../kinds';

/**
 * Contacts entre post-it du mode Event storming (sujet 475) : deux post-it se touchent quand deux de leurs bords
 * parallèles sont à moins de `CONTACT_TOLERANCE` l'un de l'autre et qu'ils se recouvrent sur l'autre axe (au-delà de
 * la tolérance : un coin seul ne compte pas). Deux post-it qui se chevauchent sont signalés à part. Base des sujets
 * qui interpréteront ces contacts (flux, règles, export).
 */

/** Écart toléré entre deux bords en contact, en pixels de page. */
export const CONTACT_TOLERANCE = 0.5;

/** Côté d'un post-it. */
export type ContactSide = 'top' | 'bottom' | 'left' | 'right';

const OPPOSITE: Readonly<Record<ContactSide, ContactSide>> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Une des deux formes d'un contact : son côté qui touche, et la part de ce côté prise par le contact (0 à 1). */
export interface ContactEnd {
  shapeId: string;
  side: ContactSide;
  share: number;
}

export interface Contact {
  a: ContactEnd;
  b: ContactEnd;
  /** Segment de contact, sur la ligne médiane des deux bords. */
  start: Point;
  end: Point;
  length: number;
}

export interface StickyContacts {
  contacts: Contact[];
  /** Paires de post-it qui se chevauchent (ids), qui ne comptent pas comme contacts. */
  overlaps: [string, string][];
}

/** Recouvrement des intervalles [a0, a1] et [b0, b1] : négatif s'ils sont disjoints (moins l'écart). */
const overlapOf = (a0: number, a1: number, b0: number, b1: number) => Math.min(a1, b1) - Math.max(a0, b0);

/** Contact de `a` vers `b` le long d'un axe, ou undefined. `horizontal` : côte à côte (gauche / droite). */
function contactOf(a: ShapeModel, b: ShapeModel, horizontal: boolean): Contact | undefined {
  const ra = a.bounds;
  const rb = b.bounds;
  // Axe des bords en contact (x pour gauche / droite) et axe du segment.
  const [a0, a1, b0, b1] = horizontal
    ? [ra.x, ra.x + ra.width, rb.x, rb.x + rb.width]
    : [ra.y, ra.y + ra.height, rb.y, rb.y + rb.height];
  const [c0, c1, d0, d1] = horizontal
    ? [ra.y, ra.y + ra.height, rb.y, rb.y + rb.height]
    : [ra.x, ra.x + ra.width, rb.x, rb.x + rb.width];
  const along = overlapOf(c0, c1, d0, d1);
  if (along <= CONTACT_TOLERANCE) return undefined;
  // `a` avant `b` sur l'axe (bord de fin de `a` contre le bord de début de `b`), ou l'inverse.
  const before = Math.abs(a1 - b0) <= CONTACT_TOLERANCE;
  const after = Math.abs(b1 - a0) <= CONTACT_TOLERANCE;
  if (!before && !after) return undefined;
  const line = before ? (a1 + b0) / 2 : (b1 + a0) / 2;
  const from = Math.max(c0, d0);
  const to = Math.min(c1, d1);
  const sideA: ContactSide = horizontal ? (before ? 'right' : 'left') : before ? 'bottom' : 'top';
  const point = (t: number): Point => (horizontal ? { x: line, y: t } : { x: t, y: line });
  return {
    a: { shapeId: a.id, side: sideA, share: along / (c1 - c0) },
    b: { shapeId: b.id, side: OPPOSITE[sideA], share: along / (d1 - d0) },
    start: point(from),
    end: point(to),
    length: to - from,
  };
}

/** Les deux rectangles se recouvrent-ils au-delà de la tolérance, sur les deux axes ? */
function overlapping(a: Rect, b: Rect): boolean {
  return (
    overlapOf(a.x, a.x + a.width, b.x, b.x + b.width) > CONTACT_TOLERANCE &&
    overlapOf(a.y, a.y + a.height, b.y, b.y + b.height) > CONTACT_TOLERANCE
  );
}

/** Contacts et chevauchements des post-it de la page, calculés une fois par page (modèle relu à chaque modification). */
const CACHE = new WeakMap<PageModel, StickyContacts>();

export function contacts(page: PageModel): StickyContacts {
  const cached = CACHE.get(page);
  if (cached) return cached;
  const stickies = page.shapes.filter(isSticky);
  const result: StickyContacts = { contacts: [], overlaps: [] };
  stickies.forEach((a, index) => {
    for (const b of stickies.slice(index + 1)) {
      if (overlapping(a.bounds, b.bounds)) {
        result.overlaps.push([a.id, b.id]);
        continue;
      }
      const contact = contactOf(a, b, true) ?? contactOf(a, b, false);
      if (contact) result.contacts.push(contact);
    }
  });
  CACHE.set(page, result);
  return result;
}
