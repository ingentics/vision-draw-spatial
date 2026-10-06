import { Box3, Mesh, Object3D } from 'three';
import type { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { documentFromTree, readDrawio } from '../../../src/engine/format/parse';
import { applyModeEdit } from '../../../src/engine/modes/edit';
import { createDefaultModeRegistry } from '../../../src/engine/modes/registry';
import { definition as rdd } from '../../../src/engine/modes/rdd';
import { FIELDS, SECONDARY, fieldsOf, tableFields } from '../../../src/engine/modes/rdd/tables';
import { fieldsText, setFields, setHeaderColor, setSecondary } from '../../../src/engine/modes/rdd/operations';
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
    expect(palette.templates.map((t) => [t.id, t.name])).toEqual([
      ['rdd-entity', 'Entité'],
      ['rdd-enum', 'Entité énumérative'],
      ['rdd-embedded', 'Embedded'],
      ['rdd-document', 'Document'],
      ['rdd-view', 'Vue'],
    ]);
  });

  it('entité et énumération de la palette : swimlanes désignés par spatial.kind, nés avec la clé primaire', () => {
    const templates = createDefaultRegistry().templates();
    const entity = templates.find((t) => t.id === 'rdd-entity')!;
    expect(entity.style).toContain('swimlane;');
    expect(entity.style).toContain('spatial.kind=rdd-entity;');
    expect(entity.style).toContain('spatial.fields=["id"];');
    expect(entity.style).toContain('startSize=26;');
    expect([entity.width, entity.height]).toEqual([160, 46]);
    const enumeration = templates.find((t) => t.id === 'rdd-enum')!;
    // Sans mention (sujet 216) : même entête que l'entité.
    expect(enumeration.style).toContain('startSize=26;');
    expect(enumeration.height).toBe(46);
    // Le modèle abstrait : base technique, jamais dans la palette (sujet 180).
    expect(templates.find((t) => t.id === 'rdd-model')).toBeUndefined();
  });

  it('les tables du fichier sont reconnues ; champs lus de spatial.fields', () => {
    const shapes = createDefaultRegistry();
    expect(page().shapes.map((shape) => shapes.resolve(shape).definition.id)).toEqual([
      'rdd-model',
      'rdd-model',
      'rdd-model',
      'rdd-entity',
      'rdd-enum',
      'rdd-entity',
      'rdd-embedded',
      'rdd-document',
      'rdd-document',
      'rdd-view',
    ]);
    expect(page().shapes.slice(0, 3).map(fieldsOf)).toEqual([[], ['created_at', 'updated_at'], ['author']]);
  });

  it('clé primaire : toujours en tête à l’affichage ; absente du fichier, signalée dans Diagnostics', () => {
    const shape = (id: string) => page().shapes.find((s) => s.id === id)!;
    expect(tableFields(shape('user'))).toEqual(['id', 'email', 'role']);
    expect(tableFields(shape('role'))).toEqual(['id', 'admin', 'member']);
    expect(tableFields(shape('orphan'))).toEqual(['id', 'name']);
    expect(modes.warnings({ pages: [page()] } as never)).toEqual([
      {
        pageId: 'rdd',
        cellId: 'orphan',
        message: 'Table « Orphan » : clé primaire id absente ou déplacée, remise en tête',
      },
      { pageId: 'rdd', cellId: 'unnamed', message: 'Document sans nom : le nom est obligatoire' },
    ]);
  });

  it('réglages du mode masqués hors des tables ; clé primaire en lecture seule, sur les entités seulement', () => {
    const properties = rdd.shapeProperties!;
    const model = page().shapes[0]!;
    const entity = page().shapes.find((s) => s.id === 'user')!;
    expect(properties.map((p) => [p.label, p.hidden!(page(), model)])).toEqual([
      ['Couleur', false],
      ['Table secondaire', false],
      ['Clé primaire', true],
      ['Champs', false],
    ]);
    expect(properties.map((p) => p.hidden!(page(), entity))).toEqual([false, false, false, false]);
    const key = properties.find((p) => p.label === 'Clé primaire')!;
    expect([key.readOnly, key.value!(page(), entity)]).toEqual([true, 'id']);
    expect(properties.every((p) => p.hidden!(page(), page()))).toBe(true);
  });
});

