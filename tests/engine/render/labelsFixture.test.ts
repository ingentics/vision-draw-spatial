import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../src/engine/format/parse';
import type { PageModel, ShapeModel } from '../../../src/engine/model/types';
import { TOP_OFFSET } from '../../../src/engine/render/iso/block';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';
import type { RenderContext, TextSpec } from '../../../src/engine/render/types';
import { fixture } from '../../helpers';

/**
 * Fixture `labels.drawio` (étape 31) : labels hors de la forme (`labelPosition`, `verticalLabelPosition`)
 * dans toutes les combinaisons d'alignement (`align`, `verticalAlign`), et labels dans la forme pour les
 * marges propres à draw.io. `WRITE_FIXTURES=1` la régénère ; `make drawio-check` la fait exporter en SVG
 * par draw.io : chaque texte doit être ancré au même point que le nôtre.
 */

const POSITIONS = ['left', 'center', 'right'];
const VERTICAL_POSITIONS = ['top', 'middle', 'bottom'];
const ALIGNS = ['left', 'center', 'right'];
const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'];

interface Vertex {
  id: string;
  value: string;
  style: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function layout(): Vertex[] {
  const vertices: Vertex[] = [{ id: 'ref', value: '', style: 'rounded=0;html=1;', x: 0, y: 0, w: 40, h: 40 }];
  let i = 0;
  for (const position of POSITIONS)
    for (const vertical of VERTICAL_POSITIONS)
      for (const align of ALIGNS)
        for (const verticalAlign of VERTICAL_ALIGNS) {
          const style =
            (position === 'center' ? '' : `labelPosition=${position};`) +
            (vertical === 'middle' ? '' : `verticalLabelPosition=${vertical};`) +
            (align === 'center' ? '' : `align=${align};`) +
            (verticalAlign === 'middle' ? '' : `verticalAlign=${verticalAlign};`);
          vertices.push({
            id: `l${i}`,
            value: 'Texte',
            style: `rounded=0;whiteSpace=wrap;html=1;${style}`,
            x: 200 + (i % 9) * 400,
            y: 200 + Math.floor(i / 9) * 200,
            w: 120,
            h: 60,
          });
          i++;
        }
  // Zone propre à la forme (`boundedLbl`) : ignorée par draw.io pour un label hors de la forme.
  vertices.push(
    {
      id: 'db',
      value: 'Base',
      style:
        'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=8;verticalLabelPosition=bottom;verticalAlign=top;',
      x: 200,
      y: 2200,
      w: 60,
      h: 80,
    },
    {
      id: 'cache',
      value: 'Cache',
      style: 'shape=datastore;whiteSpace=wrap;html=1;labelPosition=right;align=left;',
      x: 600,
      y: 2200,
      w: 60,
      h: 60,
    },
  );
  return vertices;
}

function build(): string {
  const cells = layout().map(
    (v) =>
      `        <mxCell id="${v.id}" value="${v.value}" style="${v.style}" vertex="1" parent="1">\n` +
      `          <mxGeometry${v.x ? ` x="${v.x}"` : ''}${v.y ? ` y="${v.y}"` : ''} width="${v.w}" height="${v.h}" as="geometry" />\n        </mxCell>`,
  );
  return `<mxfile host="Electron" agent="draw.io/24.7.5" version="24.7.5">
  <diagram name="Labels" id="labels">
    <mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
${cells.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

const registry = createDefaultRegistry();

/** Rendu d'une page en relevant les textes créés. */
function render(page: PageModel, level: 'flat' | 'iso') {
  const texts: TextSpec[] = [];
  const ctx: RenderContext = {
    text: {
      create(spec) {
        texts.push(spec);
        return new Object3D();
      },
    },
    volume: { depth: 40 },
  };
  const scene = buildPageScene(page, registry, ctx, level);
  return { scene, texts };
}

/** Hauteur du label d'un élément, depuis le sol de la page. */
function labelHeight(root: Object3D, elementId: string): number {
  const element = root.children.find((c) => c.userData.elementId === elementId)!;
  let label: Object3D | undefined;
  element.traverse((o) => {
    if (o.userData.labelCellId === elementId) label = o;
  });
  let z = 0;
  for (let o: Object3D | null = label!; o && o !== root; o = o.parent) z += o.position.z;
  return z;
}

describe('fixture labels.drawio', () => {
  it('est à jour', () => {
    const built = build();
    if (process.env.WRITE_FIXTURES === '1')
      writeFileSync(fileURLToPath(new URL('../../fixtures/labels.drawio', import.meta.url)), built);
    expect(built).toBe(fixture('labels.drawio'));
  });
});

describe('labels hors de la forme', () => {
  const page = readDrawio(build()).document.pages[0]!;
  const shapes = new Map(page.shapes.map((s) => [s.id, s]));
  /** Rectangle de la fixture dont le style ajoute `extra` au style de base. */
  const styled = (extra: string) =>
    shapes.get(layout().find((v) => v.style === `rounded=0;whiteSpace=wrap;html=1;${extra}`)!.id)!;

  it('zone de texte : les bornes décalées d’une largeur ou d’une hauteur', () => {
    const below = styled('verticalLabelPosition=bottom;verticalAlign=top;');
    expect(registry.textZone(below, 'flat')).toEqual({ ...below.bounds, y: below.bounds.y + 60 });
    const left = styled('labelPosition=left;align=right;');
    expect(registry.textZone(left, 'iso')).toEqual({ ...left.bounds, x: left.bounds.x - 120 });
    const corner = styled('labelPosition=right;verticalLabelPosition=top;');
    expect(registry.textZone(corner, 'flat')).toEqual({
      ...corner.bounds,
      x: corner.bounds.x + 120,
      y: corner.bounds.y - 60,
    });
  });

  it('zone propre à la forme (boundedLbl, anneaux du cache) ignorée hors de la forme, comme draw.io', () => {
    const db = shapes.get('db')!;
    expect(registry.textZone(db, 'flat')).toEqual({ ...db.bounds, y: db.bounds.y + 80 });
    const cache = shapes.get('cache')!;
    expect(registry.textZone(cache, 'flat')).toEqual({ ...cache.bounds, x: cache.bounds.x + 60 });
  });

  it('texte collé à la forme, marges de draw.io (2 px, +5 en haut, +1 en bas)', () => {
    const text = (shape: ShapeModel) => render({ ...page, shapes: [shape] }, 'flat').texts[0];
    const below = styled('verticalLabelPosition=bottom;verticalAlign=top;');
    expect(text(below)).toMatchObject({ anchorY: 'top', y: below.bounds.y + 60 + 7, maxWidth: 116 });
    const above = styled('verticalLabelPosition=top;verticalAlign=bottom;');
    expect(text(above)).toMatchObject({ anchorY: 'bottom', y: above.bounds.y - 3 });
    const left = styled('labelPosition=left;align=right;');
    expect(text(left)).toMatchObject({ anchorX: 'right', x: left.bounds.x - 2, y: left.bounds.y + 30 });
  });

  it('en iso : posé au sol à côté du volume ; un label dans la forme reste sur le toit', () => {
    const inside = styled('');
    const below = styled('verticalLabelPosition=bottom;verticalAlign=top;');
    const db = shapes.get('db')!;
    const { scene } = render({ ...page, shapes: [inside, below, db] }, 'iso');
    expect(labelHeight(scene.root, inside.id)).toBeCloseTo(40 + TOP_OFFSET);
    expect(labelHeight(scene.root, below.id)).toBeCloseTo(TOP_OFFSET);
    expect(labelHeight(scene.root, db.id)).toBeCloseTo(TOP_OFFSET);
  });
});

const SVG = fileURLToPath(new URL('../../fixtures/drawio-saved/labels.svg', import.meta.url));

/**
 * Point d'ancrage des textes HTML d'un export SVG de draw.io : boîte flex (`margin-left`, `width`,
 * `padding-top`) et alignement (`justify-content`, `align-items`), décalés sur la forme de référence.
 */
function drawioAnchors(svg: string): Map<string, { x: number; y: number; anchorX: string; anchorY: string }> {
  const cells = new Map<string, string>();
  for (const part of svg.split('data-cell-id="').slice(1)) cells.set(part.slice(0, part.indexOf('"')), part);
  const rect = /<rect x="([-\d.]+)" y="([-\d.]+)"/.exec(cells.get('ref') ?? '')!;
  const [dx, dy] = [-parseFloat(rect[1]!), -parseFloat(rect[2]!)];
  const flex = { 'flex-start': 0, center: 0.5, 'flex-end': 1 } as Record<string, number>;
  const anchors = new Map<string, { x: number; y: number; anchorX: string; anchorY: string }>();
  for (const [id, part] of cells) {
    const m =
      /align-items: unsafe ([\w-]+); justify-content: unsafe ([\w-]+); width: ([-\d.]+)px; height: 1px; padding-top: ([-\d.]+)px; margin-left: ([-\d.]+)px/.exec(
        part,
      );
    if (!m) continue;
    const [, items, justify, width, top, left] = m;
    anchors.set(id, {
      x: parseFloat(left!) + flex[justify!]! * parseFloat(width!) + dx,
      y: parseFloat(top!) + dy,
      anchorX: { 'flex-start': 'left', center: 'center', 'flex-end': 'right' }[justify!]!,
      anchorY: { 'flex-start': 'top', center: 'middle', 'flex-end': 'bottom' }[items!]!,
    });
  }
  return anchors;
}

describe.runIf(existsSync(SVG))('labels.drawio : textes ancrés comme dans draw.io (export SVG)', () => {
  const page = readDrawio(build()).document.pages[0]!;
  let anchors: ReturnType<typeof drawioAnchors> | undefined;
  for (const vertex of layout().filter((v) => v.value)) {
    it(`${vertex.id} ${vertex.style}`, () => {
      anchors ??= drawioAnchors(fixture('drawio-saved/labels.svg'));
      const shape = page.shapes.find((s) => s.id === vertex.id)!;
      const { texts } = render({ ...page, shapes: [shape] }, 'flat');
      const ours = texts[0]!;
      const theirs = anchors.get(vertex.id)!;
      const message = JSON.stringify({ ours: { x: ours.x, y: ours.y }, theirs });
      expect(ours.anchorX, message).toBe(theirs.anchorX);
      expect(ours.anchorY, message).toBe(theirs.anchorY);
      expect(Math.abs(ours.x - theirs.x), message).toBeLessThanOrEqual(1);
      expect(Math.abs(ours.y - theirs.y), message).toBeLessThanOrEqual(1);
    });
  }
});
