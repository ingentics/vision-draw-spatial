/**
 * Paramètres de l'expérience (SPEC §13) : tout ce qui touche au ressenti est réglable, avec des
 * valeurs par défaut agréables. Objet sérialisable, fusionnable par morceaux, valeurs bornées.
 */

export { DEFAULT_SETTINGS } from './defaults';
export { modePalette, resolveReducedMotion, settingsSectionChanged } from './derived';
export { SETTINGS_LIMITS } from './limits';
export { mergeSettings } from './merge';
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
} from './types';
