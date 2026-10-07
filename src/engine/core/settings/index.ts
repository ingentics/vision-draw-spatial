/**
 * Paramètres de l'expérience (SPEC §13) : tout ce qui touche au ressenti est réglable, avec des
 * valeurs par défaut agréables. Objet sérialisable, fusionnable par morceaux, valeurs bornées.
 */

export { modePalette, resolveReducedMotion, settingsSectionChanged } from './derived';
export { DEFAULT_SETTINGS, mergeSettings, SETTINGS_LIMITS } from './fromSchema';
export type {
  AccessibilitySettings,
  BackgroundSettings,
  CameraSettings,
  CommentSettings,
  DebugSettings,
  EditSettings,
  EffectSettings,
  ExporterSettings,
  ModeSettings,
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
