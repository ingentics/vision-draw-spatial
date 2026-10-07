import { ALIGN_REFERENCES } from '../../edit/align';
import { custom, flag, number, oneOf } from '../fields';
import type { Spec } from '../fields';
import type { PluginSettings } from '../pluginSettings';
import type { DebugSettings, EditSettings, PanelsSettings, SaveSettings } from '../types';

/** Schéma des réglages de l'espace de travail : édition, enregistrement, panneaux, exports, effets, modes, débogage. */

const STRIP_TEXT = ['up', 'down'] as const;

export const EDIT = {
  edgePickTolerance: number(6, { min: 1, max: 30, step: 1 }),
  handlePickTolerance: number(8, { min: 2, max: 30, step: 1 }),
  handleSize: number(4, { min: 2, max: 12, step: 0.5 }),
  minShapeSize: number(10, { min: 1, max: 100, step: 1 }),
  nudgeStep: number(1, { min: 1, max: 50, step: 1 }),
  nudgeCoarseStep: number(0, { min: 0, max: 100, step: 1 }),
  alignReference: oneOf(ALIGN_REFERENCES, 'last'),
  undoLimit: number(100, { min: 10, max: 1000, step: 10 }, { integer: true }),
  pasteOffset: number(10, { min: 0, max: 100, step: 1 }),
  edgePointAlignTolerance: number(4, { min: 0, max: 30, step: 1 }),
  connectHandleOffset: number(18, { min: 6, max: 60, step: 1 }),
  middleHandleMinSpan: number(32, { min: 0, max: 120, step: 1 }),
} satisfies Spec<EditSettings>;

export const SAVE = {
  autosave: flag(true),
  delayMs: number(1000, { min: 300, max: 30000, step: 100 }),
  viewStateDelayMs: number(500, { min: 100, max: 5000, step: 100 }),
  recentLimit: number(20, { min: 5, max: 100, step: 1 }, { integer: true }),
} satisfies Spec<SaveSettings>;

export const DEBUG = {
  showUnsupportedPanel: flag(true),
} satisfies Spec<DebugSettings>;

export const PANELS = {
  left: {
    collapsed: flag(false),
    width: number(208, { min: 160, max: 400, step: 16 }, { integer: true }),
  },
  right: {
    collapsed: flag(false),
    width: number(380, { min: 240, max: 600, step: 16 }, { integer: true }),
  },
  stripText: oneOf(STRIP_TEXT, 'up'),
  shadow: number(0.06, { min: 0, max: 0.3, step: 0.01 }),
  minCanvas: number(320, { min: 200, max: 800, step: 10 }, { integer: true }),
} satisfies Spec<PanelsSettings>;

/**
 * Réglages des plugins (effets, sujet 145 ; modes, ticket 283) fusionnés plugin par plugin : un nombre fini, un booléen
 * ou une chaîne remplace, undefined retire (retour au défaut). Le type attendu par chaque réglage est vérifié par le
 * registre du plugin (`readPluginSetting`).
 */
function mergePluginSettings(patch: unknown, base: PluginSettings): PluginSettings {
  const changesById = (patch ?? {}) as Record<string, unknown>;
  const result: PluginSettings = {};
  for (const id of new Set([...Object.keys(base), ...Object.keys(changesById)])) {
    const values = { ...base[id] };
    const changes = changesById[id];
    if (changes && typeof changes === 'object') {
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) delete values[key];
        else if (
          (typeof value === 'number' && Number.isFinite(value)) ||
          typeof value === 'boolean' ||
          typeof value === 'string'
        )
          values[key] = value;
      }
    }
    if (Object.keys(values).length > 0) result[id] = values;
  }
  return result;
}

export const EFFECTS = custom<PluginSettings>({}, mergePluginSettings) satisfies Spec<PluginSettings>;

export const MODES = custom<PluginSettings>({}, mergePluginSettings) satisfies Spec<PluginSettings>;
