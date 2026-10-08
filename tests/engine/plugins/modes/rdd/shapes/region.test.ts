import { describe, expect, it } from 'vitest';
import { REGION } from '../../../../../../src/engine/plugins/modes/rdd/regions/regionLayout';
import {
  definition,
  regionOutline,
  tabPath,
  tabRect,
} from '../../../../../../src/engine/plugins/modes/rdd/shapes/region';
import { pickElement } from '../../../../../../src/engine/core/interaction/pick';
import { approximateMeasure } from '../../../../../../src/engine/core/render/richLayout';
import type { Point, ShapeModel } from '../../../../../../src/engine/core/model/types';
import type { RenderContext } from '../../../../../../src/engine/core/render/types';
import type { Mesh } from 'three';
import { Box3, Object3D } from 'three';
import { setup } from '../helpers';
import { createDefaultRegistry } from '../../../../../../src/engine/plugins';
import { MEASURE } from '../../../../../helpers';

describe('mode RDD : région (sujet 182)', () => {
  const templates = createDefaultRegistry().templates();

  it('palette : rectangle léger, label gras en haut à gauche, posé au fond de la pile', () => {
    const region = templates.find((t) => t.id === 'rdd-region')!;
    expect(region.style).toContain('rounded=0;');
    // Style Bleu de l'appli (sujet 345).
    expect(region.style).toContain('fillColor=#dae8fc;strokeColor=#6c8ebf;');
    // Fond opaque (sujet 232).
    expect(region.style).not.toContain('fillOpacity');
    // Label en 9 px, sans marge ajoutée (sujet 226) ; dans draw.io, posé au-dessus de la région à gauche dans un cadre
    // de la couleur de la bordure, comme l'onglet (sujet 227).
    expect(region.style).toContain('labelBorderColor=#6c8ebf;fontColor=#000000;');
    expect(region.style).not.toContain('labelBackgroundColor');
    expect(region.style).toContain('align=left;verticalAlign=bottom;verticalLabelPosition=top;fontStyle=1;fontSize=9;');
    expect(region.style).not.toContain('spacing');
    expect(region.style).toContain('spatial.kind=rdd-region;');
    expect(region.atBack).toBe(true);
    // Taille d'une région neuve (sujet 233).
    expect([region.width, region.height]).toEqual([200, 80]);
  });

  it('sélectionnée, ni contour ni voile : style « none » imposé, poignées gardées (sujet 330)', () => {
    const registry = createDefaultRegistry();
    const region = setup().shape('accounts');
    expect(definition.selectionStyle).toBe('none');
    expect(registry.selectionStyle(region)).toBe('none');
    expect(registry.selectionStyle(region, 2)).toBe('outline');
    expect(registry.isResizable(region)).toBe(true);
  });

  it('poignée haut-gauche au coin de l’onglet, au coin de la région sans nom (sujet 344)', () => {
    const registry = createDefaultRegistry();
    const region = setup().shape('accounts');
    expect(registry.movedHandles(region)).toEqual({ nw: { x: 20, y: 130 - REGION.tab.height } });
    expect(registry.movedHandles({ ...region, label: ' ' })).toEqual({});
  });

  it('onglet du nom (sujet 227) : au-dessus du coin haut-gauche, coin carré, fini par un S jusqu’au bord haut', () => {
    const { page, shape } = setup();
    const region = shape('accounts');
    const rect = tabRect(region, MEASURE)!;
    const { height, curve } = REGION.tab;
    expect([rect.x, rect.y, rect.height]).toEqual([20, 130 - height, height]);
    const path = tabPath(region, MEASURE)!;
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
    expect(tabPath({ ...region, label: ' ' }, MEASURE)).toBeUndefined();
    // Un seul contour, région et onglet : le haut de l'onglet, le S, puis le reste du rectangle.
    const outline = regionOutline(region, MEASURE);
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

  it('onglet mesuré par la mesure du moteur (sujet 377) : deux registres de mesures différentes ne se gênent pas', () => {
    const region = setup().shape('accounts');
    const narrow = createDefaultRegistry().measuringWith(() => 10);
    const wide = createDefaultRegistry()
      .measuringWith(() => 100)
      .reportingTo(() => undefined);
    const right = (registry: typeof narrow) => {
      const { x, width } = registry.hitBounds({ ...region, bounds: { ...region.bounds, width: 20 } });
      return x + width;
    };
    // Onglet plus large que la région : son bord droit (S compris) suit la largeur mesurée du nom.
    const { padding, curve } = REGION.tab;
    expect(right(narrow)).toBe(region.bounds.x + 2 * padding + 10 + curve / 2);
    expect(right(wide)).toBe(region.bounds.x + 2 * padding + 100 + curve / 2);
    // Rendu : l'onglet dessiné suit la mesure du contexte, comme la prise au clic suit celle du registre.
    const drawnRight = (measureText: (text: string) => number) => {
      const small = { ...region, bounds: { ...region.bounds, width: 20 } };
      const group = definition.flat.create(small, { measureText, text: { create: () => new Object3D() } });
      return new Box3().setFromObject(group.getObjectByName('stroke')!).max.x;
    };
    expect(drawnRight(() => 100) - drawnRight(() => 10)).toBeCloseTo(90);
    expect(narrow.textZone(region, 'flat').width).toBe(10);
    expect(wide.textZone(region, 'flat').width).toBe(100);
  });

  it('bordure en pointillé avec `dashed=1`, aucune sans épaisseur (dette 308)', () => {
    const { shape } = setup();
    const region = shape('accounts');
    const ctx: RenderContext = { ...MEASURE, text: { create: () => new Object3D() } };
    const border = (style: Record<string, string>) =>
      definition.flat.create({ ...region, style: { ...region.style, ...style } }, ctx).getObjectByName('stroke') as
        Mesh | undefined;
    const solid = border({})!.geometry.getAttribute('position').count;
    const dashed = border({ dashed: '1' })!.geometry.getAttribute('position').count;
    expect(dashed).toBeGreaterThan(solid * 10);
    expect(border({ strokeWidth: '0' })).toBeUndefined();
  });
});
