import { Box3, Mesh, Object3D } from 'three';
import type { MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { documentFromTree, readDrawio } from '../../../src/engine/format/parse';
import { applyModeEdit } from '../../../src/engine/modes/edit';
import { createDefaultModeRegistry } from '../../../src/engine/modes/registry';
import { definition as rdd } from '../../../src/engine/modes/rdd';
import { FIELDS, ICON, SECONDARY, fieldsOf, tableFields } from '../../../src/engine/modes/rdd/tables';
import { fieldsText, setFields, setHeaderColor, setSecondary } from '../../../src/engine/modes/rdd/operations';
import { REGION, regionContent, regionOf, regionStroke } from '../../../src/engine/modes/rdd/regions';
import { regionOutline, tabPath, tabRect } from '../../../src/engine/modes/rdd/shapes/region';
import { pickElement } from '../../../src/engine/interaction/pick';
import { approximateMeasure } from '../../../src/engine/render/richLayout';
import type { ModeEdit } from '../../../src/engine/modes/types';
import type { Point, ShapeModel } from '../../../src/engine/model/types';
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
      ['rdd-region', 'Région'],
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
      'rdd-region',
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
    expect(page().shapes.slice(1, 4).map(fieldsOf)).toEqual([[], ['created_at', 'updated_at'], ['author']]);
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
    const model = page().shapes.find((s) => s.id === 'model')!;
    const entity = page().shapes.find((s) => s.id === 'user')!;
    expect(properties.map((p) => [p.label, p.hidden!(page(), model)])).toEqual([
      ['Couleur', false],
      ['Table secondaire', false],
      ['Icône', true],
      ['Clé primaire', true],
      ['Champs', false],
    ]);
    // Entité : sans icône d'entête ; « Icône » n'est proposée qu'aux tables qui en ont une.
    expect(properties.map((p) => p.hidden!(page(), entity))).toEqual([false, false, true, false, false]);
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

  it('icônes d’entête : jumelles (vue), liste (énumération), prise (embedded, 223), en haut à droite (sujets 220, 222)', () => {
    const { object, page } = render();
    const markOf = (id: string) => object(id).getObjectByName('header-mark');
    expect(['active', 'role', 'address'].map((id) => markOf(id)!.userData.mark)).toEqual([
      'binoculars',
      'list',
      'plug',
    ]);
    expect(['active', 'role', 'address'].map((id) => markOf(id)!.children.length)).toEqual([5, 6, 4]);
    for (const id of ['active', 'role', 'address']) {
      const shape = page().shapes.find((s) => s.id === id)!;
      const { x, y, width } = shape.bounds;
      const box = new Box3().setFromObject(markOf(id)!);
      // Cadre de 21 × 13,5 (14 × 9 agrandi 1,5 fois) à 7 px du bord droit, centré dans l'entête (26 px) ; trait de 1 px.
      expect(box.min.x, id).toBeGreaterThanOrEqual(x + width - 7 - 21 - 0.5);
      expect(box.max.x, id).toBeLessThanOrEqual(x + width - 7 + 0.5);
      expect(box.min.y, id).toBeGreaterThanOrEqual(y + (26 - 13.5) / 2 - 0.5);
      expect(box.max.y, id).toBeLessThanOrEqual(y + (26 + 13.5) / 2 + 0.5);
      // Assez grande pour se lire : au moins 12 px de large.
      expect(box.max.x - box.min.x, id).toBeGreaterThan(12);
    }
    // Couleur de la bordure, pleinement opaque (sujet 221).
    const material = (markOf('active')!.children[0] as Mesh).material as MeshBasicMaterial;
    expect([material.color.getHexString(), material.opacity]).toEqual(['666666', 1]);
    for (const id of ['settings', 'user', 'model']) expect(markOf(id), id).toBeUndefined();
  });

  it('« Icône » décochée : spatial.icon=0, icône masquée, titre sur toute la largeur ; recochée : retirée (222)', () => {
    const { run, page } = setup();
    const icon = rdd.shapeProperties!.find((p) => p.label === 'Icône')!;
    const role = () => page().shapes.find((s) => s.id === 'role')!;
    expect([icon.hidden!(page(), role()), icon.value!(page(), role())]).toEqual([false, '1']);
    run((edit) => icon.write!(edit, role(), undefined));
    expect(spatialValue(role(), ICON)).toBe('0');
    expect(icon.value!(page(), role())).toBeUndefined();
    expect(createDefaultRegistry().textZone(role(), 'flat')).toEqual({ x: 240, y: 160, width: 160, height: 26 });
    const root = buildPageScene(
      page(),
      createDefaultRegistry(),
      { text: { create: () => new Object3D() } },
      'flat',
    ).root;
    const object = root.children.find((child) => child.userData.elementId === 'role')!;
    expect(object.getObjectByName('header-mark')).toBeUndefined();
    run((edit) => icon.write!(edit, role(), '1'));
    expect(spatialValue(role(), ICON)).toBeUndefined();
  });

  it('zone du titre réduite des deux côtés de la place de l’icône d’entête (sujets 221, 222)', () => {
    const { page } = render();
    const zone = (id: string) =>
      createDefaultRegistry().textZone(
        page().shapes.find((s) => s.id === id)!,
        'flat',
      );
    // 7 (bord) + 21 (icône) + 4 (air) = 32 px de chaque côté.
    expect(zone('active')).toEqual({ x: 672, y: 300, width: 96, height: 26 });
    expect(zone('role')).toEqual({ x: 272, y: 160, width: 96, height: 26 });
    expect(zone('address')).toEqual({ x: 72, y: 300, width: 96, height: 26 });
    expect(zone('user')).toEqual({ x: 40, y: 160, width: 160, height: 26 });
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

describe('mode RDD : région (sujet 182)', () => {
  const templates = createDefaultRegistry().templates();

  it('palette : rectangle léger, label gras en haut à gauche, posé au fond de la pile', () => {
    const region = templates.find((t) => t.id === 'rdd-region')!;
    expect(region.style).toContain('rounded=0;');
    expect(region.style).toContain('fillColor=#dae8fc;fillOpacity=10;strokeColor=#828b97;');
    // Label en 9 px, sans marge ajoutée (sujet 226) ; dans draw.io, posé au-dessus de la région à gauche dans un cadre
    // de la couleur de la bordure, comme l'onglet (sujet 227).
    expect(region.style).toContain('labelBorderColor=#828b97;fontColor=#000000;');
    expect(region.style).not.toContain('labelBackgroundColor');
    expect(region.style).toContain('align=left;verticalAlign=bottom;verticalLabelPosition=top;fontStyle=1;fontSize=9;');
    expect(region.style).not.toContain('spacing');
    expect(region.style).toContain('spatial.kind=rdd-region;');
    expect(region.atBack).toBe(true);
    expect(regionStroke('#dae8fc')).toBe('#828b97');
  });

  it('contenu : les formes du mode dont le coin haut-gauche est dans la région', () => {
    const { page, shape } = setup();
    expect(regionContent(page(), shape('accounts')).sort()).toEqual(['role', 'user']);
    expect(regionOf(page(), shape('orphan'))).toBeUndefined();
    // Une table n'emporte rien ; le mode déclare le contenu de la région comme emporté.
    expect(regionContent(page(), shape('user'))).toEqual([]);
    expect(rdd.carries!(page(), shape('accounts')).sort()).toEqual(['role', 'user']);
  });

  it('régions imbriquées : une forme appartient à la plus petite, la grande emporte tout', () => {
    const { document } = readDrawio(`<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" />
      <mxCell id="big" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="500" as="geometry" /></mxCell>
      <mxCell id="small" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="200" as="geometry" /></mxCell>
      <mxCell id="twin" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="200" as="geometry" /></mxCell>
      <mxCell id="inner" value="" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="150" width="160" height="46" as="geometry" /></mxCell>
      <mxCell id="outer" value="" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="350" y="350" width="160" height="46" as="geometry" /></mxCell>
      <mxCell id="note" value="" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="20" y="20" width="40" height="40" as="geometry" /></mxCell>
    </root></mxGraphModel></diagram></mxfile>`);
    const page = document.pages[0]!;
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    // Deux régions de même taille ne se contiennent pas : la table va à la première trouvée des deux.
    expect(regionOf(page, shape('inner'))?.id).toBe('small');
    expect(regionOf(page, shape('small'))?.id).toBe('big');
    expect(regionOf(page, shape('twin'))?.id).toBe('big');
    // Une forme hors du mode n'est jamais contenue.
    expect(regionOf(page, shape('note'))).toBeUndefined();
    expect(regionContent(page, shape('small'))).toEqual(['inner']);
    expect(regionContent(page, shape('big')).sort()).toEqual(['inner', 'outer', 'small', 'twin']);
  });

  it('onglet du nom (sujet 227) : au-dessus du coin haut-gauche, coin carré, fini par un S jusqu’au bord haut', () => {
    const { page, shape } = setup();
    const region = shape('accounts');
    const rect = tabRect(region)!;
    const { height, curve } = REGION.tab;
    expect([rect.x, rect.y, rect.height]).toEqual([20, 130 - height, height]);
    const path = tabPath(region)!;
    // Bord gauche dans le prolongement de la région, coin haut-gauche carré.
    expect(path.slice(0, 2)).toEqual([
      { x: 20, y: 130 },
      { x: 20, y: 130 - height },
    ]);
    // S : part à l'horizontale du haut, finit à l'horizontale sur le bord haut, descend sans jamais remonter.
    const s = path.slice(2);
    expect(s[0]).toEqual({ x: 20 + rect.width, y: 130 - height });
    expect(s.at(-1)).toEqual({ x: 20 + rect.width + curve, y: 130 });
    expect(s.every((p, i) => i === 0 || (p.y >= s[i - 1]!.y && p.x > s[i - 1]!.x))).toBe(true);
    expect(s[1]!.y - s[0]!.y).toBeLessThan(s[6]!.y - s[5]!.y);
    // Même marge des deux côtés du nom : du bord gauche, et jusqu'au milieu du S (sujet 228).
    const nameWidth = approximateMeasure('Comptes', { size: 9, bold: true, italic: false });
    const { padding } = REGION.tab;
    expect(rect.x + rect.width + curve / 2 - (20 + padding + nameWidth)).toBeCloseTo(padding, 6);
    // Éditeur en place exactement sur le nom : sa zone, aligné à gauche, centré en hauteur, sans marge.
    const registry = createDefaultRegistry();
    expect(registry.textZone(region, 'flat')).toEqual({ x: 20 + padding, y: 130 - height, width: nameWidth, height });
    expect(registry.editStyle(region)).toMatchObject({
      align: 'left',
      verticalAlign: 'middle',
      spacing: '0',
      labelBackgroundColor: 'none',
    });
    // Sans nom : pas d'onglet.
    expect(tabPath({ ...region, label: ' ' })).toBeUndefined();
    // Un seul contour, région et onglet : le haut de l'onglet, le S, puis le reste du rectangle.
    const outline = regionOutline(region);
    expect(outline.slice(0, s.length + 1)).toEqual([{ x: 20, y: 130 - height }, ...s]);
    expect(outline.slice(-3)).toEqual([
      { x: 420, y: 130 },
      { x: 420, y: 260 },
      { x: 20, y: 260 },
    ]);
    // L'onglet se clique comme la région.
    const shapes = createDefaultRegistry();
    const options = {
      edgeTolerance: 4,
      edgeRoute: () => undefined,
      contains: (s: ShapeModel, p: Point) => shapes.contains(s, p),
      hitBounds: (s: ShapeModel) => shapes.hitBounds(s),
    };
    expect(pickElement(page(), { x: 25, y: 130 - height / 2 }, options)?.element.id).toBe('accounts');
    expect(pickElement(page(), { x: 300, y: 130 - height / 2 }, options)).toBeUndefined();
  });

  it('couleur de la région : fond et bordure assortie ; réglages de table masqués', () => {
    const { run, page, shape } = setup();
    const color = rdd.shapeProperties!.find((p) => p.label === 'Couleur')!;
    expect(rdd.shapeProperties!.map((p) => p.hidden!(page(), shape('accounts')))).toEqual([
      false,
      true,
      true,
      true,
      true,
    ]);
    run((edit) => color.write!(edit, shape('accounts'), '#d5e8d4'));
    const stroke = regionStroke('#d5e8d4');
    expect(shape('accounts').style).toMatchObject({
      fillColor: '#d5e8d4',
      strokeColor: stroke,
      labelBorderColor: stroke,
    });
    expect(shape('accounts').style.labelBackgroundColor).toBeUndefined();
    // Texte lisible sur le fond posé à 10 % : noir, même sur une couleur sombre.
    expect(shape('accounts').style.fontColor).toBe('#000000');
    run((edit) => color.write!(edit, shape('accounts'), '#1f3a5f'));
    expect(shape('accounts').style.fontColor).toBe('#000000');
  });
});

describe('mode RDD : la région s’étend quand on y pose une forme qui dépasse (sujet 183)', () => {
  const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />
    <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
    <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="150" as="geometry" /></mxCell>
    <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="120" width="160" height="46" as="geometry" /></mxCell>
    <mxCell id="note" value="" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="450" y="250" width="100" height="100" as="geometry" /></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;
  const setupPage = () => {
    const { document, tree } = readDrawio(xml);
    let page = document.pages[0]!;
    const run = (operation: (edit: ModeEdit) => void) => {
      const changed = applyModeEdit(page, tree.pages[0]!, operation);
      page = documentFromTree(tree).pages[0]!;
      return changed;
    };
    const bounds = (id: string) => page.shapes.find((s) => s.id === id)!.bounds;
    const place = (id: string, x: number, y: number) => {
      run((edit) => edit.setShapeBounds(id, { ...bounds(id), x, y }));
      return run((edit) => rdd.placed!(edit, [id]));
    };
    return { bounds, place };
  };

  it('la région s’agrandit vers la droite et le bas, 20 px de marge ; sa région englobante suit', () => {
    const { bounds, place } = setupPage();
    expect(REGION.margin).toBe(20);
    // T dépasse à droite de Small (310 > 300) : Small va jusqu'à 330.
    expect(place('t', 150, 120)).toBe(true);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 230, height: 150 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
    // Coin toujours dans Small, plus bas et à droite : Small passe à 400 × 206 et dépasse Big par le bas, qui
    // s'agrandit à son tour (marge autour de Small).
    place('t', 320, 240);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 400, height: 206 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 520, height: 326 });
    // Coin hors de Small mais dans Big : seule Big s'agrandit.
    place('t', 510, 320);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 400, height: 206 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 690, height: 386 });
  });

  it('ni rétrécie ni changée si la forme tient ; une forme hors du mode ou hors région ne change rien', () => {
    const { bounds, place } = setupPage();
    expect(place('t', 110, 110)).toBe(false);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 200, height: 150 });
    expect(place('note', 450, 250)).toBe(false);
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
    expect(place('t', 700, 700)).toBe(false);
  });
});

