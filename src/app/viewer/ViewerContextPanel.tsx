import type {
  EdgeModel,
  Engine,
  PageModel,
  Selection,
  Settings,
  SettingsPatch,
  ShapeModel,
  ViewMode,
} from '../../engine';
import { edgeLinesOf, edgeLinesOfEdge, jumpValue, pageAnchoring, SPATIAL } from '../../engine';
import { ContextPanel } from '../ContextPanel';
import { MULTI_SELECT_LABELS } from '../settings/ShortcutSettings';
import type { TextEdit } from '../TextFormat';
import type { ModePageControls } from '../plugins/modes/registry';
import type { LayerActions } from '../context/LayersSection';
import type { GenerationControls } from '../context/GenerationSection';
import { acceptGenerated } from '../metamorph/metamorphHost';

/** Panneau contextuel de la page affichée, branché sur le moteur : chaque réglage y écrit la sélection ou la page. */
export function ViewerContextPanel({
  engine,
  settings,
  onSettingsChange,
  pages,
  currentPage,
  selection,
  selected,
  editablePages,
  textEdit,
  modeControls,
  viewMode,
}: {
  engine: Engine | undefined;
  settings: Settings;
  onSettingsChange: (patch: SettingsPatch) => void;
  pages: PageModel[];
  currentPage: PageModel;
  selection: Selection | undefined;
  /** Formes et flèches sélectionnées sur la page affichée. */
  selected: { shapes: ShapeModel[]; edges: EdgeModel[] };
  /** Pages modifiables (renommer, mode, effets, ancrage…). */
  editablePages: boolean;
  textEdit: TextEdit | undefined;
  modeControls: ModePageControls | undefined;
  /** Mode de vue affiché : l'élévation des calques ne se règle qu'en iso et en 3D. */
  viewMode: ViewMode;
}) {
  const currentAnchoring = pageAnchoring(currentPage, settings.shapes.edgeAnchoring);
  return (
    <ContextPanel
      page={currentPage}
      pages={pages}
      shapes={selected.shapes}
      edges={selected.edges}
      part={selection?.pageId === currentPage.id ? selection.part : undefined}
      styles={settings.styles}
      modeSettings={settings.modes}
      exporters={settings.exporters}
      defaultDepth={settings.view.isoDepth}
      multiSelectKey={MULTI_SELECT_LABELS[settings.controls.multiSelectKey]}
      onLink={(link) => selection && engine?.edit.setLink(selection.picked.element.id, link)}
      onEditComment={() => selection && engine?.text.editComment(selection.picked.element.id)}
      onSpatial={(key, value, merge) =>
        selection && engine?.edit.setSpatial(selection.picked.element.id, key, value, merge)
      }
      onEditLabel={() => selection && engine?.text.editLabel(selection.picked.element.id)}
      onEndLabel={(end, text) => selection && engine?.text.setEdgeEndLabel(selection.picked.element.id, end, text)}
      onDelete={() => engine?.selection.delete()}
      onOrder={(move) => engine?.selection.order(move)}
      alignReference={settings.edit.alignReference}
      onAlignReference={(alignReference) => onSettingsChange({ edit: { alignReference } })}
      onAlign={(move) => engine?.selection.align(move, settings.edit.alignReference)}
      onDistribute={(move) => engine?.selection.distribute(move)}
      onReverse={() => engine?.edit.reverseEdges(selected.edges.map((edge) => edge.id))}
      onResetRoute={() => selection && engine?.edit.resetEdgeRoute(selection.picked.element.id)}
      onEdgeStyle={(patch, merge) =>
        engine?.edit.setElementsStyle(
          selected.edges.map((edge) => edge.id),
          patch,
          'Tracé',
          merge,
        )
      }
      onOrient={(action) =>
        engine?.edit.orientShapes(
          selected.shapes.map((shape) => shape.id),
          action,
        )
      }
      onShapeStyle={(patch) =>
        engine?.edit.setElementsStyle(
          selected.shapes.map((shape) => shape.id),
          patch,
          'Bordure',
        )
      }
      onTextAnchor={(cellId, anchor) =>
        selection && engine?.text.setEdgeTextAnchor(selection.picked.element.id, cellId, anchor)
      }
      textEdit={textEdit}
      generation={editablePages && engine ? generationControls(engine) : undefined}
      onApplyStyle={(preset) =>
        engine?.edit.applyStylePreset(
          selected.shapes.map((shape) => shape.id),
          preset,
          [...settings.styles.base, ...settings.styles.extended],
        )
      }
      onRenamePage={editablePages ? (name) => engine?.pages.rename(currentPage.id, name) : undefined}
      onPageMode={editablePages ? (modeId) => engine?.modes.setPageMode(currentPage.id, modeId) : undefined}
      layers={engine?.layers.of(currentPage.id)}
      layerElevations={viewMode !== 'top'}
      onFlattenLayers={(flattened) => engine?.layers.setFlattened(currentPage.id, flattened)}
      layerActions={editablePages && engine ? layerActions(engine, currentPage.id) : undefined}
      onMoveToLayer={editablePages ? (layerId) => engine?.layers.moveSelection(layerId) : undefined}
      onPageEffect={
        editablePages
          ? (effectId, enabled) => engine?.effects.setPageEffect(currentPage.id, effectId, enabled)
          : undefined
      }
      onPageAnchoring={editablePages ? (anchoring) => engine?.pages.setAnchoring(currentPage.id, anchoring) : undefined}
      defaultAnchoring={settings.shapes.edgeAnchoring}
      onPageEdgeLine={editablePages ? (line) => engine?.pages.setEdgeLine(currentPage.id, line) : undefined}
      defaultEdgeLine={settings.shapes.edgeLineStyle}
      pageEdgeLines={edgeLinesOf(currentAnchoring)}
      edgeLines={edgeLinesOfEdge(currentAnchoring)}
      onPageJumps={editablePages ? (jumps) => engine?.pages.setJumps(currentPage.id, jumps) : undefined}
      defaultJumps={settings.shapes.edgeJumpStyle}
      pageJumps={jumpValue(currentPage.attributes[SPATIAL.jumps]) ?? settings.shapes.edgeJumpStyle}
      defaultJumpSize={settings.shapes.edgeJumpSize}
      onModeEdit={editablePages ? (label, edit) => engine?.modes.edit(label, edit) : undefined}
      modeCurrent={engine?.modes.current(currentPage.id)}
      modeControls={modeControls}
      onModeProperty={
        editablePages
          ? (scope, targetId, key, value, part, merge) =>
              engine?.modes.setProperty(scope, targetId, key, value, part, merge)
          : undefined
      }
    />
  );
}

