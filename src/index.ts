/**
 * API publique de drawio-spatial (SPEC §3.2, §18) : le composant React, et le moteur pour qui veut
 * s'en passer. Tout le reste est interne.
 */

// Composant React
export { DrawioSpatial } from './react/DrawioSpatial';
export type { DrawioSpatialHandle, DrawioSpatialProps } from './react/DrawioSpatial';

// Moteur (sans React)
export { Engine } from './engine';
export type {
  BackTarget,
  EngineEvent,
  EngineEvents,
  EngineOptions,
  InitialView,
  LabelEditPlane,
  LabelEditRequest,
  ModeHint,
  Selection,
} from './engine';
export type { CameraState } from './engine';
export type { FontSet } from './engine';
export type { PickedElement } from './engine';

// Paramètres (SPEC §13)
export { DEFAULT_SETTINGS, mergeSettings } from './engine';
export type { Settings, SettingsPatch, ViewSettings } from './engine';

// Modèle neutre (SPEC §7.3) et format draw.io
export type {
  DocumentModel,
  EdgeModel,
  LayerModel,
  LinkModel,
  PageModel,
  ParseWarning,
  Point,
  Rect,
  ShapeModel,
} from './engine';
export { DrawioParseError, parseDrawio } from './engine';
export { createEmptyDrawio } from './engine';

// Bibliothèque de fichiers (SPEC §5)
export type { FileStore, StoredFile, StoredFileMeta, StoredFilePatch } from './engine';
export { IndexedDbStore } from './engine';
export { MemoryStore } from './engine';

// Édition et attributs spatiaux (SPEC §14)
export { SHAPE_TEMPLATES } from './engine';
export type { ShapeTemplate } from './engine';
export { SPATIAL, spatialNumber, spatialValue } from './engine';