describe('mode RDD : le contenu d’une région est devant elle (sujet 230)', () => {
  it('à la pose, les régions passent au fond, les plus englobantes derrière ; draw.io garde l’ordre', () => {
    // Ordre du fichier à l'envers : la table, puis la petite région, puis la grande.
    const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" />
      <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="120" width="100" height="46" as="geometry" /></mxCell>
      <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="150" as="geometry" /></mxCell>
      <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
      <mxCell id="other" value="Other" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="600" y="0" width="100" height="100" as="geometry" /></mxCell>
    </root></mxGraphModel></diagram></mxfile>`;
    const { document, tree } = readDrawio(xml);
    const page = document.pages[0]!;
    expect(applyModeEdit(page, tree.pages[0]!, (edit) => rdd.placed!(edit, ['t']))).toBe(true);
    const order = () => documentFromTree(tree).pages[0]!.shapes.map((s) => s.id);
    expect(order()).toEqual(['big', 'other', 'small', 't']);
    // Déjà en ordre : rien ne change.
    const again = documentFromTree(tree).pages[0]!;
    expect(applyModeEdit(again, tree.pages[0]!, (edit) => rdd.placed!(edit, ['t']))).toBe(false);
    expect(order()).toEqual(['big', 'other', 'small', 't']);
  });
});
