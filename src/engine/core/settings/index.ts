/**
 * Paramètres de l'expérience (SPEC §13) : tout ce qui touche au ressenti est réglable, avec des
 * valeurs par défaut agréables. Objet sérialisable, fusionnable par morceaux, valeurs bornées.
 */

export { DEFAULT_MODE_PALETTE, modePalette, resolveReducedMotion, settingsSectionChanged } from './derived';
export { DEFAULT_SETTINGS, mergeSettings, SETTINGS_LIMITS } from './fromSchema';
export { pluginValues, readPluginSetting } from './pluginSettings';
export type { PluginSetting, PluginSettings, PluginSettingValue, PluginValues } from './pluginSettings';
export type {
  AccessibilitySettings,
  BackgroundSettings,
  CameraSettings,
  CommentSettings,
  DebugSettings,
  EditSettings,
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
