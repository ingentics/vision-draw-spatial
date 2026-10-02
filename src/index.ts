/**
 * API publique de drawio-spatial (SPEC §3.2, §18) : le composant React, et le moteur pour qui veut
 * s'en passer. Tout le reste est interne.
 */

// Composant React
export { DrawioSpatial } from './react/DrawioSpatial';
export type { DrawioSpatialHandle, DrawioSpatialProps } from './react/DrawioSpatial';

// Moteur (sans React)
export { Engine } from './engine/Engine';
export type {
  BackTarget,
  EngineEvent,
  EngineEvents,
  EngineOptions,
  InitialView,
  LabelEditRequest,
  Selection,
} from './engine/Engine';
export type { CameraState } from './engine/interaction/camera';
export type { FontSet } from './engine/render/troikaText';
export type { PickedElement } from './engine/interaction/pick';

// Paramètres (SPEC §13)
export { DEFAULT_SETTINGS, mergeSettings } from './engine/settings';
export type { Settings, SettingsPatch, ViewSettings } from './engine/settings';

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
} from './engine/model/types';
export { DrawioParseError, parseDrawio } from './engine/format/parse';
export { createEmptyDrawio } from './engine/format/skeleton';

// Bibliothèque de fichiers (SPEC §5)
export type { FileStore, StoredFile, StoredFileMeta, StoredFilePatch } from './engine/persistence/FileStore';
export { IndexedDbStore } from './engine/persistence/IndexedDbStore';
export { MemoryStore } from './engine/persistence/MemoryStore';

// Édition et attributs spatiaux (SPEC §14)
export { SHAPE_TEMPLATES } from './engine/edit/palette';
export type { ShapeTemplate } from './engine/edit/palette';
export { SPATIAL, spatialNumber, spatialValue } from './engine/spatial';
