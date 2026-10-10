import type { ComponentType } from 'react';
import type {
  ExporterSettings,
  ModeEdit,
  PageModel,
  PluginValues,
  SimulationFrame,
  SimulationHandlers,
} from '../../../engine';

/**
 * Simulation du moteur sur la page affichée (sujet 461), remise aux parties appli des modes : la sélection au moment
 * du départ, l'objet de la simulation ouverte et de quoi la piloter.
 */
export interface ModeSimulationControls {
  /** Éléments sélectionnés sur la page (départ d'une simulation). */
  selection: readonly string[];
  /** Objet de la simulation ouverte (celui passé à `open`) ; undefined sans simulation. */
  owner: object | undefined;
  open(owner: object, handlers: SimulationHandlers): boolean;
  show(frame: SimulationFrame): void;
  close(): void;
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
  /** Simulation sur la page (absente hors de la page affichée). */
  simulation?: ModeSimulationControls;
}

/** Ce que reçoit la couche d'un mode posée sur la zone de dessin. */
export interface ModeCanvasProps {
  page: PageModel;
  simulation: ModeSimulationControls;
}

/**
 * Partie appli d'un mode de page (sujet 69), en miroir de `src/engine/plugins/modes/<id>/` : des sections du panneau
 * (et une couche sur la zone de dessin), qui affichent les données du mode et appellent ses opérations, sans règle métier. Facultative : un mode
 * aux réglages simples les déclare dans sa définition, affichés par des champs génériques (`ModeFields`).
 */
export interface ModePanel {
  /** Section du panneau de la page (rien de sélectionné). */
  PageSection?: ComponentType<ModePanelProps>;
  /** Couche posée sur la zone de dessin d'une page du mode (ex. barre de la simulation, sujet 462). */
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
