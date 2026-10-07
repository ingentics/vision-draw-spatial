import type { ShapeModel } from '../../../../core/model/types';
import { tagProperty } from '../../../generic/building';
import { cylinder3Drawing, cylinderFlat, directionOf, flatTextZone, isLying } from '../../../generic/cylinder';
import type { ShapeDefinition } from '../../../types';
import { DIRECT_DATA, directDataDrawing } from './directData';
import { isoQueue, QUEUE_TAG } from './facade';

/**
 * draw.io écrit une queue de deux façons : `cylinder3` couché (`direction=south` / `north`) ou `direct_data`. Une
 * forme imposée en queue (`spatial.kind=queue`) sans direction couchée se couche vers la droite.
 */
const drawing = (shape: ShapeModel) =>
  shape.kind === DIRECT_DATA
    ? directDataDrawing(shape)
    : cylinder3Drawing(isLying(shape) ? shape : { ...shape, style: { ...shape.style, direction: 'south' } });
const flat = cylinderFlat(drawing);

/**
 * Queue (« File ») : étend le cylindre (couché, bout visible à droite, à gauche si `direction=north`) et le bâtiment
 * (en iso, demi-cylindre couché aux chevrons de flux, dans le sens de la largeur).
 */
export const definition: ShapeDefinition = {
  id: 'queue',
  kinds: ['cylinder3', DIRECT_DATA],
  matches: (shape) => shape.kind === DIRECT_DATA || isLying(shape),
  outline: (shape) => drawing(shape).silhouette,
  flat,
  textZone: flatTextZone(drawing),
  iso: isoQueue(flat, (shape) => shape.kind !== DIRECT_DATA && directionOf(shape.style) === 'north'),
  properties: [tagProperty(QUEUE_TAG)],
  swatch: () => '<path d="M10 6h20a3 8 0 0 1 0 16H10a3 8 0 0 1 0-16zM30 6a3 8 0 0 0 0 16"/>',
  palette: {
    name: 'File (queue)',
    category: 'architecture',
    order: 60,
    keywords: ['queue', 'message', 'kafka', 'bus', 'cylindre', 'cylinder'],
    // Cylindre couché (bout visible à droite) : le bout garde sa taille quand on l'allonge.
    style: 'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;direction=south;',
    value: '',
    width: 100,
    height: 30,
    icon: '<path d="M10 5h20a4 9 0 0 1 0 18H10a4 9 0 0 1 0-18zM30 5a4 9 0 0 0 0 18"/>',
  },
};
