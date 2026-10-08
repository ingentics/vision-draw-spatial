import { describe, expect, it } from 'vitest';
import { OrientCommands } from '../../../../../src/engine/core/domains/edit/commands/orientation';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { documentFromTree, readDrawio } from '../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../src/engine/core/format/write';
import { createDefaultRegistry } from '../../../../../src/engine/plugins';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="brace" value="texte" style="shape=curlyBracket;rounded=1;labelPosition=right;align=left;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="20" height="120" as="geometry"/></mxCell>
<mxCell id="plain" value="P" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="300" y="100" width="20" height="120" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/** Commande branchée sur un faux cœur : une page, un registre réel, les étapes d'annulation enregistrées. */
function setup() {
  const { tree } = readDrawio(XML);
  const state = { page: documentFromTree(tree).pages[0]!, steps: [] as string[] };
  const core = {
    targets: { editablePage: () => ({ page: state.page, pageTree: tree.pages[0]! }) },
    file: {
      xmlTree: tree,
      documentChanged: () => {
        state.page = documentFromTree(tree).pages[0]!;
      },
    },
    registry: createDefaultRegistry(),
    edits: { recordSnapshot: (label: string) => state.steps.push(label) },
  } as unknown as EngineCore;
  const commands = new OrientCommands(core);
  const shape = (id: string) => state.page.shapes.find((s) => s.id === id)!;
  return { commands, shape, state, xml: () => writeDrawio(tree) };
}

describe('orientShapes (sujet 335)', () => {
  it('retourne une forme qui l’accepte : flipH écrit, texte et position du label intacts, une étape', () => {
    const { commands, shape, state } = setup();
    commands.orientShapes(['brace'], 'flipHorizontal');
    expect(shape('brace').style.flipH).toBe('1');
    expect(shape('brace').style.labelPosition).toBe('right');
    expect(shape('brace').style.align).toBe('left');
    expect(shape('brace').bounds).toMatchObject({ x: 100, y: 100, width: 20, height: 120 });
    expect(state.steps).toEqual(['Retourner horizontalement']);
    commands.orientShapes(['brace'], 'flipHorizontal');
    expect(shape('brace').style.flipH).toBeUndefined();
  });

  it('ignore une forme qui n’accepte rien, sans étape d’annulation', () => {
    const { commands, shape, state } = setup();
    commands.orientShapes(['plain'], 'flipHorizontal');
    commands.orientShapes(['plain'], 'rotateRight');
    expect(shape('plain').style.flipH).toBeUndefined();
    expect(shape('plain').style.direction).toBeUndefined();
    expect(state.steps).toEqual([]);
  });

  it('pivote autour du centre : direction écrite, largeur et hauteur échangées', () => {
    const { commands, shape, state } = setup();
    commands.orientShapes(['brace'], 'rotateRight');
    expect(shape('brace').style.direction).toBe('south');
    // Centre (110, 160) conservé.
    expect(shape('brace').bounds).toMatchObject({ x: 50, y: 150, width: 120, height: 20 });
    expect(state.steps).toEqual(['Pivoter à droite']);
    commands.orientShapes(['brace'], 'rotateLeft');
    expect(shape('brace').bounds).toMatchObject({ x: 100, y: 100, width: 20, height: 120 });
    expect(shape('brace').style.direction).toBeUndefined();
  });

  it('une sélection mêlée : seules les formes permises changent, en une étape', () => {
    const { commands, shape, state } = setup();
    commands.orientShapes(['brace', 'plain'], 'flipVertical');
    expect(shape('brace').style.flipV).toBe('1');
    expect(shape('plain').style.flipV).toBeUndefined();
    expect(state.steps).toHaveLength(1);
  });
});

describe('capacités déclarées (sujet 335)', () => {
  const registry = createDefaultRegistry();
  const model = (style: Record<string, string>, kind: string) =>
    ({ id: 's', kind, style, bounds: { x: 0, y: 0, width: 10, height: 10 } }) as never;

  it('rien par défaut', () => {
    expect(registry.orientable(model({}, 'rectangle'))).toEqual({
      flipHorizontal: false,
      flipVertical: false,
      rotate: false,
    });
  });

  it('les triangles (vers la droite et vers le haut) déclarent tout, la prise et les silhouettes rien', () => {
    const all = { flipHorizontal: true, flipVertical: true, rotate: true };
    expect(registry.orientable(model({}, 'triangle'))).toEqual(all);
    expect(registry.orientable(model({ direction: 'north' }, 'triangle'))).toEqual(all);
    const none = { flipHorizontal: false, flipVertical: false, rotate: false };
    expect(registry.orientable(model({}, 'stencil:plug'))).toEqual(none);
    expect(registry.orientable(model({}, 'umlActor'))).toEqual(none);
  });

  it('les accolades gauche et droite déclarent tout', () => {
    for (const style of [{} as Record<string, string>, { flipH: '1' }])
      expect(registry.orientable(model(style, 'curlyBracket'))).toEqual({
        flipHorizontal: true,
        flipVertical: true,
        rotate: true,
      });
  });
});
