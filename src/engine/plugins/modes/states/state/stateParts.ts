import type { ModeParts } from '../../../../core/plugins';
import { inflate, rectContains } from '../../../../core/plugins';
import { isState } from '../kinds';
import { BODY_PART, stateBody } from './bodyText';
import { setBody, withBody } from './stateBody';
import { STATE, bodyZone } from './stateLayout';

/**
 * Contenu d'un état comme partie de la forme (sujet 433) : modifiable par double-clic dans sa zone, sans être
 * sélectionnable (comme le corps d'un document RDD). Un état n'a pas de partie sélectionnable.
 */
export const stateParts: ModeParts = {
  at: () => undefined,
  bounds: () => undefined,
  // Double-clic sous le trait (marges comprises) : le contenu sur place, en plusieurs lignes.
  textAt(_page, shape, point) {
    const zone = isState(shape) ? bodyZone(shape) : undefined;
    return zone && rectContains(inflate(zone, STATE.padding), point) ? BODY_PART : undefined;
  },
  text(_page, shape, part) {
    const zone = part === BODY_PART && isState(shape) ? bodyZone(shape) : undefined;
    return zone && { text: stateBody(shape), zone, fontSize: STATE.bodySize, multiline: true };
  },
  // Saisie en direct : l'état grandit avec ses lignes.
  textPreview: (shape, part, text, sizing) =>
    part === BODY_PART && isState(shape) ? withBody(shape, text, sizing) : shape,
  setText(edit, shape, part, text) {
    if (part === BODY_PART) setBody(edit, shape, text);
  },
};
