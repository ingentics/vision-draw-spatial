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
  ModeHint,
  ModeIndicator,
  ModePropertyView,
  Selection,
} from './core/domains/types';
export type { ImageExportOptions } from './core/domains/view/imageExport';
export { PLANTUML_FORMAT } from './core/export/plantumlText';

// Paramètres (SPEC §13)
export { DEFAULT_SETTINGS, mergeSettings, modePalette, SETTINGS_LIMITS } from './core/settings';
export type {
  BackgroundSettings,
  CommentSettings,
  ExporterSettings,
  GraphSettings,
  MinimapSettings,
  MinigraphSettings,
  PanelsSettings,
  SelectionSettings,
  Settings,
  SettingsPatch,
  ShapeSettings,
  SidePanelSettings,
  StyleSettings,
  TransitionSettings,
  ViewSettings,
} from './core/settings';

// Modèle neutre (SPEC §7.3), format draw.io, attributs spatiaux
export type { UnsupportedCategory, UnsupportedReport } from './core/diagnostics/unsupportedStyles';
export type { EngineMetrics, FrameStats } from './core/domains/runtime/metrics';
export type { OrderMove } from './core/format/order';
export { DrawioParseError, parseDrawio } from './core/format/parse';
export { isMonospace, isRich, parseColor, parseRichHtml, richToHtml, richToText } from './core/format/richText';
export { createEmptyDrawio } from './core/format/skeleton';
export { GRAPH_PAGE_ID, LABEL_GAP, LABEL_HEIGHT, LABEL_WIDTH, STATUS_HEIGHT } from './core/graph/graphPage';
export type { MiniGraph, MiniGraphLink, MiniGraphNode } from './core/graph/miniGraph';
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
} from './core/model/types';
export { DEFAULT_DEPTH, SPATIAL, SPATIAL_PREFIX, spatialNumber, spatialValue } from './core/spatial';
export { boundsOfPoints, distance, inflate } from './core/model/geometry';
export {
  fitTextMode,
  fontStyleBits,
  fontStyleValue,
  isHexColor,
  styleFlag,
  styleNumber,
} from './core/model/styleValues';

// Bibliothèque de fichiers et sauvegarde (SPEC §5, §14.1)
export { Autosaver } from './core/persistence/Autosaver';
export type { DiskFile, FileStore, StoredFile, StoredFileMeta, StoredFilePatch } from './core/persistence/FileStore';
export { FsStore, isFilePath } from './core/persistence/FsStore';
export type { FileSystemAccess } from './core/persistence/FsStore';
export { IndexedDbStore } from './core/persistence/IndexedDbStore';
export { MemoryStore } from './core/persistence/MemoryStore';

// Édition (SPEC §14)
export type { AlignMove, AlignReference, DistributeMove } from './core/edit/align';
export {
  ANCHORINGS,
  edgeLinePatch,
  edgeLinesOf,
  edgeLinesOfEdge,
  isAnchoring,
  pageAnchoring,
} from './core/edit/anchoring/mode';
export type { Anchoring, EdgeLine } from './core/edit/anchoring/mode';
export { commentOf } from './core/edit/comment';
export type { ElementComment } from './core/edit/comment';
export { anchorOf, edgeTextLayout, edgeTexts, endLabelOf } from './core/edit/edgeLabels';
export type { EdgeEnd } from './core/edit/edgeLabels';
export { LABEL_PLACES, labelPlaceName, labelPlaceOf, labelPlacePatch } from './core/edit/labelPlaces';
export type { LabelPlace } from './core/edit/labelPlaces';
export { loopWaypoints } from './core/edit/loops';
export { searchTemplates } from './core/edit/palette';
export type { PageModePalette, PaletteCategory, PaletteCategoryId, ShapeTemplate } from './core/edit/palette';
export { matchesPreset, matchesTextPreset } from './core/edit/stylePresets';
export type { StylePreset, TextPreset } from './core/edit/stylePresets';

// Caméra, navigation et sélection (SPEC §9–11)
export { ISOMETRIC_ELEVATION_DEG } from './core/interaction/cameraState';
export type { CameraState, ViewMode } from './core/interaction/cameraState';
export { RESERVED_CODES } from './core/interaction/controls';
export type { Shortcuts } from './core/interaction/controls';
export type { ParentLink } from './core/interaction/navigationHistory';
export type { PickedElement } from './core/interaction/pick';
export { easing } from './core/interaction/transitionMath';
export type { FollowLinkGesture, FollowLinkKey, MultiSelectKey } from './core/interaction/selectionRules';

// Rendu (SPEC §8)
export { JUMP_STYLES, jumpHalfLength, jumpValue, withJumps } from './core/render/edges/jumps';
export type { JumpStyle } from './core/render/edges/jumps';
export { routingKind } from './core/render/edges/route';
export { isBlockArrow } from './core/render/edges/blockArrow';
export { splitLabelFrame, splitPieces } from './core/render/edges/split';
export { homographyCss, rectToQuad } from './core/render/geometry/homography';
export { labelPadding } from './core/render/labelPosition';
export { largestFitting, maxFillSize, MIN_FILL_SIZE, MIN_FIT_SIZE } from './core/render/richLayout';
export { readableOn } from './core/render/styleColors';
export type { FontSet } from './core/render/troikaText';

// Formes, modes et effets de page
export { pageEffectIds } from './core/effects/registry';
export type { EffectInfo, EffectRegistryView, PageEffectRegistry } from './core/effects/registry';
export { isToggled, toggleValue } from './core/modes/modeProperties';
export type { ModeInfo, ModeRegistryView, ModeScope, PageModeRegistry } from './core/modes/registry';
export type { ShapeOrientable, ShapeRegistry, ShapeRegistryView } from './core/shapes/registry';
export type { OrientAction } from './core/edit/orientShapes';
export type { ModeEdit } from './core/modes/modeEdit';
export type {
  EditLock,
  InputCapture,
  OverlayLayer,
  OverlayScene,
  PageOverlay,
  PageTakeover,
} from './core/modes/pageTakeover';
export type { ModeProperty } from './core/modes/modeProperty';
export type { Field, FieldOption, FieldValue } from './core/fields/fieldSchema';
export { choiceDisplay } from './core/fields/fieldSchema';
export type { ModeTarget, PageModeDefinition } from './core/modes/types';
export type { PluginSetting, PluginSettings, PluginValues } from './core/settings/pluginSettings';
export { legacyShapeCategorySettings, SHAPE_TEMPLATES } from './plugins';
export type { PropertySection, ShapeProperty } from './core/shapes/types';
