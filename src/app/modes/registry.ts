import type { ComponentType } from 'react';
import type { ExporterSettings, ModeEdit, PageModel } from '../../engine';

/** Sections React d'un mode, reçues par le panneau contextuel. */
export interface ModePanelProps {
  page: PageModel;
  /** Opération du mode sur la page (une étape d'annulation) ; absent si la page n'est pas modifiable. */
  onEdit?: (label: string, edit: (edit: ModeEdit) => void) => void;
  /** « Courant » du mode sur la page (ex. flux courant), gardé par le moteur. */
  current?: string;
  /** Réglages des exporteurs (paramètres de l'appli). */
  exporters: ExporterSettings;
}

/**
 * Partie appli d'un mode de page (sujet 69), en miroir de `src/engine/modes/<id>/` : seulement des sections du
 * panneau, qui affichent les données du mode et appellent ses opérations, sans règle métier. Facultative : un mode
 * aux réglages simples les déclare dans sa définition, affichés par des champs génériques (`ModeFields`).
 */
export interface ModePanel {
  /** Section du panneau de la page (rien de sélectionné). */
  PageSection?: ComponentType<ModePanelProps>;
}

/** Une partie appli par dossier `modes/<id>/index.tsx` (qui exporte `panel`), rangée par id du mode (nom du dossier). */
const PANELS = new Map(
  Object.entries(import.meta.glob<ModePanel>('./*/index.tsx', { eager: true, import: 'panel' })).map(
    ([path, panel]) => [path.split('/').at(-2)!, panel] as const,
  ),
);

export function modePanel(modeId: string | undefined): ModePanel | undefined {
  return modeId === undefined ? undefined : PANELS.get(modeId);
}
