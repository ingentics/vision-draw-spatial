import { ALIGN_REFERENCES } from '../../edit/align';
import type {
  DebugSettings,
  EditSettings,
  EffectSettings,
  ExporterSettings,
  PanelsSettings,
  SaveSettings,
  SettingsPatch,
} from '../types';
import { bool, num, oneOf, serverUrl } from '../validate';

/** Fusion des réglages de l'espace de travail : édition, enregistrement, panneaux, exports, effets, débogage. */

const STRIP_TEXT = ['up', 'down'] as const;
const PLANTUML_RENDERERS = ['kroki', 'plantuml', 'local'] as const;

export function mergeEdit(base: EditSettings, patch: SettingsPatch['edit']): EditSettings {
  const p = patch ?? {};
  return {
    edgePickTolerance: num('edit.edgePickTolerance', p.edgePickTolerance, base.edgePickTolerance),
    handlePickTolerance: num('edit.handlePickTolerance', p.handlePickTolerance, base.handlePickTolerance),
    handleSize: num('edit.handleSize', p.handleSize, base.handleSize),
    minShapeSize: num('edit.minShapeSize', p.minShapeSize, base.minShapeSize),
    nudgeStep: num('edit.nudgeStep', p.nudgeStep, base.nudgeStep),
    nudgeCoarseStep: num('edit.nudgeCoarseStep', p.nudgeCoarseStep, base.nudgeCoarseStep),
    alignReference: oneOf(ALIGN_REFERENCES, p.alignReference, base.alignReference),
    undoLimit: Math.round(num('edit.undoLimit', p.undoLimit, base.undoLimit)),
    pasteOffset: num('edit.pasteOffset', p.pasteOffset, base.pasteOffset),
    edgePointAlignTolerance: num(
      'edit.edgePointAlignTolerance',
      p.edgePointAlignTolerance,
      base.edgePointAlignTolerance,
    ),
    connectHandleOffset: num('edit.connectHandleOffset', p.connectHandleOffset, base.connectHandleOffset),
    middleHandleMinSpan: num('edit.middleHandleMinSpan', p.middleHandleMinSpan, base.middleHandleMinSpan),
  };
}

export function mergeSave(base: SaveSettings, patch: SettingsPatch['save']): SaveSettings {
  const p = patch ?? {};
  return {
    autosave: bool(p.autosave, base.autosave),
    delayMs: num('save.delayMs', p.delayMs, base.delayMs),
    viewStateDelayMs: num('save.viewStateDelayMs', p.viewStateDelayMs, base.viewStateDelayMs),
    recentLimit: Math.round(num('save.recentLimit', p.recentLimit, base.recentLimit)),
  };
}

export function mergeDebug(base: DebugSettings, patch: SettingsPatch['debug']): DebugSettings {
  const p = patch ?? {};
  return { showUnsupportedPanel: bool(p.showUnsupportedPanel, base.showUnsupportedPanel) };
}

export function mergePanels(base: PanelsSettings, patch: SettingsPatch['panels']): PanelsSettings {
  const p = patch ?? {};
  return {
    left: {
      collapsed: bool(p.left?.collapsed, base.left.collapsed),
      width: Math.round(num('panels.left.width', p.left?.width, base.left.width)),
    },
    right: {
      collapsed: bool(p.right?.collapsed, base.right.collapsed),
      width: Math.round(num('panels.right.width', p.right?.width, base.right.width)),
    },
    stripText: oneOf(STRIP_TEXT, p.stripText, base.stripText),
    shadow: num('panels.shadow', p.shadow, base.shadow),
    minCanvas: Math.round(num('panels.minCanvas', p.minCanvas, base.minCanvas)),
  };
}

export function mergeExporters(base: ExporterSettings, patch: SettingsPatch['exporters']): ExporterSettings {
  const p = patch ?? {};
  return {
    plantuml: {
      renderer: oneOf(PLANTUML_RENDERERS, p.plantuml?.renderer, base.plantuml.renderer),
      localUrl: serverUrl(p.plantuml?.localUrl, base.plantuml.localUrl),
    },
  };
}

/** Réglages des effets fusionnés, effet par effet : un nombre fini remplace, undefined retire (retour au défaut). */
export function mergeEffects(base: EffectSettings, patch: SettingsPatch['effects']): EffectSettings {
  const result: EffectSettings = {};
  for (const id of new Set([...Object.keys(base), ...Object.keys(patch ?? {})])) {
    const values = { ...base[id] };
    const changes = patch?.[id];
    if (changes && typeof changes === 'object') {
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined) delete values[key];
        else if (typeof value === 'number' && Number.isFinite(value)) values[key] = value;
      }
    }
    if (Object.keys(values).length > 0) result[id] = values;
  }
  return result;
}
