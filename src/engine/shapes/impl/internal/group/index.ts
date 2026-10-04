import { Group } from 'three';
import type { ShapeDefinition } from '../../../types';

/** Les groupes draw.io sont invisibles : seuls leurs enfants sont dessinés. */
export const definition: ShapeDefinition = {
  id: 'group',
  flat: {
    create(shape) {
      const group = new Group();
      group.name = `shape:${shape.id}`;
      return group;
    },
  },
  minimap: null,
  // Invisible : ni poignées ni flèches ; on prend ses formes, sauf s'il porte un lien ; il se déplace d'un bloc.
  resizable: false,
  connectable: false,
  pickable: 'withLink',
  movesAsBlock: true,
};
