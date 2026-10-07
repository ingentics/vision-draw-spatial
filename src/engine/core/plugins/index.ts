/**
 * API des plugins (sujet 287) : le seul fichier du tronc qu'une forme, un mode ou un effet peut importer (règle de lint).
 * Il ne contient aucun code : il réexporte ce que le tronc offre aux plugins. Un plugin qui a besoin d'une autre brique
 * l'ajoute ici : c'est la décision d'en faire une brique commune, visible dans le diff. Ce qui héberge les plugins sans
 * leur être destiné (registres, écritures d'un mode, place prise par le schéma) n'y est pas.
 */

// Contrats : forme, mode, effet, réglages déclarés.
export type {
  PaletteEntry,
  SceneLevel,
  SceneRenderer,
  ShapeDefinition,
  ShapeDetail,
  ShapeDetailPath,
  ShapeDetailText,
  ShapeProperty,
} from '../shapes/types';
export type {
  ModeCurrentLook,
  ModeEdit,
  ModeHandle,
  ModeIssue,
  ModeKey,
  ModeObstacles,
  ModeParts,
  ModeProperty,
  ModeTarget,
  PageModeDefinition,
} from '../modes/types';
export type { PageEffectDefinition } from '../effects/types';
export type { PluginSetting, PluginValues } from '../settings/pluginSettings';
export { DEFAULT_MODE_PALETTE } from '../settings/derived';

// Modèle neutre, attributs spatiaux, calculs purs.
export type { EdgeModel, PageModel, Point, Rect, ShapeModel } from '../model/types';
export { SPATIAL, spatialNumber, spatialValue } from '../spatial';
export {
  ceilToGrid,
  center,
  insidePolygon,
  rectContains,
  rectContainsRect,
  rectsOverlap,
  unionOf,
} from '../model/geometry';
export { styleFlag, styleNumber, styleOpacity } from '../model/styleValues';

// Briques de dessin (Three.js) : rendu à plat et en volume, contours, traits, textes, couleurs.
export { PART_ORDER } from '../render/types';
export type { EdgeBadgeStyle, RenderContext } from '../render/types';
export { createBox, createLabel, flatBox, VERTEX_DEFAULTS } from '../render/flat/box';
export type { BoxDefaults } from '../render/flat/box';
export { blockHeight, isoBlock, TOP_OFFSET } from '../render/iso/block';
export { cubicTo, halfEllipseTo } from '../render/geometry/curves';
export { orientedPath } from '../render/geometry/orient';
export {
  cornerRadius,
  ellipsePath,
  polygonArc,
  rectPath,
  roundedPolygon,
  roundedRectPath,
} from '../render/geometry/paths';
export { dashPattern } from '../render/geometry/stroke';
export { edgeLines } from '../render/lines';
export { fillMesh, solidMaterial, strokeMesh } from '../render/meshes';
export { readableOn, styleColor } from '../render/styleColors';
export { measureText } from '../render/textMeasure';
export { stencilShape } from '../format/stencil';

// Règles d'édition partagées.
export { SIDE_NORMALS, sideOfConstraint } from '../edit/edgeEnds';
