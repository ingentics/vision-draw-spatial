import type { Settings, SettingsPatch } from '../../engine';

/** Ce que reçoit une section des paramètres : les paramètres en vigueur et l'écriture d'une modification. */
export interface SettingsSectionProps {
  settings: Settings;
  onChange: (patch: SettingsPatch) => void;
}
