import type { ModeProperty, PageModel, ShapeModel, Side } from '../../../../core/plugins';
import { shapeOf, shapeTarget } from '../../../../core/plugins';
import { isSticky, stickyType } from '../kinds';
import { contacts } from './contacts';

/** Contacts d'un post-it en clair (sujet 475), pour son panneau : une ligne par post-it touché ou chevauché. */

const WHERE: Readonly<Record<Side, string>> = { n: 'en haut', s: 'en bas', w: 'à gauche', e: 'à droite' };

/** Part d'un côté au-delà de laquelle le contact le couvre entier (arrondi des bornes). */
const WHOLE_SIDE = 0.995;

/** « Command « Payer » », ou le seul nom du type pour un post-it sans texte. */
function stickyName(shape: ShapeModel | undefined): string {
  if (!shape) return '?';
  const type = stickyType(shape)?.label ?? shape.kind;
  const text = shape.label.trim().replace(/\s+/g, ' ');
  return text ? `${type} « ${text} »` : type;
}

const extent = (share: number) => (share >= WHOLE_SIDE ? 'sur tout le côté' : `sur ${Math.round(share * 100)} %`);

/** Lignes des contacts de `shape` : le post-it touché, le côté de `shape` qui le touche, la part de ce côté. */
export function contactLines(page: PageModel, shape: ShapeModel): string[] {
  const { contacts: list, overlaps } = contacts(page);
  const lines: string[] = [];
  for (const contact of list) {
    const [own, other] =
      contact.a.shapeId === shape.id
        ? [contact.a, contact.b]
        : contact.b.shapeId === shape.id
          ? [contact.b, contact.a]
          : [];
    if (own && other)
      lines.push(`${stickyName(shapeOf(page, other.shapeId))} — ${WHERE[own.side]}, ${extent(own.share)}`);
  }
  for (const [a, b] of overlaps) {
    const other = a === shape.id ? b : b === shape.id ? a : undefined;
    if (other) lines.push(`${stickyName(shapeOf(page, other))} — chevauchement`);
  }
  return lines;
}

/** Contacts du post-it sélectionné, en lecture seule dans la section du mode. */
export const CONTACTS_PROPERTY: ModeProperty = {
  type: 'text',
  multiline: true,
  key: 'contacts',
  label: 'Contacts',
  title: 'Post-it qui touchent celui-ci, par quel côté et sur quelle part du côté ; les chevauchements à part',
  readOnly: true,
  value: (page, target) => {
    const shape = shapeTarget(target);
    if (!shape) return undefined;
    const lines = contactLines(page, shape);
    return lines.length ? lines.join('\n') : 'Ne touche aucun post-it';
  },
  hidden: (_page, target) => {
    const shape = shapeTarget(target);
    return !shape || !isSticky(shape);
  },
};
