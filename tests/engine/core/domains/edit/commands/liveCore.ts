import { DocumentFile } from '../../../../../../src/engine/core/domains/document/file';
import { EditHistory } from '../../../../../../src/engine/core/domains/document/undo';
import { LiveEdit } from '../../../../../../src/engine/core/domains/edit/drag/liveEdit';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../../src/engine/core/format/write';
import type { DocumentModel } from '../../../../../../src/engine/core/model/types';
import { createDefaultRegistry } from '../../../../../../src/engine/plugins';

/**
 * Cœur réduit pour les réglages en direct (sujet 376) : document, copie de travail, annulation et suite d'une
 * modification en direct réels, modèle gelé comme en dev ; sans scène (rien à redessiner).
 */
export function liveCore(xml: string) {
  const changes: DocumentModel[] = [];
  const core = {
    registry: createDefaultRegistry(),
    pageModes: { withModeWarnings: (document: DocumentModel) => document },
    pageEffects: { warnings: () => [] },
    pluginGuard: { warnings: () => [] },
    selection: { rebind: () => {} },
    scenes: { current: undefined, invalidate: () => {} },
    sceneView: { sceneObject: () => undefined },
    graph: { invalidateWithScenes: () => {} },
    highlight: { clearVeil: () => {}, update: () => {} },
    minimap: { invalidate: () => {} },
    rendering: { requestRender: () => {} },
    labelEditor: { relocateLabelEdit: () => {} },
    events: {
      emit: (name: string, document: DocumentModel) => {
        if (name === 'documentChange') changes.push(document);
      },
    },
  } as unknown as Record<string, unknown>;
  const file = new DocumentFile(core as unknown as EngineCore);
  const edits = new EditHistory(core as unknown as EngineCore);
  Object.assign(core, {
    file,
    edits,
    live: new LiveEdit(core as unknown as EngineCore),
    targets: { editablePage: () => ({ page: file.document!.pages[0]!, pageTree: file.xmlTree!.pages[0]! }) },
  });
  const { document, tree } = readDrawio(xml);
  file.replaceDocument(document, tree);
  /** Étapes d'annulation, de la plus récente à la plus ancienne : modèle relu de chaque instantané. */
  const undoSteps = () => {
    const steps: DocumentModel[] = [];
    for (let xml = edits.undoStack.undo('now'); xml !== undefined; xml = edits.undoStack.undo('now'))
      steps.push(readDrawio(xml).document);
    return steps;
  };
  return {
    core: core as unknown as EngineCore,
    page: () => file.document!.pages[0]!,
    reread: () => readDrawio(writeDrawio(file.xmlTree!)).document.pages[0]!,
    changes,
    undoSteps,
  };
}
