import { number } from '../util';
import { segmentConnector } from './segment';
import { ALL, EAST, NORTH, portConstraints, r10, scaled, scaledPoint, SOUTH, WEST } from './state';
import type { Router } from './state';

/** Routeur orthogonal (`mxEdgeStyle.OrthConnector`). */

const ORTH_BUFFER = 10;

const DEFAULT_MARKER_SIZE = 6;

const SIDE_MASK = 480;

const CENTER_MASK = 512;

const SOURCE_MASK = 1024;

const TARGET_MASK = 2048;

const DIR_VECTORS: Array<[number, number]> = [
  [-1, 0],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
];

const ROUTE_PATTERNS: number[][][] = [
  [
    [513, 2308, 2081, 2562],
    [513, 1090, 514, 2184, 2114, 2561],
    [513, 1090, 514, 2564, 2184, 2562],
    [513, 2308, 2561, 1090, 514, 2568, 2308],
  ],
  [
    [514, 1057, 513, 2308, 2081, 2562],
    [514, 2184, 2114, 2561],
    [514, 2184, 2562, 1057, 513, 2564, 2184],
    [514, 1057, 513, 2568, 2308, 2561],
  ],
  [
    [1090, 514, 1057, 513, 2308, 2081, 2562],
    [2114, 2561],
    [1090, 2562, 1057, 513, 2564, 2184],
    [1090, 514, 1057, 513, 2308, 2561, 2568],
  ],
  [
    [2081, 2562],
    [1057, 513, 1090, 514, 2184, 2114, 2561],
    [1057, 513, 1090, 514, 2184, 2562, 2564],
    [1057, 2561, 1090, 514, 2568, 2308],
  ],
];

function reversePortConstraints(constraint: number): number {
  return (
    ((constraint & WEST) << 3) | ((constraint & NORTH) << 1) | ((constraint & SOUTH) >> 1) | ((constraint & EAST) >> 3)
  );
}

function jettySize(style: Record<string, string>, isSource: boolean): number {
  const value = style[isSource ? 'sourceJettySize' : 'targetJettySize'] ?? style.jettySize;
  if (value === 'auto') {
    // Pointe par défaut de draw.io : aucune au départ, classic à l'arrivée.
    const arrow = isSource ? (style.startArrow ?? 'none') : (style.endArrow ?? 'classic');
    if (arrow !== 'none') {
      const size = number(style[isSource ? 'startSize' : 'endSize'], DEFAULT_MARKER_SIZE);
      return Math.max(2, Math.ceil((size + ORTH_BUFFER) / ORTH_BUFFER)) * ORTH_BUFFER;
    }
    return 2 * ORTH_BUFFER;
  }
  return number(value, ORTH_BUFFER);
}

