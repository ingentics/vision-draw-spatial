/**
 * API des plugins (sujet 287) : le seul fichier du tronc qu'une forme, un mode ou un effet peut importer (règle de lint).
 * Il ne contient aucun code : il réexporte ce que le tronc offre aux plugins. Un plugin qui a besoin d'une autre brique
 * l'ajoute ici : c'est la décision d'en faire une brique commune, visible dans le diff. Ce qui héberge les plugins sans
 * leur être destiné (registres, écritures d'un mode, place prise par le schéma) n'y est pas.
 */

// Contrats : forme, mode, effet, réglages déclarés.
export type {
  MinimapBrush,
  MinimapMapping,
  PaletteCategory,
  PaletteEntry,
  SceneLevel,
  SceneRenderer,
  ShapeCategory,
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
export type { EffectLight, PageEffectDefinition } from '../effects/types';
export { modeKeys } from '../modes/modeKeys';
export { edgeTarget, onlyWhen, shapeTarget } from '../modes/modeTargets';
export { isToggled, toggleValue } from '../modes/modeProperties';
export type { ModeKeys } from '../modes/modeKeys';
export type { PluginSetting, PluginValues } from '../settings/pluginSettings';
export { booleanValue, numberValue, stringValue } from '../settings/pluginSettings';
export { DEFAULT_MODE_PALETTE } from '../settings/derived';

// Modèle neutre, attributs spatiaux, calculs purs.
export type { Point, Rect } from '../model/types';
// Modèle en lecture seule (sujet 303) : un plugin lit la page, il n'écrit que par `ModeEdit`.
export type {
  ReadonlyEdgeModel as EdgeModel,
  ReadonlyPageModel as PageModel,
  ReadonlyShapeModel as ShapeModel,
} from '../model/readonly';
export { jsonListValue, readJsonList, SPATIAL, spatialFlag, spatialNumber, spatialValue } from '../spatial';
export { elementName, firstFreeName } from '../model/names';
export { clamp } from '../model/numbers';
export { edgeEnds, shapesById } from '../model/pageIndex';
export {
  boundsOfPoints,
  ceilToGrid,
  center,
  inflate,
  insidePolygon,
  rectContains,
  rectContainsRect,
  rectDistance,
  rectsOverlap,
  unionOf,
} from '../model/geometry';
export { sideConstraintAt } from '../edit/edgeEnds';
export { fontStyleValue, isHexColor, styleFlag, styleNumber, styleOpacity } from '../model/styleValues';

// Briques de dessin (Three.js) : rendu à plat et en volume, contours, traits, textes, couleurs.
export { PART_ORDER } from '../render/types';
export type { EdgeBadgeStyle, RenderContext } from '../render/types';
export { createBox, createLabel, flatBox, labelObject, VERTEX_DEFAULTS } from '../render/flat/box';
export type { BoxDefaults, LabelOptions } from '../render/flat/box';
export { blockHeight, isoBlock, TOP_OFFSET } from '../render/iso/block';
export { cubicTo, halfEllipseTo } from '../render/geometry/curves';
export { orientation, orientedPath } from '../render/geometry/orient';
export type { Orientation } from '../render/geometry/orient';
export {
  arcPath,
  boxOutline,
  cornerRadius,
  ellipsePath,
  polygonArc,
  rectPath,
  roundedPolygon,
  roundedRectPath,
  sizeOffset,
} from '../render/geometry/paths';
export { dashPattern } from '../render/geometry/stroke';
export { edgeLines } from '../render/lines';
export { fillMesh, solidMaterial, strokeMesh } from '../render/meshes';
export { DRAWIO_STYLES, drawioStyle } from '../edit/stylePresets';
export type { StylePreset } from '../edit/stylePresets';
export { darken, lighten, shade } from '../render/decorations';
export { readableOn, styleColor, styleStroke } from '../render/styleColors';
export type { StyleStroke } from '../render/styleColors';
export { measureText } from '../render/textMeasure';
export { setStandingFigure } from '../render/standing';
export type { StandingFigure } from '../render/standing';
export { stencilShape } from '../format/stencil';

// Règles d'édition partagées.
export { SIDE_NORMALS, endAttachmentOf, sideOfConstraint } from '../edit/edgeEnds';
export type { EndAttachment } from '../edit/edgeEnds';
export { facingSide } from '../edit/anchoring/auto/distribute';
