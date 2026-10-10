import { center, distance, rectContains } from '../model/geometry';
import type { Rect } from '../model/types';

/**
 * Place visée pendant le glisser d'une forme (sujet 481) : celle qui contient le centre de la forme, à sa place
 * courante `bounds` ; la plus proche de ce centre si plusieurs le contiennent (places qui se recouvrent).
 */
export function placeUnder(places: readonly Rect[], bounds: Rect): Rect | undefined {
  const middle = center(bounds);
  let best: Rect | undefined;
  let bestDistance = Infinity;
  for (const place of places) {
    if (!rectContains(place, middle)) continue;
    const d = distance(center(place), middle);
    if (d < bestDistance) [best, bestDistance] = [place, d];
  }
  return best;
}