/** Orthogonal sans point intermédiaire (mxEdgeStyle.OrthConnector) ; avec points : SegmentConnector. */
export const orthConnector: Router = (view, fixed, sourceIn, targetIn, hints, result) => {
  const source = scaled(sourceIn);
  const target = scaled(targetIn);
  const p0 = scaledPoint(fixed.p0);
  const pe = scaledPoint(fixed.pe);

  let sourceBuffer = jettySize(view.style, true);
  let targetBuffer = jettySize(view.style, false);
  if (
    source &&
    targetIn &&
    sourceIn &&
    (sourceIn.id !== undefined ? sourceIn.id === targetIn.id : sourceIn === targetIn)
  ) {
    targetBuffer = Math.max(sourceBuffer, targetBuffer);
    sourceBuffer = targetBuffer;
  }
  const totalBuffer = targetBuffer + sourceBuffer;
  let tooShort = false;
  if (p0 && pe) {
    const dx = pe.x - p0.x;
    const dy = pe.y - p0.y;
    tooShort = dx * dx + dy * dy < totalBuffer * totalBuffer;
  }
  if (tooShort || hints.length > 0) {
    segmentConnector(view, fixed, sourceIn, targetIn, hints, result);
    return;
  }
  if ((!source && !p0) || (!target && !pe)) return;

  const sourceX = source ? source.x : p0!.x;
  const sourceY = source ? source.y : p0!.y;
  const sourceWidth = source ? source.width : 1;
  const sourceHeight = source ? source.height : 1;
  const targetX = target ? target.x : pe!.x;
  const targetY = target ? target.y : pe!.y;
  const targetWidth = target ? target.width : 1;
  const targetHeight = target ? target.height : 1;

  const portConstraint = [ALL, ALL];
  if (source) portConstraint[0] = portConstraints(source, view.style, true, ALL);
  if (target) portConstraint[1] = portConstraints(target, view.style, false, ALL);
  if (sourceWidth === 0 || sourceHeight === 0 || targetWidth === 0 || targetHeight === 0) return;

  const dir = [0, 0];
  const geo = [
    [sourceX, sourceY, sourceWidth, sourceHeight],
    [targetX, targetY, targetWidth, targetHeight],
  ] as const;
  const buffer = [sourceBuffer, targetBuffer];
  const limits = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
  ];
  for (let i = 0; i < 2; i++) {
    limits[i]![1] = geo[i]![0] - buffer[i]!;
    limits[i]![2] = geo[i]![1] - buffer[i]!;
    limits[i]![4] = geo[i]![0] + geo[i]![2] + buffer[i]!;
    limits[i]![8] = geo[i]![1] + geo[i]![3] + buffer[i]!;
  }

  // Quadrant de la cible par rapport à la source : 0 | 1 / 3 | 2.
  const dx = geo[0][0] + geo[0][2] / 2 - (geo[1][0] + geo[1][2] / 2);
  const dy = geo[0][1] + geo[0][3] / 2 - (geo[1][1] + geo[1][3] / 2);
  let quad = 0;
  if (dx < 0) quad = dy < 0 ? 2 : 1;
  else if (dy <= 0) quad = dx === 0 ? 2 : 3;

  // Points d'attache imposés : côté de sortie et position relative.
  const constraint = [
    [0.5, 0.5],
    [0.5, 0.5],
  ];
  let currentTerm = source ? p0 : undefined;
  for (let i = 0; i < 2; i++) {
    if (currentTerm) {
      constraint[i]![0] = (currentTerm.x - geo[i]![0]) / geo[i]![2];
      if (Math.abs(currentTerm.x - geo[i]![0]) <= 1) dir[i] = WEST;
      else if (Math.abs(currentTerm.x - geo[i]![0] - geo[i]![2]) <= 1) dir[i] = EAST;
      constraint[i]![1] = (currentTerm.y - geo[i]![1]) / geo[i]![3];
      if (Math.abs(currentTerm.y - geo[i]![1]) <= 1) dir[i] = NORTH;
      else if (Math.abs(currentTerm.y - geo[i]![1] - geo[i]![3]) <= 1) dir[i] = SOUTH;
    }
    currentTerm = target ? pe : undefined;
  }

  const sourceTopDist = geo[0][1] - (geo[1][1] + geo[1][3]);
  const sourceLeftDist = geo[0][0] - (geo[1][0] + geo[1][2]);
  const sourceBottomDist = geo[1][1] - (geo[0][1] + geo[0][3]);
  const sourceRightDist = geo[1][0] - (geo[0][0] + geo[0][2]);
  const separations: number[] = [];
  separations[1] = Math.max(sourceLeftDist - totalBuffer, 0);
  separations[2] = Math.max(sourceTopDist - totalBuffer, 0);
  separations[4] = Math.max(sourceBottomDist - totalBuffer, 0);
  separations[3] = Math.max(sourceRightDist - totalBuffer, 0);

  // Côtés préférés de la source et de la cible, dans l'ordre.
  const dirPref: number[] = [];
  const horPref: number[] = [];
  const vertPref: number[] = [];
  horPref[0] = sourceLeftDist >= sourceRightDist ? WEST : EAST;
  vertPref[0] = sourceTopDist >= sourceBottomDist ? NORTH : SOUTH;
  horPref[1] = reversePortConstraints(horPref[0]);
  vertPref[1] = reversePortConstraints(vertPref[0]);
  const preferredHorizDist = sourceLeftDist >= sourceRightDist ? sourceLeftDist : sourceRightDist;
  const preferredVertDist = sourceTopDist >= sourceBottomDist ? sourceTopDist : sourceBottomDist;

  const prefOrdering = [
    [0, 0],
    [0, 0],
  ];
  let preferredOrderSet = false;
  for (let i = 0; i < 2; i++) {
    if (dir[i] !== 0) continue;
    if ((horPref[i]! & portConstraint[i]!) === 0) horPref[i] = reversePortConstraints(horPref[i]!);
    if ((vertPref[i]! & portConstraint[i]!) === 0) vertPref[i] = reversePortConstraints(vertPref[i]!);
    prefOrdering[i]![0] = vertPref[i]!;
    prefOrdering[i]![1] = horPref[i]!;
  }
  if (preferredVertDist > 0 && preferredHorizDist > 0) {
    // Connexion possible en deux segments.
    if ((horPref[0]! & portConstraint[0]!) > 0 && (vertPref[1]! & portConstraint[1]!) > 0) {
      prefOrdering[0] = [horPref[0]!, vertPref[0]!];
      prefOrdering[1] = [vertPref[1]!, horPref[1]!];
      preferredOrderSet = true;
    } else if ((vertPref[0]! & portConstraint[0]!) > 0 && (horPref[1]! & portConstraint[1]!) > 0) {
      prefOrdering[0] = [vertPref[0]!, horPref[0]!];
      prefOrdering[1] = [horPref[1]!, vertPref[1]!];
      preferredOrderSet = true;
    }
  }
  if (preferredVertDist > 0 && !preferredOrderSet) {
    prefOrdering[0] = [vertPref[0]!, horPref[0]!];
    prefOrdering[1] = [vertPref[1]!, horPref[1]!];
    preferredOrderSet = true;
  }
  if (preferredHorizDist > 0 && !preferredOrderSet) {
    prefOrdering[0] = [horPref[0]!, vertPref[0]!];
    prefOrdering[1] = [horPref[1]!, vertPref[1]!];
    preferredOrderSet = true;
  }

  for (let i = 0; i < 2; i++) {
    if (dir[i] !== 0) continue;
    const pc = portConstraint[i]!;
    if ((prefOrdering[i]![0]! & pc) === 0) prefOrdering[i]![0] = prefOrdering[i]![1]!;
    let pref = prefOrdering[i]![0]! & pc;
    pref |= (prefOrdering[i]![1]! & pc) << 8;
    pref |= (prefOrdering[1 - i]![i]! & pc) << 16;
    pref |= (prefOrdering[1 - i]![1 - i]! & pc) << 24;
    if ((pref & 0xf) === 0) pref = pref << 8;
    if ((pref & 0xf00) === 0) pref = (pref & 0xf) | (pref >> 8);
    if ((pref & 0xf0000) === 0) pref = (pref & 0xffff) | ((pref & 0xf000000) >> 8);
    dirPref[i] = pref;
    dir[i] = pref & 0xf;
    if (pc === WEST || pc === NORTH || pc === EAST || pc === SOUTH) dir[i] = pc;
  }

  let sourceIndex = (dir[0] === EAST ? 3 : dir[0]!) - quad;
  let targetIndex = (dir[1] === EAST ? 3 : dir[1]!) - quad;
  if (sourceIndex < 1) sourceIndex += 4;
  if (targetIndex < 1) targetIndex += 4;
  const routePattern = ROUTE_PATTERNS[sourceIndex - 1]![targetIndex - 1]!;

  const wayPoints: Array<[number, number]> = Array.from({ length: 12 }, () => [0, 0]);
  wayPoints[0] = [geo[0][0], geo[0][1]];
  switch (dir[0]) {
    case WEST:
      wayPoints[0][0] -= sourceBuffer;
      wayPoints[0][1] += constraint[0]![1]! * geo[0][3];
      break;
    case SOUTH:
      wayPoints[0][0] += constraint[0]![0]! * geo[0][2];
      wayPoints[0][1] += geo[0][3] + sourceBuffer;
      break;
    case EAST:
      wayPoints[0][0] += geo[0][2] + sourceBuffer;
      wayPoints[0][1] += constraint[0]![1]! * geo[0][3];
      break;
    case NORTH:
      wayPoints[0][0] += constraint[0]![0]! * geo[0][2];
      wayPoints[0][1] -= sourceBuffer;
      break;
  }

  let currentIndex = 0;
  // Orientation : 0 horizontal, 1 vertical.
  let lastOrientation = (dir[0]! & (EAST | WEST)) > 0 ? 0 : 1;
  const initialOrientation = lastOrientation;
  let currentOrientation = 0;

  for (const step of routePattern) {
    const nextDirection = step & 0xf;
    let directionIndex = (nextDirection === EAST ? 3 : nextDirection) + quad;
    if (directionIndex > 4) directionIndex -= 4;
    const direction = DIR_VECTORS[directionIndex - 1]!;
    currentOrientation = directionIndex % 2 > 0 ? 0 : 1;
    if (currentOrientation !== lastOrientation) {
      currentIndex++;
      wayPoints[currentIndex] = [wayPoints[currentIndex - 1]![0], wayPoints[currentIndex - 1]![1]];
    }
    const current = wayPoints[currentIndex]!;
    const tar = (step & TARGET_MASK) > 0;
    const sou = (step & SOURCE_MASK) > 0;
    let side = (step & SIDE_MASK) >> 5;
    side = side << quad;
    if (side > 0xf) side = side >> 4;
    const centre = (step & CENTER_MASK) > 0;

    if ((sou || tar) && side < 9) {
      const souTar = sou ? 0 : 1;
      let limit: number;
      if (centre && currentOrientation === 0) limit = geo[souTar]![0] + constraint[souTar]![0]! * geo[souTar]![2];
      else if (centre) limit = geo[souTar]![1] + constraint[souTar]![1]! * geo[souTar]![3];
      else limit = limits[souTar]![side]!;
      if (currentOrientation === 0) {
        const delta = (limit - current[0]) * direction[0];
        if (delta > 0) current[0] += direction[0] * delta;
      } else {
        const delta = (limit - current[1]) * direction[1];
        if (delta > 0) current[1] += direction[1] * delta;
      }
    } else if (centre) {
      // Vers le milieu de l'écart entre les deux formes.
      current[0] += direction[0] * Math.abs(separations[directionIndex]! / 2);
      current[1] += direction[1] * Math.abs(separations[directionIndex]! / 2);
    }

    if (currentIndex > 0 && current[currentOrientation] === wayPoints[currentIndex - 1]![currentOrientation])
      currentIndex--;
    else lastOrientation = currentOrientation;
  }

  for (let i = 0; i <= currentIndex; i++) {
    if (i === currentIndex) {
      // Le dernier point n'est gardé que si le nombre de coudes est cohérent avec les orientations
      // de départ et d'arrivée (paire si elles sont identiques, impaire sinon).
      const targetOrientation = (dir[1]! & (EAST | WEST)) > 0 ? 0 : 1;
      const sameOrient = targetOrientation === initialOrientation ? 0 : 1;
      if (sameOrient !== (currentIndex + 1) % 2) break;
    }
    result.push({ x: r10(wayPoints[i]![0]), y: r10(wayPoints[i]![1]) });
  }

  // Doublons retirés.
  let index = 1;
  while (index < result.length) {
    const a = result[index - 1];
    const b = result[index];
    if (!a || !b || a.x !== b.x || a.y !== b.y) index++;
    else result.splice(index, 1);
  }
};
