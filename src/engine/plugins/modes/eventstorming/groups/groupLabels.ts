import { rectContains, shapeTarget } from '../../../../core/plugins';
import type { ModeEdit, ModeParts, ModeProperty, PageModel, ShapeModel } from '../../../../core/plugins';
import { GROUP, keys } from '../keys';
import { DEFAULT_GROUP_LABEL, GROUP_TITLE, groupLabel, groupOf, stickyGroups, writtenLabel } from './stickyGroups';
import type { StickyGroup } from './stickyGroups';

/**
 * Libellé des groupes de post-it (sujet 514) : écrit sur tous les post-it du groupe, repris par un post-it qui le
 * rejoint, édité au double-clic sur le titre (partie `group` du premier post-it du groupe) ou dans le panneau.
 * Recopié même sur un post-it verrouillé : c'est un réglage du groupe, que le verrou ne doit pas laisser périmé.
 */

/** Partie du premier post-it du groupe qui tient le titre. */
export const GROUP_PART = 'group';

/** Clés de l'habillage (jamais écrites) : libellé du titre et bord gauche du groupe, pour le post-it qui le dessine. */
export const TITLE_TEXT = keys.key('groupTitle');
export const TITLE_LEFT = keys.key('groupLeft');

/** Écrit `label` sur tous les post-it du groupe (le libellé par défaut, ou vide, retire l'attribut). */
function writeLabel(edit: ModeEdit, group: StickyGroup, label: string | undefined): void {
  const value = label?.trim() && label.trim() !== DEFAULT_GROUP_LABEL ? label.trim() : undefined;
  for (const shape of group.shapes)
    if (writtenLabel(shape) !== value) edit.setElementAttribute(shape.id, GROUP, value, { derived: true });
}

/** Libellé du groupe du post-it `shapeId` changé (titre ou panneau). */
export function setGroupLabel(edit: ModeEdit, shapeId: string, label: string | undefined): void {
  const group = groupOf(edit.page, shapeId);
  if (group) writeLabel(edit, group, label);
}

/**
 * Post-it posés (`shapeIds`) : chaque groupe qui en contient prend le libellé de ses post-it restés en place (le
 * groupe sur lequel on pose), sinon celui des post-it posés ; le premier écrit dans l'ordre du groupe.
 */
export function adoptGroupLabels(edit: ModeEdit, shapeIds: readonly string[]): void {
  const placed = new Set(shapeIds);
  for (const group of stickyGroups(edit.page)) {
    if (!group.shapes.some((shape) => placed.has(shape.id))) continue;
    const first = (shapes: ShapeModel[]) => shapes.map(writtenLabel).find((label) => label !== undefined);
    const label =
      first(group.shapes.filter((shape) => !placed.has(shape.id))) ??
      first(group.shapes.filter((shape) => placed.has(shape.id)));
    writeLabel(edit, group, label);
  }
}

/** Groupe dont `shape` tient le titre (il en est le premier post-it). */
const titledBy = (page: PageModel, shape: ShapeModel): StickyGroup | undefined => {
  const group = groupOf(page, shape.id);
  return group?.shapes[0]?.id === shape.id ? group : undefined;
};

/** Le titre se double-clique hors de toute forme, et s'édite comme une partie du premier post-it. */
export const GROUP_PARTS: ModeParts = {
  at: () => undefined,
  bounds: (page, shape, part) => (part === GROUP_PART ? titledBy(page, shape)?.title : undefined),
  outsideTextAt: (page, point) => {
    const group = stickyGroups(page).find((candidate) => rectContains(candidate.title, point));
    return group && { shapeId: group.shapes[0]!.id, part: GROUP_PART };
  },
  text: (page, shape, part) => {
    const group = part === GROUP_PART ? titledBy(page, shape) : undefined;
    return (
      group && {
        text: groupLabel(group),
        zone: group.title,
        fontSize: GROUP_TITLE.fontSize,
        bold: true,
        color: GROUP_TITLE.color,
        transparent: true,
      }
    );
  },
  setText: (edit, shape, part, text) => {
    if (part === GROUP_PART) setGroupLabel(edit, shape.id, text);
  },
};

/** Habillage : le premier post-it de chaque groupe reçoit le libellé et le bord gauche du titre qu'il dessine. */
export function groupTitleStyle(page: PageModel): (shape: ShapeModel) => Record<string, string> | undefined {
  return (shape) => {
    const group = titledBy(page, shape);
    return group && { [TITLE_TEXT]: groupLabel(group), [TITLE_LEFT]: String(group.bounds.x) };
  };
}

/** Champ « Groupe » d'un post-it d'un groupe : le libellé de tout le groupe. */
export const GROUP_PROPERTY: ModeProperty = {
  type: 'text',
  key: GROUP,
  label: 'Groupe',
  title:
    'Libellé du groupe de post-it collés, écrit sur chacun (spatial.es.group) ; double-clic sur le titre pour l’éditer sur place',
  placeholder: DEFAULT_GROUP_LABEL,
  value: (page, target) => {
    const group = groupOf(page, target.id);
    return group && groupLabel(group);
  },
  write: (edit, target, value) => setGroupLabel(edit, target.id, value),
  hidden: (page, target) => !shapeTarget(target) || !groupOf(page, target.id),
};
