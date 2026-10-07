/**
 * Point d'entrée du moteur pour l'interface (`src/app/`, `src/react/`) et l'API de la bibliothèque (`src/index.ts`) :
 * ils n'importent rien d'autre du moteur (règle de lint), ses fichiers internes peuvent donc bouger librement.
 */

// Moteur (SPEC §4.3)
export { Engine } from './Engine';
export type {
  BackTarget,
  CommentEditRequest,
  EdgeTextAnchor,
  EngineEvent,
  EngineEvents,
  EngineOptions,
  InitialView,
  LabelEditPlane,
  LabelEditRequest,
  ModeHandleMenu,
  ModeHint,
  ModeIndicator,
  Selection,
} from './Engine';

// Paramètres (SPEC §13)
export { DEFAULT_SETTINGS, mergeSettings, modePalette, SETTINGS_LIMITS } from './settings';
export type {
  BackgroundSettings,
  CommentSettings,
  ExporterSettings,
  PanelsSettings,
  Settings,
  SettingsPatch,
  SidePanelSettings,
  StyleSettings,
  ViewSettings,
} from './settings';

// Modèle neutre (SPEC §7.3), format draw.io, attributs spatiaux
export type { UnsupportedCategory, UnsupportedReport } from './diagnostics/unsupportedStyles';
export type { OrderMove } from './format/order';
export { DrawioParseError, parseDrawio } from './format/parse';
export { isMonospace, isRich, parseColor, parseRichHtml, richToHtml, richToText } from './format/richText';
export { createEmptyDrawio } from './format/skeleton';
export { GRAPH_PAGE_ID } from './graph/graphPage';
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
  TextMarks,
} from './model/types';
export { DEFAULT_DEPTH, LEGACY_DEFAULT_DEPTH, SPATIAL, SPATIAL_PREFIX, spatialNumber, spatialValue } from './spatial';

// Bibliothèque de fichiers et sauvegarde (SPEC §5, §14.1)
export { Autosaver } from './persistence/Autosaver';
export type { FileStore, StoredFile, StoredFileMeta, StoredFilePatch } from './persistence/FileStore';
export { FsStore, isFilePath } from './persistence/FsStore';
export type { FileSystemAccess } from './persistence/FsStore';
export { IndexedDbStore } from './persistence/IndexedDbStore';
export { MemoryStore } from './persistence/MemoryStore';

// Édition (SPEC §14)
export type { AlignMove, AlignReference, DistributeMove } from './edit/align';
export { isAnchoring } from './edit/anchoring/mode';
export type { Anchoring } from './edit/anchoring/mode';
export { commentOf } from './edit/comment';
export type { ElementComment } from './edit/comment';
export { anchorOf, edgeTexts, endLabelOf } from './edit/edgeLabels';
export type { EdgeEnd } from './edit/edgeLabels';
export { LABEL_PLACES, labelPlaceName, labelPlaceOf, labelPlacePatch } from './edit/labelPlaces';
export type { LabelPlace } from './edit/labelPlaces';
export { PALETTE_CATEGORIES, searchTemplates, SHAPE_TEMPLATES, usedTemplates } from './edit/palette';
export type { PageModePalette, PaletteCategory, PaletteCategoryId, ShapeTemplate } from './edit/palette';
export { matchesPreset, matchesTextPreset } from './edit/stylePresets';
export type { StylePreset, TextPreset } from './edit/stylePresets';

// Caméra, navigation et sélection (SPEC §9–11)
export { ISOMETRIC_ELEVATION_DEG } from './interaction/cameraMath';
export type { CameraState, ViewMode } from './interaction/cameraMath';
export { RESERVED_CODES } from './interaction/controls';
export type { Shortcuts } from './interaction/controls';
export type { ParentLink } from './interaction/navigationHistory';
export type { PickedElement } from './interaction/pick';
export type { FollowLinkGesture, FollowLinkKey, MultiSelectKey } from './interaction/selectionRules';

// Rendu (SPEC §8)
export { JUMP_STYLES, jumpValue } from './render/edges/jumps';
export type { JumpStyle } from './render/edges/jumps';
export { routingKind } from './render/edges/route';
export { homographyCss, rectToQuad } from './render/geometry/homography';
export { labelPadding } from './render/labelPosition';
export { largestFitting, MIN_FIT_SIZE } from './render/richLayout';
export { readableOn } from './render/styleColors';
export type { FontSet } from './render/troikaText';

// Formes, modes et effets de page
export { defaultEffectRegistry, pageEffectIds } from './effects/registry';
export { defaultModeRegistry } from './modes/registry';
export type { ModeScope } from './modes/registry';
export { SEQUENCE_EXPORTERS } from './modes/sequences/export';
export type { SequenceExporter } from './modes/sequences/export';
export type { Flow } from './modes/sequences/flows';
export { addFlow, removeFlow, renameFlow, sequenceState } from './modes/sequences/steps';
export type { ModeEdit, ModeProperty, ModeTarget, PageModeDefinition } from './modes/types';
export { defaultShapeRegistry } from './shapes/registry';
export type { PropertySection, ShapeProperty } from './shapes/types';
