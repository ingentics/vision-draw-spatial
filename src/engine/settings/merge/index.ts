import type { Settings, SettingsPatch } from '../types';
import { mergeAccessibility, mergeControls, mergePreload, mergeTransition } from './navigation';
import { mergeShapes, mergeStyles } from './shapes';
import {
  mergeBackground,
  mergeCamera,
  mergeComment,
  mergeGraph,
  mergeMinimap,
  mergeSelection,
  mergeView,
} from './view';
import { mergeDebug, mergeEdit, mergeEffects, mergeExporters, mergePanels, mergeSave } from './workspace';

/**
 * Fusionne une modification dans des paramètres. Les valeurs invalides (mauvais type, hors liste)
 * sont ignorées, les nombres sont ramenés dans leurs bornes : un stockage abîmé ou ancien ne peut
 * pas casser l'application.
 */
export function mergeSettings(base: Settings, patch: SettingsPatch | undefined): Settings {
  const p = patch ?? {};
  return {
    transition: mergeTransition(base.transition, p.transition),
    preload: mergePreload(base.preload, p.preload),
    controls: mergeControls(base.controls, p.controls),
    view: mergeView(base.view, p.view),
    camera: mergeCamera(base.camera, p.camera),
    background: mergeBackground(base.background, p.background),
    minimap: mergeMinimap(base.minimap, p.minimap),
    comment: mergeComment(base.comment, p.comment),
    selection: mergeSelection(base.selection, p.selection),
    shapes: mergeShapes(base.shapes, p.shapes),
    styles: mergeStyles(base.styles, p.styles),
    graph: mergeGraph(base.graph, p.graph),
    edit: mergeEdit(base.edit, p.edit),
    save: mergeSave(base.save, p.save),
    debug: mergeDebug(base.debug, p.debug),
    accessibility: mergeAccessibility(base.accessibility, p.accessibility),
    panels: mergePanels(base.panels, p.panels),
    exporters: mergeExporters(base.exporters, p.exporters),
    effects: mergeEffects(base.effects, p.effects),
  };
}
