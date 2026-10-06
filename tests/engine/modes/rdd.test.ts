import { Mesh, Object3D } from 'three';
import type { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { documentFromTree, readDrawio } from '../../../src/engine/format/parse';
import { applyModeEdit } from '../../../src/engine/modes/edit';
import { createDefaultModeRegistry } from '../../../src/engine/modes/registry';
import { definition as rdd } from '../../../src/engine/modes/rdd';
import { FIELDS, SECONDARY, fieldsOf } from '../../../src/engine/modes/rdd/table';
import { setFields, setHeaderColor, setSecondary } from '../../../src/engine/modes/rdd/tables';
import type { ModeEdit } from '../../../src/engine/modes/types';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import type { RenderContext, TextSpec } from '../../../src/engine/render/types';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';
import { spatialValue } from '../../../src/engine/spatial';
import { fixture } from '../../helpers';

/** Page de la fixture, et une fonction qui applique une opération puis relit la page. */
function setup() {
  const { document, tree } = readDrawio(fixture('rdd.drawio'));
  let page = document.pages[0]!;
  const run = (operation: (edit: ModeEdit) => void): boolean => {
    const changed = applyModeEdit(page, tree.pages[0]!, operation);
    page = documentFromTree(tree).pages[0]!;
    return changed;
  };
  const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
  return { run, page: () => page, shape };
}

describe('mode RDD (sujet 179) : page et palette', () => {
  const modes = createDefaultModeRegistry();
  const { page } = setup();

  it('2D seulement, palette réduite au modèle abstrait dans la catégorie RDD', () => {
    expect(modes.modeOf(page())?.id).toBe('rdd');
    expect(modes.allowsViewMode(page(), 'top')).toBe(true);
    expect(modes.allowsViewMode(page(), 'iso')).toBe(false);
    expect(modes.allowsViewMode(page(), '3d')).toBe(false);
    const palette = modes.paletteFor(page(), createDefaultRegistry().templates());
    expect(palette.categories.map((c) => c.id)).toEqual(['rdd']);
    expect(palette.templates.map((t) => [t.id, t.name])).toEqual([['rdd-model', 'Modèle abstrait']]);
  });

  it('le modèle abstrait de la palette : un swimlane désigné par spatial.kind, entête et une ligne vide', () => {
    const template = createDefaultRegistry()
      .templates()
      .find((t) => t.id === 'rdd-model')!;
    expect(template.style).toContain('swimlane;');
    expect(template.style).toContain('spatial.kind=rdd-model;');
    expect(template.style).toContain('startSize=38;');
    expect([template.width, template.height]).toEqual([160, 58]);
  });

  it('les tables du fichier sont reconnues ; champs lus de spatial.fields', () => {
    const shapes = createDefaultRegistry();
    for (const shape of page().shapes) expect(shapes.resolve(shape).definition.id).toBe('rdd-model');
    expect(page().shapes.map(fieldsOf)).toEqual([[], ['created_at', 'updated_at'], ['author']]);
  });

  it('réglages du mode masqués hors des tables', () => {
    const properties = rdd.shapeProperties!;
    const table = page().shapes[0]!;
    expect(properties.map((p) => p.hidden!(page(), table))).toEqual([false, false, false]);
    expect(properties.every((p) => p.hidden!(page(), page()))).toBe(true);
  });
});

describe('mode RDD : opérations sur une table', () => {
  it('champs : un par ligne, la table prend la hauteur de ses champs (au moins une ligne)', () => {
    const { run, shape } = setup();
    expect(run((edit) => setFields(edit, shape('model'), 'id\n\n  name  \ncreated_at'))).toBe(true);
    expect(fieldsOf(shape('model'))).toEqual(['id', 'name', 'created_at']);
    expect(shape('model').bounds).toEqual({ x: 40, y: 40, width: 160, height: 38 + 3 * 20 });
    run((edit) => setFields(edit, shape('model'), ''));
    expect(spatialValue(shape('model'), FIELDS)).toBeUndefined();
    expect(shape('model').bounds.height).toBe(58);
  });

  it('table secondaire : × 0,8 depuis le coin haut-gauche, puis ÷ 0,8 ; entête et texte suivent', () => {
    const { run, shape } = setup();
    run((edit) => setSecondary(edit, shape('timestamped'), true));
    const small = shape('timestamped');
    expect(spatialValue(small, SECONDARY)).toBe('1');
    expect(small.bounds).toEqual({ x: 240, y: 40, width: 128, height: 62.4 });
    expect([small.style.startSize, small.style.fontSize]).toEqual(['30.4', '9.6']);
    // Un champ de plus : lignes à l'échelle de la table secondaire.
    run((edit) => setFields(edit, shape('timestamped'), 'created_at\nupdated_at\ndeleted_at'));
    expect(shape('timestamped').bounds.height).toBe(78.4);
    run((edit) => setSecondary(edit, shape('timestamped'), false));
    const back = shape('timestamped');
    expect(spatialValue(back, SECONDARY)).toBeUndefined();
    expect(back.bounds).toEqual({ x: 240, y: 40, width: 160, height: 98 });
    expect([back.style.startSize, back.style.fontSize]).toEqual(['38', '12']);
    expect(run((edit) => setSecondary(edit, shape('timestamped'), false))).toBe(false);
  });

  it("couleur d'entête : fillColor, et fontColor lisible pour draw.io", () => {
    const { run, shape } = setup();
    run((edit) => setHeaderColor(edit, shape('model'), '#e1d5e7'));
    expect([shape('model').style.fillColor, shape('model').style.fontColor]).toEqual(['#e1d5e7', '#000000']);
    run((edit) => setHeaderColor(edit, shape('model'), '#1f3a5f'));
    expect(shape('model').style.fontColor).toBe('#ffffff');
  });

  it('couleurs proposées : celle par défaut puis la palette de l’appli, sans doublon', () => {
    const { page } = setup();
    const color = rdd.shapeProperties!.find((p) => p.key === 'fillColor')!;
    expect(color.type === 'select' && color.options(page(), ['#dae8fc', '#d5e8d4']).map((o) => o.value)).toEqual([
      '#dae8fc',
      '#d5e8d4',
    ]);
  });
});

describe('mode RDD : rendu d’une table', () => {
  function render(color?: string) {
    const { run, page, shape } = setup();
    if (color) run((edit) => setHeaderColor(edit, shape('timestamped'), color));
    const texts: TextSpec[] = [];
    const ctx: RenderContext = {
      text: {
        create(spec) {
          texts.push(spec);
          return new Object3D();
        },
      },
    };
    const root = buildPageScene(page(), createDefaultRegistry(), ctx, 'flat').root;
    const object = root.children.find((child) => child.userData.elementId === 'timestamped')!;
    return { texts, object };
  }

  it('mention, nom gras italique centré dans l’entête, champs alignés à gauche ligne par ligne', () => {
    const { texts } = render();
    const at = texts.findIndex((t) => t.text === 'Timestamped');
    const [stereotype, name, first, second] = texts.slice(at - 1, at + 3);
    expect(stereotype!.text).toBe('«abstract»');
    expect([name!.text, name!.bold, name!.italic, name!.align]).toEqual(['Timestamped', true, true, 'center']);
    expect([first!.text, first!.anchorX, first!.x, first!.y]).toEqual(['created_at', 'left', 246, 40 + 38 + 10]);
    expect([second!.text, second!.y]).toEqual(['updated_at', 40 + 38 + 30]);
  });

  it("entête de la couleur fillColor, corps blanc ; texte de l'entête blanc sur une couleur sombre", () => {
    const fillHex = (mesh: Object3D | undefined) => ((mesh as Mesh).material as MeshBasicMaterial).color.getHexString();
    const light = render();
    expect(fillHex(light.object.getObjectByName('fill-header'))).toBe('d5e8d4');
    expect(fillHex(light.object.children.find((c) => c instanceof Mesh))).toBe('ffffff');
    expect(light.texts.find((t) => t.text === 'Timestamped')!.color.getHexString()).toBe('000000');
    const dark = render('#1f3a5f');
    expect(dark.texts.find((t) => t.text === 'Timestamped')!.color.getHexString()).toBe('ffffff');
  });
});
