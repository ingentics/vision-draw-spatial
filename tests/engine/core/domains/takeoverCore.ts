import { Group } from 'three';
import { vi } from 'vitest';
import type { EngineCore } from '../../../../src/engine/core/domains/EngineCore';
import { EditHistory } from '../../../../src/engine/core/domains/document/undo';
import { EditLocks } from '../../../../src/engine/core/domains/edit/editLocks';
import { EditTargets } from '../../../../src/engine/core/domains/edit/targets';
import { InputCaptures } from '../../../../src/engine/core/domains/input/inputCaptures';
import { PluginGuard } from '../../../../src/engine/core/domains/runtime/pluginGuard';
import { PageOverlays } from '../../../../src/engine/core/domains/runtime/pageOverlays';
import { PageModes } from '../../../../src/engine/core/domains/modes/pageModes';
import { readDrawio } from '../../../../src/engine/core/format/parse';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="B" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="e" edge="1" source="a" target="b" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/**
 * Cœur réduit à ce que la prise en main de la page par un mode lit (sujet 467) : verrou d'édition, capture des
 * entrées, couche, gardes d'édition, annulation, appels protégés. Une scène de page (groupe vide, un objet par élément)
 * quand `scene` est vrai ; `picked` : élément sous le pointeur.
 */
export function takeoverCore(options: { scene?: boolean; picked?: string; reducedMotion?: boolean } = {}) {
  const { document, tree } = readDrawio(XML);
  const page = document.pages[0]!;
  const events: Array<[string, ...unknown[]]> = [];
  const root = new Group();
  for (const id of ['a', 'b', 'e']) {
    const object = new Group();
    object.userData.elementId = id;
    root.add(object);
  }
  const overlay: { object: unknown } = { object: undefined };
  const core = {
    pages: { getCurrentPage: () => page, pageById: () => page, currentPageId: page.id },
    graph: { isGraph: () => false },
    canInteract: () => true,
    gesture: { endMove: vi.fn() },
    labelEditor: { closeLabelEdit: vi.fn() },
    selection: {
      clearSelection: vi.fn(),
      selectItems: vi.fn(),
      withContent: (_page: unknown, items: Array<{ element: { id: string } }>) =>
        new Set(items.map((item) => item.element.id)),
    },
    events: { emit: (name: string, ...args: unknown[]) => events.push([name, ...args]) },
    rendering: {
      requestRender: vi.fn(),
      setOverlay: (object: unknown) => {
        overlay.object = object;
      },
    },
    scenes: { current: options.scene ? { pageId: page.id, root } : undefined },
    config: { reducedMotion: () => options.reducedMotion ?? false },
    modes: { modeOf: () => ({ id: 'essai' }) },
    picking: {
      pickAt: () => {
        const edge = page.edges.find((e) => e.id === options.picked);
        return edge && { type: 'edge', element: edge };
      },
    },
    projection: { groundPointAtHeight: (screen: { x: number; y: number }) => screen },
    sceneView: { sceneObject: () => undefined, renderContext: () => ({}) },
    registry: { outline: () => undefined, hitBounds: (shape: { bounds: unknown }) => shape.bounds },
    canvas: { style: { cursor: '' } },
    file: { pageTreeOf: () => tree.pages[0], xmlTree: tree, document, restore: vi.fn(), publishWarnings: vi.fn() },
  } as unknown as EngineCore;
  Object.assign(core, {
    pluginGuard: new PluginGuard(core),
    pageModes: new PageModes(core),
    editLocks: new EditLocks(core),
    inputCaptures: new InputCaptures(core),
    overlays: new PageOverlays(core),
    targets: new EditTargets(core, true),
  });
  Object.assign(core, { edits: new EditHistory(core) });
  return { core, page, root, events, overlay };
}
