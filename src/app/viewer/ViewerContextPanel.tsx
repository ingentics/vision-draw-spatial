import type { EdgeModel, Engine, PageModel, Selection, Settings, SettingsPatch, ShapeModel } from '../../engine';
import { edgeLinesOf, isAnchoring, jumpValue, SPATIAL } from '../../engine';
import { ContextPanel } from '../ContextPanel';
import { MULTI_SELECT_LABELS } from '../settings/ShortcutSettings';
import type { TextEdit } from '../TextFormat';

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
}) {
  const ownAnchoring = currentPage.attributes[SPATIAL.anchoring];
  const pageAnchoring = isAnchoring(ownAnchoring) ? ownAnchoring : settings.shapes.edgeAnchoring;
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
      onLink={(link) => selection && engine?.setLink(selection.picked.element.id, link)}
      onEditComment={() => selection && engine?.editComment(selection.picked.element.id)}
      onSpatial={(key, value, merge) => selection && engine?.setSpatial(selection.picked.element.id, key, value, merge)}
      onEditLabel={() => selection && engine?.editLabel(selection.picked.element.id)}
      onEndLabel={(end, text) => selection && engine?.setEdgeEndLabel(selection.picked.element.id, end, text)}
      onDelete={() => engine?.deleteSelection()}
      onOrder={(move) => engine?.orderSelection(move)}
      alignReference={settings.edit.alignReference}
      onAlignReference={(alignReference) => onSettingsChange({ edit: { alignReference } })}
      onAlign={(move) => engine?.alignSelection(move, settings.edit.alignReference)}
      onDistribute={(move) => engine?.distributeSelection(move)}
      onReverse={() => engine?.reverseEdges(selected.edges.map((edge) => edge.id))}
      onResetRoute={() => selection && engine?.resetEdgeRoute(selection.picked.element.id)}
      onEdgeStyle={(patch, merge) =>
        engine?.setElementsStyle(
          selected.edges.map((edge) => edge.id),
          patch,
          'Tracé',
          merge,
        )
      }
      onOrient={(action) =>
        engine?.orientShapes(
          selected.shapes.map((shape) => shape.id),
          action,
        )
      }
      onShapeStyle={(patch) =>
        engine?.setElementsStyle(
          selected.shapes.map((shape) => shape.id),
          patch,
          'Bordure',
        )
      }
      onTextAnchor={(cellId, anchor) =>
        selection && engine?.setEdgeTextAnchor(selection.picked.element.id, cellId, anchor)
      }
      textEdit={textEdit}
      onApplyStyle={(preset) =>
        engine?.applyStylePreset(
          selected.shapes.map((shape) => shape.id),
          preset,
          [...settings.styles.base, ...settings.styles.extended],
        )
      }
      onRenamePage={editablePages ? (name) => engine?.renamePage(currentPage.id, name) : undefined}
      onPageMode={editablePages ? (modeId) => engine?.setPageMode(currentPage.id, modeId) : undefined}
      onPageEffect={
        editablePages ? (effectId, enabled) => engine?.setPageEffect(currentPage.id, effectId, enabled) : undefined
      }
      onPageAnchoring={editablePages ? (anchoring) => engine?.setPageAnchoring(currentPage.id, anchoring) : undefined}
      defaultAnchoring={settings.shapes.edgeAnchoring}
      onPageEdgeLine={editablePages ? (line) => engine?.setPageEdgeLine(currentPage.id, line) : undefined}
      defaultEdgeLine={settings.shapes.edgeLineStyle}
      pageEdgeLines={edgeLinesOf(pageAnchoring)}
      onPageJumps={editablePages ? (jumps) => engine?.setPageJumps(currentPage.id, jumps) : undefined}
      defaultJumps={settings.shapes.edgeJumpStyle}
      pageJumps={jumpValue(currentPage.attributes[SPATIAL.jumps]) ?? settings.shapes.edgeJumpStyle}
      defaultJumpSize={settings.shapes.edgeJumpSize}
      onModeEdit={editablePages ? (label, edit) => engine?.editPageMode(label, edit) : undefined}
      modeCurrent={engine?.getModeCurrent(currentPage.id)}
      onModeProperty={
        editablePages
          ? (scope, targetId, key, value, part, merge) =>
              engine?.setModeProperty(scope, targetId, key, value, part, merge)
          : undefined
      }
    />
  );
}
