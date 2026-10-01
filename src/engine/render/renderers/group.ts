import { Group } from 'three';
import type { ShapeRenderer } from '../types';

/** Les groupes draw.io sont invisibles : seuls leurs enfants sont dessinés. */
export const groupRenderer: ShapeRenderer = {
  kind: 'group',
  create(shape) {
    const group = new Group();
    group.name = `shape:${shape.id}`;
    return group;
  },
};
