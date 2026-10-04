import type { ShapeModel } from '../../../../model/types';
import { tagProperty } from '../../../generic/building';
import { cylinder3Drawing, cylinderFlat, flatTextZone, isLying } from '../../../generic/cylinder';
import type { ShapeDefinition } from '../../../types';
import { DATABASE_TAG, isoDatabase } from './facade';

/** Jamais couchée : une forme imposée en BDD (`spatial.kind=database`) ignore une direction couchée. */
function drawing(shape: ShapeModel) {
  if (!isLying(shape)) return cylinder3Drawing(shape);
  const { direction: _direction, ...style } = shape.style;
  return cylinder3Drawing({ ...shape, style });
}
const flat = cylinderFlat(drawing);

/**
 * Base de données : `shape=cylinder3` debout. Étend le cylindre (tracé draw.io) et le bâtiment (en iso, bloc droit
 * aux arcs gravés). Couché, le même `cylinder3` est une queue (`queue`, plus précise, l'emporte).
 */
export const definition: ShapeDefinition = {
  id: 'database',
  kinds: ['cylinder3'],
  outline: (shape) => drawing(shape).silhouette,
  flat,
  textZone: flatTextZone(drawing),
  iso: isoDatabase(flat),
  properties: [tagProperty(DATABASE_TAG)],
  swatch: () => '<path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0"/>',
  palette: {
    name: 'Base de données',
    category: 'architecture',
    order: 50,
    keywords: ['bdd', 'database', 'db', 'sql', 'stockage', 'storage', 'cylindre', 'cylinder'],
    style: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;',
    value: '',
    width: 60,
    height: 80,
    icon: '<path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0"/>',
  },
};
