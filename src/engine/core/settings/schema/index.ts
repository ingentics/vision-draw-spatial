import type { Spec } from '../fields';
import type { Settings } from '../types';
import { ACCESSIBILITY, CONTROLS, PRELOAD, TRANSITION } from './navigation';
import { SHAPES, STYLES } from './shapes';
import { BACKGROUND, CAMERA, COMMENT, GRAPH, MINIMAP, orderedZooms, SELECTION, VIEW } from './view';
import { DEBUG, EDIT, EFFECTS, MODES, PANELS, SAVE } from './workspace';

/**
 * Schéma des paramètres (SPEC §13) : pour chaque réglage, sa valeur par défaut, ses bornes et sa lecture. Les
 * valeurs par défaut, les bornes et la fusion en découlent (`fromSchema.ts`). Les clés sont celles des réglages
 * enregistrés des utilisateurs : ne jamais en renommer une.
 */
export const SETTINGS_SCHEMA = {
  transition: TRANSITION,
  preload: PRELOAD,
  controls: CONTROLS,
  view: VIEW,
  camera: CAMERA,
  background: BACKGROUND,
  minimap: MINIMAP,
  comment: COMMENT,
  selection: SELECTION,
  shapes: SHAPES,
  styles: STYLES,
  graph: GRAPH,
  edit: EDIT,
  save: SAVE,
  debug: DEBUG,
  accessibility: ACCESSIBILITY,
  panels: PANELS,
  effects: EFFECTS,
  modes: MODES,
} satisfies { readonly [K in keyof Settings]-?: Spec<Settings[K]> };

/** Règles entre plusieurs réglages d'une section, appliquées après la lecture de chacun. */
export const SECTION_FIXES: { readonly [K in keyof Settings]?: (section: Settings[K]) => Settings[K] } = {
  camera: orderedZooms,
};
