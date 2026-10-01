import { Group } from 'three';
import type { ShapeDefinition } from './types';

/** Les groupes draw.io sont invisibles : seuls leurs enfants sont dessinés. */
export const groupShape: ShapeDefinition = {
  kind: 'group',
  flat: {
    create(shape) {
      const group = new Group();
      group.name = `shape:${shape.id}`;
      return group;
    },
  },
  minimap: null,
};
