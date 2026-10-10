import type { ComponentType } from 'react';
import type { ExporterSettings, ModeEdit, PageModel, PageTakeover, PluginValues } from '../../../engine';

/**
 * Prise en main de la page affichée par un mode (sujet 467), remise aux parties appli des modes : les briques du
 * moteur (verrou d'édition, capture des entrées, couche, caméra), la sélection, et le détenteur du verrou.
 */
export interface ModePageControls {
  takeover: PageTakeover;
  /** Éléments sélectionnés sur la page (ex. départ d'un parcours pas à pas). */
  selection: readonly string[];
  /** Détenteur du verrou d'édition (celui passé à `lockEditing`) ; undefined sans verrou. */
  lockOwner: object | undefined;
}

/** Sections React d'un mode, reçues par le panneau contextuel. */
export interface ModePanelProps {
  page: PageModel;
  /** Opération du mode sur la page (une étape d'annulation) ; absent si la page n'est pas modifiable. */
  onEdit?: (label: string, edit: (edit: ModeEdit) => void) => void;
  /** « Courant » du mode sur la page (ex. flux courant), gardé par le moteur. */
  current?: string;
  /** Réglages globaux du mode (Paramètres › Modes), bornés. */
  values: PluginValues;
  /** Moteurs de rendu des exports (paramètres de l'appli, Exporteurs ; ex. PlantUML, sujet 439). */
  exporters: ExporterSettings;
  /** Prise en main de la page (absente hors de la page affichée). */
  controls?: ModePageControls;
}

/** Ce que reçoit la couche d'un mode posée sur la zone de dessin. */
export interface ModeCanvasProps {
  page: PageModel;
  controls: ModePageControls;
}

/**
 * Partie appli d'un mode de page (sujet 69), en miroir de `src/engine/plugins/modes/<id>/` : des sections du panneau
 * (et une couche sur la zone de dessin), qui affichent les données du mode et appellent ses opérations, sans règle
 * métier. Facultative : un mode aux réglages simples les déclare dans sa définition, affichés par des champs génériques
 * (`ModeFields`).
 */
export interface ModePanel {
  /** Section du panneau de la page (rien de sélectionné). */
  PageSection?: ComponentType<ModePanelProps>;
  /** Couche posée sur la zone de dessin d'une page du mode (ex. barre du parcours pas à pas des états, sujet 462). */
  CanvasOverlay?: ComponentType<ModeCanvasProps>;
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
