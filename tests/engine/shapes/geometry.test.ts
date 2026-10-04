import { Box3, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { collectUnsupported } from '../../../src/engine/diagnostics/unsupportedStyles';
import { parseDrawio } from '../../../src/engine/format/parse';
import type { Point } from '../../../src/engine/model/types';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import type { RenderContext } from '../../../src/engine/render/types';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';

/**
 * Formes géométriques (Milestone 5) : contour 2D, volume iso, clic, nom de forme imposé. Le tracé et l'accroche
 * des flèches sont comparés à l'export de draw.io dans `shapesFixture.test.ts`.
 */

const ctx: RenderContext = { text: { create: () => new Object3D() }, volume: { depth: 20 } };
const registry = createDefaultRegistry();

/** Une page d'une forme par style, à (100, 100), de la taille donnée. */
function page(styles: string[], width: number, height: number) {
  const cells = styles
    .map(
      (style, i) =>
        `<mxCell id="s${i}" value="" style="${style}" vertex="1" parent="1">` +
        `<mxGeometry x="100" y="100" width="${width}" height="${height}" as="geometry"/></mxCell>`,
    )
    .join('');
  const document = parseDrawio(
    `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}` +
      `</root></mxGraphModel></diagram></mxfile>`,
  );
  return { document, page: document.pages[0]! };
}

const round = (points: Point[]) => points.map((p) => [+p.x.toFixed(3), +p.y.toFixed(3)]);

/** Emprise du volume en iso (x et y de page, hauteur), de la scène construite. */
function volume(style: string, width: number, height: number) {
  const { page: p } = page([style], width, height);
  const scene = buildPageScene(p, registry, ctx, 'iso');
  scene.root.updateMatrixWorld(true);
  const sides = scene.root.children.find((c) => c.userData.elementId === 's0')!.getObjectByName('sides');
  if (!sides) return undefined;
  const box = new Box3().setFromObject(sides);
  return { min: box.min.toArray().map((v) => +v.toFixed(3)), max: box.max.toArray().map((v) => +v.toFixed(3)) };
}

describe('hexagone (33)', () => {
  const STYLE = 'shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;';
  const shape = (style = STYLE, width = 120, height = 80) => page([style], width, height).page.shapes[0]!;
  const outline = (style?: string, width?: number, height?: number) => {
    const s = shape(style, width, height);
    return round(registry.resolve(s).definition.outline!(s));
  };

  it('dessiné par sa définition, absent des Diagnostics ; spatial.kind=hexagon le dessine', () => {
    const { document, page: p } = page([STYLE, 'shape=note;spatial.kind=hexagon;'], 120, 80);
    expect(p.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['hexagon', 'hexagon']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('contour : pointes à gauche et à droite, pans de size px (fixedSize=1, 20 par défaut)', () => {
    expect(outline()).toEqual([
      [120, 100],
      [200, 100],
      [220, 140],
      [200, 180],
      [120, 180],
      [100, 140],
    ]);
    // Pans bornés à la demi-largeur ; sans fixedSize, fraction de la largeur (le quart par défaut).
    expect(outline(`${STYLE}size=100;`)[0]).toEqual([160, 100]);
    expect(outline(STYLE.replace('fixedSize=1;', ''))[0]).toEqual([130, 100]);
    // Debout : pointes en haut et en bas.
    expect(outline(`${STYLE}direction=north;`)).toContainEqual([160, 100]);
  });

  it('volume : prisme du contour, de 0 à l’épaisseur (spatial.height prioritaire), à plat sans fond', () => {
    expect(volume(STYLE, 120, 80)).toEqual({ min: [100, 0, 100], max: [220, 20, 180] });
    expect(volume(`${STYLE}spatial.height=50;`, 120, 80)?.max[1]).toBe(50);
    expect(volume(`${STYLE}fillColor=none;`, 120, 80)).toBeUndefined();
  });

  it('clic : dans le contour, pas dans les coins coupés', () => {
    const s = shape();
    expect(registry.contains(s, { x: 160, y: 140 })).toBe(true);
    expect(registry.contains(s, { x: 103, y: 103 })).toBe(false);
  });
});