describe('mode RDD : opérations sur une table', () => {
  it('champs : un par ligne, la table prend la hauteur de ses champs (au moins une ligne)', () => {
    const { run, shape } = setup();
    expect(run((edit) => setFields(edit, shape('model'), 'id\n\n  name  \ncreated_at'))).toBe(true);
    expect(fieldsOf(shape('model'))).toEqual(['id', 'name', 'created_at']);
    expect(shape('model').bounds).toEqual({ x: 40, y: 40, width: 160, height: 26 + 3 * 20 });
    run((edit) => setFields(edit, shape('model'), ''));
    expect(spatialValue(shape('model'), FIELDS)).toBeUndefined();
    expect(shape('model').bounds.height).toBe(46);
  });

  it('table secondaire : × 0,8 depuis le coin haut-gauche, puis ÷ 0,8 ; entête et texte suivent', () => {
    const { run, shape } = setup();
    run((edit) => setSecondary(edit, shape('timestamped'), true));
    const small = shape('timestamped');
    expect(spatialValue(small, SECONDARY)).toBe('1');
    expect(small.bounds).toEqual({ x: 240, y: 40, width: 128, height: 52.8 });
    expect([small.style.startSize, small.style.fontSize]).toEqual(['20.8', '9.6']);
    // Un champ de plus : lignes à l'échelle de la table secondaire.
    run((edit) => setFields(edit, shape('timestamped'), 'created_at\nupdated_at\ndeleted_at'));
    expect(shape('timestamped').bounds.height).toBe(68.8);
    run((edit) => setSecondary(edit, shape('timestamped'), false));
    const back = shape('timestamped');
    expect(spatialValue(back, SECONDARY)).toBeUndefined();
    expect(back.bounds).toEqual({ x: 240, y: 40, width: 160, height: 86 });
    expect([back.style.startSize, back.style.fontSize]).toEqual(['26', '12']);
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

describe('mode RDD : entités (sujet 180)', () => {
  it('le panneau ne montre que les champs après la clé primaire ; elle reste en tête, jamais retirée', () => {
    const { run, shape } = setup();
    expect(fieldsText(shape('user'))).toBe('email\nrole');
    run((edit) => setFields(edit, shape('user'), 'role\nid\nname'));
    expect(fieldsOf(shape('user'))).toEqual(['id', 'role', 'name']);
    expect(shape('user').bounds.height).toBe(26 + 3 * 20);
    run((edit) => setFields(edit, shape('user'), ''));
    expect(fieldsOf(shape('user'))).toEqual(['id']);
    expect(shape('user').bounds.height).toBe(46);
    // Fichier sans clé primaire : la première écriture la remet en tête.
    run((edit) => setFields(edit, shape('orphan'), fieldsText(shape('orphan'))));
    expect(fieldsOf(shape('orphan'))).toEqual(['id', 'name']);
  });

  it('table secondaire et couleur, comme sur le modèle', () => {
    const { run, shape } = setup();
    run((edit) => setSecondary(edit, shape('role'), true));
    expect(shape('role').bounds).toEqual({ x: 240, y: 160, width: 128, height: 68.8 });
    run((edit) => setHeaderColor(edit, shape('role'), '#d5e8d4'));
    expect(shape('role').style.fillColor).toBe('#d5e8d4');
  });
});

describe('mode RDD : embedded, document et vue (sujets 181, 218)', () => {
  const templates = createDefaultRegistry().templates();
  const style = (id: string) => templates.find((t) => t.id === id)!.style;

  it('palette : entête de 26 px, sans clé primaire ; embedded en trait plein, coins arrondis pour la vue', () => {
    for (const id of ['rdd-embedded', 'rdd-document', 'rdd-view']) {
      expect(style(id)).toContain('startSize=26;');
      expect(style(id)).not.toContain('spatial.fields');
    }
    expect(style('rdd-embedded')).not.toMatch(/dashed|rounded/);
    expect(style('rdd-view')).toContain('rounded=1;');
    expect(style('rdd-document')).not.toMatch(/dashed|rounded/);
  });

  function render() {
    const { page } = setup();
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
    const object = (id: string) => root.children.find((child) => child.userData.elementId === id)!;
    return { texts, object, page };
  }

  it('sans mention (sujet 218) ; clés du document en italique ; document sans nom : « Document »', () => {
    const { texts } = render();
    expect(texts.filter((t) => t.text.includes('«'))).toEqual([]);
    expect(['theme', 'locale'].map((key) => texts.find((t) => t.text === key)!.italic)).toEqual([true, true]);
    expect(texts.find((t) => t.text === 'street')!.italic).toBeFalsy();
    expect(texts.filter((t) => t.text === 'Document')).toHaveLength(1);
  });

  it('document : coin plié en haut à droite (coin coupé, rabat plus sombre), 10 px', () => {
    const { object, page } = render();
    const settings = object('settings');
    const flap = settings.getObjectByName('fill-fold') as Mesh;
    flap.geometry.computeBoundingBox();
    const box = flap.geometry.boundingBox!;
    expect([box.min.x, box.min.y, box.max.x, box.max.y]).toEqual([390, 300, 400, 310]);
    const color = (mesh: Object3D) => ((mesh as Mesh).material as MeshBasicMaterial).color;
    const header = color(settings.getObjectByName('fill-header')!);
    expect(color(flap).r).toBeLessThan(header.r);
    expect(
      createDefaultRegistry().resolve(page().shapes.find((s) => s.id === 'settings')!).definition.outline!(
        page().shapes.find((s) => s.id === 'settings')!,
      ),
    ).toEqual([
      { x: 240, y: 300 },
      { x: 390, y: 300 },
      { x: 400, y: 310 },
      { x: 400, y: 366 },
      { x: 240, y: 366 },
    ]);
    expect(object('address').getObjectByName('fill-fold')).toBeUndefined();
  });

  it('embedded : bas ondulé dans les bornes, sous le dernier champ ; 4 px de plus pour la vague (sujet 219)', () => {
    const { page } = render();
    const address = page().shapes.find((s) => s.id === 'address')!;
    const path = createDefaultRegistry().resolve(address).definition.outline!(address);
    const bottom = path.filter((p) => p.y > 300 + 26);
    const ys = bottom.map((p) => p.y);
    // Vague entre 366 (sous les deux champs) et 370 (bas des bornes), qui descend d'abord en partant de la gauche.
    expect(Math.min(...ys)).toBeCloseTo(366, 5);
    expect(Math.max(...ys)).toBeCloseTo(370, 5);
    const left = [...bottom].sort((a, b) => a.x - b.x);
    expect(left[1]!.y).toBeGreaterThan(left[0]!.y);
    expect(templates.find((t) => t.id === 'rdd-embedded')!.height).toBe(26 + 20 + 4);
  });

  it('embedded : la hauteur suit les champs, vague comprise', () => {
    const { run, shape } = setup();
    run((edit) => setFields(edit, shape('address'), 'street\ncity\nzip'));
    expect(shape('address').bounds.height).toBe(26 + 3 * 20 + 4);
    run((edit) => setSecondary(edit, shape('address'), true));
    run((edit) => setFields(edit, shape('address'), 'street'));
    expect(shape('address').bounds.height).toBeCloseTo((26 + 20 + 4) * 0.8, 5);
  });

  it('vue : jumelles discrètes en haut à droite de l’entête, les autres tables sans (sujet 220)', () => {
    const { object } = render();
    const binoculars = object('active').getObjectByName('binoculars')!;
    expect(binoculars.children).toHaveLength(5);
    const box = new Box3().setFromObject(binoculars);
    // Cadre 14 × 9 à 7 px du bord droit (800), centré dans l'entête (300 → 326) ; trait de 1 px.
    expect(box.min.x).toBeCloseTo(800 - 7 - 14 + 0.5, 0);
    expect(box.max.x).toBeLessThanOrEqual(800 - 7 + 0.5);
    expect(box.min.y).toBeGreaterThanOrEqual(300 + (26 - 9) / 2 - 0.5);
    expect(box.max.y).toBeLessThanOrEqual(300 + (26 + 9) / 2 + 0.5);
    // Couleur de la bordure, pleinement opaque (sujet 221).
    const material = (binoculars.children[0] as Mesh).material as MeshBasicMaterial;
    expect([material.color.getHexString(), material.opacity]).toEqual(['666666', 1]);
    for (const id of ['address', 'settings', 'user', 'role', 'model'])
      expect(object(id).getObjectByName('binoculars')).toBeUndefined();
  });

  it('vue : zone du titre réduite des deux côtés de la place des jumelles (sujet 221)', () => {
    const { page } = render();
    const view = page().shapes.find((s) => s.id === 'active')!;
    // 7 (bord) + 14 (jumelles) + 4 (air) = 25 px de chaque côté.
    expect(createDefaultRegistry().textZone(view, 'flat')).toEqual({ x: 665, y: 300, width: 110, height: 26 });
    const entity = page().shapes.find((s) => s.id === 'user')!;
    expect(createDefaultRegistry().textZone(entity, 'flat')).toEqual({ x: 40, y: 160, width: 160, height: 26 });
  });

  it('vue : contour arrondi, entête coupé dans ce contour', () => {
    const { object } = render();
    const view = object('active');
    const header = view.getObjectByName('fill-header') as Mesh;
    header.geometry.computeBoundingBox();
    const box = header.geometry.boundingBox!;
    expect([box.min.x, box.min.y, box.max.x, box.max.y]).toEqual([640, 300, 800, 326]);
    // Coin haut-gauche arrondi : pas de sommet au coin exact.
    const corner = [...(header.geometry.getAttribute('position').array as Float32Array)].some(
      (_, i, a) => i % 3 === 0 && a[i] === 640 && a[i + 1] === 300,
    );
    expect(corner).toBe(false);
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

  it('nom gras italique centré dans l’entête, champs alignés à gauche ligne par ligne', () => {
    const { texts } = render();
    const at = texts.findIndex((t) => t.text === 'Timestamped');
    const [name, first, second] = texts.slice(at, at + 3);
    expect([name!.text, name!.bold, name!.italic, name!.align]).toEqual(['Timestamped', true, true, 'center']);
    expect([first!.text, first!.anchorX, first!.x, first!.y]).toEqual(['created_at', 'left', 246, 40 + 26 + 10]);
    expect([second!.text, second!.y]).toEqual(['updated_at', 40 + 26 + 30]);
  });

  it('entité : id souligné en tête ; énumération : sans mention (sujet 216), nom droit', () => {
    const { texts } = render();
    const id = texts.filter((t) => t.text === 'id');
    // Entités : clé primaire soulignée ; vue : un champ `id` ordinaire.
    expect(id.map((t) => t.underline ?? false)).toEqual([true, true, true, false]);
    expect(texts.find((t) => t.text === 'email')!.underline).toBe(false);
    const at = texts.findIndex((t) => t.text === 'Role');
    expect(texts.some((t) => t.text.startsWith('«enum'))).toBe(false);
    expect(texts[at + 1]!.text).toBe('id');
    expect(texts[at]!.italic).toBe(false);
    expect(texts.find((t) => t.text === 'User')!.italic).toBe(false);
  });

  it('énumération : cadre double autour de l’entête, à 3 px dedans ; entité : cadre simple', () => {
    const { run, page, shape } = setup();
    const strokes = (id: string) => {
      const root = buildPageScene(
        page(),
        createDefaultRegistry(),
        { text: { create: () => new Object3D() } },
        'flat',
      ).root;
      return root.children
        .find((child) => child.userData.elementId === id)!
        .children.filter((c): c is Mesh => c.name === 'stroke-table');
    };
    expect(strokes('user')).toHaveLength(2);
    const inner = strokes('role')[2]!;
    inner.geometry.computeBoundingBox();
    const box = inner.geometry.boundingBox!;
    // Trait de 1 px centré sur le rectangle intérieur : bornes ± 0,5.
    expect([box.min.x, box.min.y, box.max.x, box.max.y]).toEqual([242.5, 162.5, 397.5, 183.5]);
    // Table secondaire : écart à l'échelle (2,4 px).
    run((edit) => setSecondary(edit, shape('role'), true));
    const small = strokes('role')[2]!;
    small.geometry.computeBoundingBox();
    expect(small.geometry.boundingBox!.min.x).toBeCloseTo(241.9, 3);
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
