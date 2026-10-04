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

describe('octogone (34)', () => {
  const STYLE = 'whiteSpace=wrap;html=1;shape=mxgraph.basic.octagon2;align=center;verticalAlign=middle;dx=15;';
  const shape = (style = STYLE, width = 100, height = 100) => page([style], width, height).page.shapes[0]!;
  const outline = (style?: string, width?: number, height?: number) => {
    const s = shape(style, width, height);
    return round(registry.resolve(s).definition.outline!(s));
  };

  it('dessiné par sa définition, absent des Diagnostics ; spatial.kind=octagon le dessine', () => {
    const { document, page: p } = page([STYLE, 'shape=note;spatial.kind=octagon;'], 100, 100);
    expect(p.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['octagon', 'octagon']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('contour : coins coupés de 2 × dx, au plus la moitié du petit côté', () => {
    expect(outline()).toEqual([
      [130, 100],
      [170, 100],
      [200, 130],
      [200, 170],
      [170, 200],
      [130, 200],
      [100, 170],
      [100, 130],
    ]);
    expect(outline(`${STYLE}dx=40;`, 160, 80)[0]).toEqual([140, 100]);
    // Sans dx : 0,5 (coins coupés d'un pixel).
    expect(outline(STYLE.replace('dx=15;', ''))[0]).toEqual([101, 100]);
  });

  it('volume : prisme du contour, à plat sans fond', () => {
    expect(volume(STYLE, 100, 100)).toEqual({ min: [100, 0, 100], max: [200, 20, 200] });
    expect(volume(`${STYLE}fillColor=none;`, 100, 100)).toBeUndefined();
  });

  it('clic : dans le contour, pas dans les coins coupés', () => {
    const s = shape();
    expect(registry.contains(s, { x: 150, y: 150 })).toBe(true);
    expect(registry.contains(s, { x: 105, y: 105 })).toBe(false);
  });
});

describe('pentagone (35)', () => {
  const STYLE = 'whiteSpace=wrap;html=1;shape=mxgraph.basic.pentagon';
  const shape = (style = STYLE, width = 97, height = 90) => page([style], width, height).page.shapes[0]!;

  it('dessiné par sa définition, absent des Diagnostics ; spatial.kind=pentagon le dessine', () => {
    const { document, page: p } = page([STYLE, 'shape=note;spatial.kind=pentagon;'], 100, 90);
    expect(p.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['pentagon', 'pentagon']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('contour : le stencil de draw.io (pointe en haut) étiré dans les bornes', () => {
    const s = shape();
    expect(round(registry.resolve(s).definition.outline!(s))).toEqual([
      [118.5, 190],
      [100, 133],
      [148.5, 100],
      [197, 133],
      [178.5, 190],
    ]);
    const wide = shape(STYLE, 194, 45);
    expect(round(registry.resolve(wide).definition.outline!(wide))[2]).toEqual([197, 100]);
  });

  it('volume : prisme du contour ; clic dans le contour, pas dans les coins vides', () => {
    expect(volume(STYLE, 100, 90)).toEqual({ min: [100, 0, 100], max: [200, 20, 190] });
    const s = shape();
    expect(registry.contains(s, { x: 148, y: 150 })).toBe(true);
    expect(registry.contains(s, { x: 103, y: 103 })).toBe(false);
  });
});

describe('triangles (36)', () => {
  const STYLE = 'triangle;whiteSpace=wrap;html=1;';
  const UP = `${STYLE}direction=north;`;
  const shape = (style = STYLE, width = 60, height = 80) => page([style], width, height).page.shapes[0]!;
  const outline = (style?: string, width?: number, height?: number) => {
    const s = shape(style, width, height);
    return round(registry.resolve(s).definition.outline!(s));
  };

  it('dessinés par leur définition, absents des Diagnostics ; spatial.kind les dessine', () => {
    const { document, page: p } = page([STYLE, UP, 'shape=note;spatial.kind=triangle;'], 60, 80);
    expect(p.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['triangle', 'triangle-up', 'triangle']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('contour : pointe au milieu du bord droit ; vers le haut avec direction=north', () => {
    expect(outline()).toEqual([
      [100, 100],
      [160, 140],
      [100, 180],
    ]);
    expect(outline(UP, 80, 60)).toEqual([
      [100, 160],
      [140, 100],
      [180, 160],
    ]);
  });

  it('volume : prisme du contour ; clic dans le contour, pas dans les coins vides', () => {
    expect(volume(STYLE, 60, 80)).toEqual({ min: [100, 0, 100], max: [160, 20, 180] });
    const s = shape();
    expect(registry.contains(s, { x: 120, y: 140 })).toBe(true);
    expect(registry.contains(s, { x: 155, y: 105 })).toBe(false);
  });
});

describe('parallélogramme (37)', () => {
  const STYLE = 'shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;';
  const shape = (style = STYLE, width = 120, height = 60) => page([style], width, height).page.shapes[0]!;
  const outline = (style?: string, width?: number, height?: number) => {
    const s = shape(style, width, height);
    return round(registry.resolve(s).definition.outline!(s));
  };

  it('dessiné par sa définition, absent des Diagnostics ; spatial.kind=parallelogram le dessine', () => {
    const { document, page: p } = page([STYLE, 'shape=note;spatial.kind=parallelogram;'], 120, 60);
    expect(p.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['parallelogram', 'parallelogram']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('contour : côtés obliques décalés de size px (fixedSize=1), sinon d’une fraction de la largeur', () => {
    expect(outline()).toEqual([
      [100, 160],
      [120, 100],
      [220, 100],
      [200, 160],
    ]);
    expect(outline(STYLE.replace('fixedSize=1;', ''))[1]).toEqual([124, 100]);
  });

  it('volume : prisme du contour ; clic dans le contour, pas dans les coins vides', () => {
    expect(volume(STYLE, 120, 60)).toEqual({ min: [100, 0, 100], max: [220, 20, 160] });
    const s = shape();
    expect(registry.contains(s, { x: 160, y: 130 })).toBe(true);
    expect(registry.contains(s, { x: 103, y: 103 })).toBe(false);
  });
});

describe('étape (38)', () => {
  const STYLE = 'shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;';
  const shape = (style = STYLE, width = 120, height = 80) => page([style], width, height).page.shapes[0]!;
  const outline = (style?: string, width?: number, height?: number) => {
    const s = shape(style, width, height);
    return round(registry.resolve(s).definition.outline!(s));
  };

  it('dessinée par sa définition, absente des Diagnostics ; spatial.kind=step la dessine', () => {
    const { document, page: p } = page([STYLE, 'shape=note;spatial.kind=step;'], 120, 80);
    expect(p.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['step', 'step']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('contour : encoche à gauche, pointe à droite, de size px (fixedSize=1), sinon fraction de la largeur', () => {
    expect(outline()).toEqual([
      [100, 100],
      [200, 100],
      [220, 140],
      [200, 180],
      [100, 180],
      [120, 140],
    ]);
    expect(outline(STYLE.replace('fixedSize=1;', ''))[5]).toEqual([124, 140]);
  });

  it('volume : prisme du contour ; clic dans le contour, pas dans l’encoche', () => {
    expect(volume(STYLE, 120, 80)).toEqual({ min: [100, 0, 100], max: [220, 20, 180] });
    const s = shape();
    expect(registry.contains(s, { x: 160, y: 140 })).toBe(true);
    expect(registry.contains(s, { x: 105, y: 140 })).toBe(false);
  });
});

describe('étoile à 4 branches (39)', () => {
  const STYLE = 'verticalLabelPosition=bottom;verticalAlign=top;html=1;shape=mxgraph.basic.4_point_star_2;dx=0.8;';
  const shape = (style = STYLE, width = 100, height = 100) => page([style], width, height).page.shapes[0]!;
  const outline = (style?: string, width?: number, height?: number) => {
    const s = shape(style, width, height);
    return round(registry.resolve(s).definition.outline!(s));
  };

  it('dessinée par sa définition, absente des Diagnostics ; spatial.kind=four-point-star la dessine', () => {
    const { document, page: p } = page([STYLE, 'shape=note;spatial.kind=four-point-star;'], 100, 100);
    expect(p.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['four-point-star', 'four-point-star']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('contour : pointes au milieu des côtés, creux à dx / 2 des bornes', () => {
    expect(outline()).toEqual([
      [100, 150],
      [140, 140],
      [150, 100],
      [160, 140],
      [200, 150],
      [160, 160],
      [150, 200],
      [140, 160],
    ]);
    expect(outline(`${STYLE}dx=0.2;`)[1]).toEqual([110, 110]);
  });

  it('volume : prisme du contour, arêtes verticales aux pointes et aux creux ; clic hors des creux', () => {
    expect(volume(STYLE, 100, 100)).toEqual({ min: [100, 0, 100], max: [200, 20, 200] });
    const { page: p } = page([STYLE], 100, 100);
    const scene = buildPageScene(p, registry, ctx, 'iso');
    const star = scene.root.children.find((c) => c.userData.elementId === 's0')!;
    expect(star.getObjectByName('stroke-vertical')).toBeDefined();
    const s = shape();
    expect(registry.contains(s, { x: 150, y: 150 })).toBe(true);
    expect(registry.contains(s, { x: 120, y: 120 })).toBe(false);
  });
});

describe('étoile à 6 branches (40)', () => {
  const STYLE = 'verticalLabelPosition=bottom;verticalAlign=top;html=1;shape=mxgraph.basic.6_point_star';
  const shape = (style = STYLE, width = 96, height = 84.5) => page([style], width, height).page.shapes[0]!;

  it('dessinée par sa définition, absente des Diagnostics ; spatial.kind=six-point-star la dessine', () => {
    const { document, page: p } = page([STYLE, 'shape=note;spatial.kind=six-point-star;'], 100, 90);
    expect(p.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['six-point-star', 'six-point-star']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('contour : le stencil de draw.io (12 sommets) étiré dans les bornes', () => {
    const s = shape();
    const points = round(registry.resolve(s).definition.outline!(s));
    expect(points).toHaveLength(12);
    expect(points[0]).toEqual([123, 128.9]);
    expect(points[5]).toEqual([196, 142.2]);
    const wide = shape(STYLE, 192, 84.5);
    expect(round(registry.resolve(wide).definition.outline!(wide))[5]).toEqual([292, 142.2]);
  });

  it('volume : prisme du contour, arêtes verticales ; clic dans le contour, pas entre les branches', () => {
    expect(volume(STYLE, 96, 84.5)).toEqual({ min: [100, 0, 100], max: [196, 20, 184.5] });
    const s = shape();
    expect(registry.contains(s, { x: 148, y: 142 })).toBe(true);
    expect(registry.contains(s, { x: 105, y: 105 })).toBe(false);
  });
});