/** Opérations du panneau sur les calques de la page `pageId` (sujet 523). */
/** Forme générée (sujets 538, 545) : description et cycle par le moteur, proposition choisie gardée par l'hôte. */
function generationControls(engine: Engine): GenerationControls {
  return {
    view: (shapeId) => engine.generation.of(shapeId),
    setInstructions: (shapeId, instructions) => engine.generation.setInstructions(shapeId, instructions),
    submit: (shapeId) => engine.generation.submit(shapeId),
    retry: (shapeId) => engine.generation.retry(shapeId),
    reprompt: (shapeId) => engine.generation.reprompt(shapeId),
    accept: (shapeId, candidateId) => void acceptGenerated(engine, shapeId, candidateId),
  };
}

function layerActions(engine: Engine, pageId: string): LayerActions {
  return {
    choose: (layerId) => engine.layers.setCurrent(pageId, layerId),
    add: () => engine.layers.add(pageId),
    rename: (layerId, name) => engine.layers.rename(pageId, layerId, name),
    move: (layerId, direction) => engine.layers.move(pageId, layerId, direction),
    remove: (layerId) => engine.layers.remove(pageId, layerId),
    setVisible: (layerId, visible) => engine.layers.setVisible(pageId, layerId, visible),
    setLocked: (layerId, locked) => engine.layers.setLocked(pageId, layerId, locked),
    setElevation: (layerId, elevation) => engine.layers.setElevation(pageId, layerId, elevation),
  };
}
