import type { ShapeModel } from '../../model/types';
import { SPATIAL } from '../../spatial';
import { tagProperty } from '../utils/building';
import type { CylinderDrawing } from '../utils/cylinder';
import { cylinderFlat, cylinderLip, cylinderSilhouette, flatTextZone, ringHeight } from '../utils/cylinder';
import type { ShapeDefinition } from '../types';
import { CACHE_TAG, DEFAULT_CACHE_NODES, isoCache } from './cache';

/**
 * `shape=datastore` : ellipse de taille fixe, trois lèvres (les anneaux). Le label est toujours dans le
 * corps, sous les anneaux (2,5 × l'ellipse en haut), comme draw.io, qui ignore `boundedLbl` ici.
 */
function datastoreDrawing(shape: ShapeModel): CylinderDrawing {
  const { bounds, style } = shape;
  const dy = Math.max(0, Math.min(bounds.height / 2, ringHeight(style)));
  return {
    silhouette: cylinderSilhouette(bounds, dy),
    lips: [0, dy / 2, dy].map((offset) => cylinderLip(bounds, dy, offset)),
    label: {
      ...bounds,
      y: bounds.y + Math.min(bounds.height, 2.5 * dy),
      height: Math.max(0, bounds.height - 2.5 * dy),
    },
  };
}

const datastoreFlat = cylinderFlat(datastoreDrawing);

/** Cache distribué : cylindre à anneaux draw.io ; en iso, pile de disques (un par nœud, `spatial.nodes`). */
export const definition: ShapeDefinition = {
  kind: 'datastore',
  outline: (shape) => datastoreDrawing(shape).silhouette,
  flat: datastoreFlat,
  textZone: flatTextZone(datastoreDrawing),
  iso: isoCache(datastoreFlat),
  properties: [
    {
      type: 'number',
      key: SPATIAL.nodes,
      label: 'Nœuds',
      section: 'volume',
      title: 'Nombre de nœuds du cache, disques empilés en vue iso (spatial.nodes)',
      placeholder: String(DEFAULT_CACHE_NODES),
    },
    tagProperty(CACHE_TAG),
  ],
  templates: [
    {
      id: 'cache',
      name: 'Cache distribué',
      category: 'architecture',
      order: 70,
      keywords: ['cache', 'redis', 'datastore', 'stockage', 'storage'],
      style: 'shape=datastore;whiteSpace=wrap;html=1;',
      value: '',
      width: 60,
      height: 60,
      icon: '<path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0M12 9c0 3 16 3 16 0M12 12c0 3 16 3 16 0"/>',
    },
  ],
  swatch: () => '<path d="M12 6c0-3 16-3 16 0v16c0 3-16 3-16 0zM12 6c0 3 16 3 16 0"/>',
};
