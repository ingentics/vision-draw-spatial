import type { ShapeModel } from '../../model/types';
import type { ModeEdit, ModeHandle } from '../types';
import { fieldIndex } from './fieldParts';
import { addField } from './operations';
import { FIELD_TYPES, tableKindOf } from './tables';

/**
 * Poignée « + » d'une table RDD (sujet 250) : sous la table, au milieu ; son menu propose les types de donnée, et chaque
 * choix ajoute un champ de ce type après le champ sélectionné (sinon en fin de liste), sélectionné ensuite.
 */

/** Vert de la poignée d'ajout. */
const ADD_COLOR = '#2e9e44';
const ADD_FIELD = 'rdd.addField';

export function fieldHandles(shape: ShapeModel): ModeHandle[] {
  if (!tableKindOf(shape)) return [];
  const { x, y, width, height } = shape.bounds;
  return [
    {
      id: ADD_FIELD,
      // Au milieu du bas, à la place de la poignée de connexion du bas (masquée sur les tables).
      at: { x: x + width / 2, y: y + height },
      offset: { x: 0, y: 18 },
      color: ADD_COLOR,
      title: 'Ajouter un champ',
      choices: Object.entries(FIELD_TYPES).map(([id, label]) => ({ id, label })),
    },
  ];
}

/** Choix du menu de la poignée : le champ ajouté, désigné par son rang (la partie à sélectionner). */
export function fieldHandleChosen(
  edit: ModeEdit,
  shape: ShapeModel,
  handle: string,
  choice: string,
  part?: string,
): string | undefined {
  if (handle !== ADD_FIELD || !(choice in FIELD_TYPES)) return undefined;
  const index = addField(edit, shape, choice, fieldIndex(shape, part));
  return index === undefined ? undefined : String(index);
}
