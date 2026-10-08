import type { ModeEdit, ModeHandle, ShapeModel } from '../../../../core/plugins';
import { addField } from '../tables/operations';
import { tableKindOf } from '../tables/tableKinds';
import { fieldIndex } from './tableTargets';

/**
 * Poignée « + » d'une table RDD (sujet 250) : sous la table, au milieu ; un clic ajoute aussitôt un champ sans type
 * (sujet 256) après le champ sélectionné (sinon en fin de liste), sélectionné ensuite.
 */

/** Vert de la poignée d'ajout. */
const ADD_COLOR = '#2e9e44';
const ADD_FIELD = 'rdd.addField';

export function fieldHandles(shape: ShapeModel): ModeHandle[] {
  // Une table sans champs (document, sujet 269) n'a pas de « + ».
  if (!tableKindOf(shape)?.rules.fields) return [];
  const { x, y, width, height } = shape.bounds;
  return [
    {
      id: ADD_FIELD,
      // Au milieu du bas, à la place de la poignée de connexion du bas (masquée sur les tables).
      at: { x: x + width / 2, y: y + height },
      offset: { x: 0, y: 18 },
      color: ADD_COLOR,
      title: 'Ajouter un champ',
    },
  ];
}

/** Clic sur la poignée : le champ ajouté, sans type, désigné par son rang (la partie à sélectionner). */
export function fieldHandleClicked(
  edit: ModeEdit,
  shape: ShapeModel,
  handle: string,
  part?: string,
): string | undefined {
  if (handle !== ADD_FIELD) return undefined;
  const index = addField(edit, shape, '', fieldIndex(shape, part));
  return index === undefined ? undefined : String(index);
}
