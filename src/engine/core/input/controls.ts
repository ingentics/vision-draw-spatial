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
      beginMove: (screen) => core.beginMove(screen),
      moveTo: (screen, options) => core.moveTo(screen, options.snap),
      endMove: () => core.endMove(),
      canMarquee: (screen) => !!core.editablePage() && !core.picking.pickAt(screen),
      selectInRect: (rect, options) => core.selection.selectInRect(rect, options),
      selectAll: () => core.selection.selectAll(),
      orderSelection: (move) => core.orderSelection(move),
      nudgeSelection: (direction, coarse) => core.nudgeSelection(direction, coarse),
      editSelection: () => core.editLabel(),
      deleteSelection: () => core.deleteSelection(),
      placementVariant: () => core.placementVariant(),
      canDeleteSelection: () => {
        const editable = core.editablePage();
        return !!editable && core.selection.current?.pageId === editable.page.id;
      },
      escape: () => core.selection.clearSelection(),
      modeKey: (key) => core.pageModes.modeKey(key),
    },
    core.config.effectiveControls(),
  );
}
