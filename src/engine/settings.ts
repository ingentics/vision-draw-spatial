/**
 * Paramètres de l'expérience (SPEC §13) : tout ce qui touche au ressenti est réglable, avec des
 * valeurs par défaut agréables. Objet sérialisable, fusionnable par morceaux, valeurs bornées.
 */

export { DEFAULT_SETTINGS } from './settings/defaults';
export { modePalette, resolveReducedMotion } from './settings/derived';
export { SETTINGS_LIMITS } from './settings/limits';
export { mergeSettings } from './settings/merge';
export type {
  AccessibilitySettings,
  BackgroundSettings,
  CameraSettings,
  CommentSettings,
  DebugSettings,
  EditSettings,
  EffectSettings,
  ExporterSettings,
  GraphSettings,
  MinimapSettings,
  PanelsSettings,
  PlantUmlRenderer,
  PreloadSettings,
  SaveSettings,
  SelectionSettings,
  Settings,
  SettingsPatch,
  ShapeSettings,
  SidePanelSettings,
  StyleSettings,
  TransitionSettings,
  ViewSettings,
} from './settings/types';
