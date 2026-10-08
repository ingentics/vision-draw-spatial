import { Box3, Mesh, Object3D } from 'three';
import type { Color, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { setSecondary } from '../../../../../../../src/engine/plugins/modes/rdd/tables/operations';
import { approximateMeasure } from '../../../../../../../src/engine/core/render/richLayout';
import { buildPageScene } from '../../../../../../../src/engine/core/render/pageScene';
import type { RenderContext, TextSpec } from '../../../../../../../src/engine/core/render/types';
import { setFields, setup } from '../../helpers';
import { createDefaultRegistry } from '../../../../../../../src/engine/plugins';
import { setCellStyleValue } from '../../../../../../../src/engine/core/format/cellEdits';

describe('mode RDD : opérations sur une table', () => {
  it('table neuve au style « Gris » (sujet 235) : entête #f5f5f5, bordure #666666, texte #333333', () => {
    const templates = createDefaultRegistry()
      .templates()
      .filter((t) => t.category === 'rdd' && t.id !== 'rdd-region');
    expect(templates.length).toBe(5);
    for (const template of templates) {
      expect(template.style).toContain('fillColor=#f5f5f5;fontColor=#333333;');
      expect(template.style).toContain('strokeColor=#666666;');
    }
  });
});

describe('mode RDD : taille calculée (sujet 247)', () => {
  it('pas de poignées de redimensionnement sur les tables ; la région et le document (sujet 269) gardent les leurs', () => {
    const { shape } = setup();
    const registry = createDefaultRegistry();
    expect(
      ['model', 'user', 'role', 'address', 'settings', 'active'].map((id) => registry.isResizable(shape(id))),
    ).toEqual([false, false, false, false, true, false]);
    expect(registry.isResizable(shape('accounts'))).toBe(true);
  });

  it('texte brut sur les tables, pas sur la région (sujet 258)', () => {
    const { shape } = setup();
    const registry = createDefaultRegistry();
    expect(
      ['model', 'user', 'role', 'address', 'settings', 'active'].map((id) => registry.isPlainText(shape(id))),
    ).toEqual([true, true, true, true, true, true]);
    expect(registry.isPlainText(shape('accounts'))).toBe(false);
  });
});

describe('mode RDD : embedded, document et vue (sujets 181, 218)', () => {
  const templates = createDefaultRegistry().templates();
  const style = (id: string) => templates.find((t) => t.id === id)!.style;

  it('palette : entête de 26 px, sans clé primaire ; embedded en trait plein, coins arrondis pour la vue', () => {
    for (const id of ['rdd-embedded', 'rdd-document', 'rdd-view']) {
      expect(style(id)).toContain('startSize=26;');
      expect(style(id)).not.toContain('spatial.rdd.fields');
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

  it('sans mention (sujet 218) ; document sans champs (sujet 269) ; document sans nom : « Document »', () => {
    const { texts } = render();
    expect(texts.filter((t) => t.text.includes('«'))).toEqual([]);
    expect(texts.filter((t) => t.text === 'theme' || t.text === 'locale')).toEqual([]);
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

  it('icône d’entête toujours affichée : spatial.icon=0 d’un fichier est ignoré (sujet 260)', () => {
    const { run, page, tree } = setup();
    // Écrit dans le fichier (un mode ne peut pas écrire `spatial.icon`, hors de son espace de noms : sujet 301).
    setCellStyleValue(tree.pages[0]!, 'role', 'spatial.icon', '0');
    run(() => {});
    const root = buildPageScene(
      page(),
      createDefaultRegistry(),
      { text: { create: () => new Object3D() } },
      'flat',
    ).root;
    const object = root.children.find((child) => child.userData.elementId === 'role')!;
    expect(object.getObjectByName('header-mark')).toBeDefined();
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
    if (color) run((edit) => edit.setElementStyle(shape('timestamped').id, 'fillColor', color));
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
    return { texts, object, root };
  }

  it('nom gras italique centré dans l’entête, champs alignés à gauche ligne par ligne', () => {
    const { texts } = render();
    const at = texts.findIndex((t) => t.text === 'Timestamped');
    const [name, first, second] = texts.slice(at, at + 3);
    expect([name!.text, name!.bold, name!.italic, name!.align]).toEqual(['Timestamped', true, true, 'center']);
    // Après la marge, l'icône (12) et son air (4) ; le type suit en gris (sujet 248).
    expect([first!.text, first!.anchorX, first!.x, first!.y]).toEqual(['created_at', 'left', 262, 40 + 26 + 10]);
    const label = approximateMeasure('created_at', { size: 11, bold: false, italic: false });
    expect([second!.text, second!.x, second!.y]).toEqual(['Phrase', 262 + label + 6, 40 + 26 + 10]);
    expect(`#${(second!.color as Color).getHexString()}`).toBe('#999999');
    expect(texts[at + 3]!.text).toBe('updated_at');
    expect(texts[at + 3]!.y).toBe(40 + 26 + 30);
  });

  it('icône de kind devant chaque champ, petit losange blanc si nullable ; plus de soulignement (sujet 248)', () => {
    const { texts, root } = render();
    const icons = (id: string) =>
      root.children
        .find((child) => child.userData.elementId === id)!
        .children.filter((child) => child.name === 'field-icon')
        .map((icon) => [icon.userData.kind, icon.userData.nullable, icon.getObjectByName('field-hole') !== undefined]);
    expect(icons('user')).toEqual([
      ['pk', false, false],
      ['property', false, false],
      ['fk', false, false],
    ]);
    expect(icons('secondary')).toEqual([['fk', true, true]]);
    // Vue : un champ `id` ordinaire ; entité sans clé primaire dans le fichier : `id` ajouté en tête.
    expect(icons('active')[0]).toEqual(['property', false, false]);
    expect(icons('orphan')[0]).toEqual(['pk', false, false]);
    const fill = root.children
      .find((child) => child.userData.elementId === 'user')!
      .children.find((child) => child.name === 'field-icon')!.children[0] as Mesh;
    expect(`#${(fill.material as MeshBasicMaterial).color.getHexString()}`).toBe('#ffd700');
    // Dessiné au-dessus du fond de la table (sujet 261).
    expect(fill.renderOrder).toBeGreaterThan(0);
    expect(texts.some((t) => t.underline)).toBe(false);
  });

  it('énumération : sans mention (sujet 216), nom droit', () => {
    const { texts } = render();
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
