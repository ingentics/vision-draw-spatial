import { CameraController } from '../../interaction/controls';
import type { EngineCore } from '../EngineCore';

/** Contrôles du canvas (souris, clavier, gestes) branchés sur le moteur. */
export function createCameraController(core: EngineCore): CameraController {
  return new CameraController(
    core.canvas,
    {
      getCameraState: () => core.camera.state,
      setCameraState: (state) => core.camera.setCameraState(state),
      getViewport: () => core.display.viewport,
      getCameraLimits: () => core.camera.limits,
      toggleOverview: (screen) => core.camera.toggleOverview(screen),
      click: (screen, options) => core.pointer.handleClick(screen, options.toggle, options.followLink),
      doubleClick: (screen, options) => core.pointer.handleDoubleClick(screen, options.followLink),
      heldKeys: (held) => core.keys.setHeldKeys(held),
      hover: (screen) => core.pointer.handleHover(screen),
      back: () => core.history.back(),
      toggleViewMode: () => core.viewModes.toggleViewMode(),
      toggle3d: () => core.viewModes.toggle3d(),
      toggleMinimap: () => core.events.emit('minimapToggle'),
      toggleFlatten: () => core.viewModes.toggleFlatten(),
      toggleGraph: () => core.graph.toggleGraph(),
      beginMove: (screen) => core.gesture.beginMove(screen),
      moveTo: (screen, options) => core.gesture.moveTo(screen, options.snap, options.free),
      endMove: () => core.gesture.endMove(),
      canMarquee: (screen) => !!core.targets.editablePage() && !core.picking.pickAt(screen),
      selectInRect: (rect, options) => core.selection.selectInRect(rect, options),
      selectAll: () => core.selection.selectAll(),
      orderSelection: (move) => core.arrange.orderSelection(move),
      nudgeSelection: (direction, coarse) => core.gesture.nudgeSelection(direction, coarse),
      editSelection: () => core.labelEditor.editLabel(),
      // Une partie sélectionnée (ex. champ d'une table RDD, sujet 251) est retirée seule.
      deleteSelection: () => core.shapeParts.removeSelected() || core.elements.deleteSelection(),
      placementVariant: () => core.arrangement.placementVariant(),
      editComment: () => core.pointer.editHoveredComment(),
      canDeleteSelection: () => {
        const editable = core.targets.editablePage();
        return !!editable && core.selection.current?.pageId === editable.page.id;
      },
      escape: () => core.selection.escape(),
      modeKey: (key) => core.pageModes.modeKey(key),
    },
    core.config.effectiveControls(),
  );
}
