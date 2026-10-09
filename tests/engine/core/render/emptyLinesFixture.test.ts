import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { parseRichHtml } from '../../../../src/engine/core/format/richText';
import type { PageModel } from '../../../../src/engine/core/model/types';
import { buildPageScene } from '../../../../src/engine/core/render/pageScene';
import type { RenderContext, TextSpec } from '../../../../src/engine/core/render/types';
import { fixture, MEASURE } from '../../../helpers';
import { createDefaultRegistry } from '../../../../src/engine/plugins';

/**
 * Fixture `empty-lines.drawio` (sujet 407) : textes de formes et de flèches avec des lignes vides en tête, au milieu
 * et en fin, en `html=1` (tel que l'appli l'écrit, tel que l'éditeur de draw.io l'écrit, retours à la ligne
 * littéraux) et en texte brut. `WRITE_FIXTURES=1` la régénère ; `make drawio-check` la fait réenregistrer et
 * exporter en SVG par draw.io : chaque texte doit avoir le même nombre de lignes que dans draw.io.
 */

interface Cell {
  id: string;
  value: string;
  /** Lignes attendues (vides comprises), comme draw.io les affiche. */
  lines: string[];
}

const HTML_SHAPES: Cell[] = [
  { id: 'h-lead', value: '<br>a', lines: ['', 'a'] },
  { id: 'h-middle', value: 'a<br><br>b', lines: ['a', '', 'b'] },
  { id: 'h-end', value: 'a<div><br></div>', lines: ['a', ''] },
  { id: 'h-all', value: '<br>a<br><br>b<div><br></div>', lines: ['', 'a', '', 'b', ''] },
  // Éditeur de draw.io (Chrome) : une ligne par bloc, une ligne vide en `<div><br></div>`.
  {
    id: 'h-editor',
    value: '<div><br></div><div>a</div><div><br></div><div>b</div><div><br></div>',
    lines: ['', 'a', '', 'b', ''],
  },
  { id: 'h-rich', value: '<br><b>a</b><br><br>b<div><br></div>', lines: ['', 'a', '', 'b', ''] },
  // Retours à la ligne littéraux d'un label HTML : des `<br>` pour draw.io, ceux de la fin des lignes vides.
  { id: 'h-literal', value: '\na\n\nb\n', lines: ['', 'a', '', 'b', ''] },
];

const PLAIN_SHAPES: Cell[] = [
  { id: 'p-lead', value: '\na', lines: ['', 'a'] },
  { id: 'p-middle', value: 'a\n\nb', lines: ['a', '', 'b'] },
  { id: 'p-end', value: 'a\n', lines: ['a', ''] },
  { id: 'p-all', value: '\na\n\nb\n', lines: ['', 'a', '', 'b', ''] },
];

/** Flèches libres : texte principal HTML, texte principal brut, texte de début (label enfant HTML). */
const EDGES: Array<Cell & { html: boolean; child?: string }> = [
  { id: 'e-html', value: '<br>a<br><br>b<div><br></div>', lines: ['', 'a', '', 'b', ''], html: true },
  { id: 'e-plain', value: '\na\n\nb\n', lines: ['', 'a', '', 'b', ''], html: false },
  { id: 'e-start', value: '<br>a<div><br></div>', lines: ['', 'a', ''], html: true, child: 'e-start-text' },
];

const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;');

function build(): string {
  const shape = (cell: Cell, style: string, i: number) =>
    `        <mxCell id="${cell.id}" value="${escape(cell.value)}" style="${style}" vertex="1" parent="1">\n` +
    `          <mxGeometry x="${i * 160}" y="${style.includes('html') ? 0 : 200}" width="120" height="120" as="geometry" />\n` +
    `        </mxCell>`;
  const edge = (cell: (typeof EDGES)[number], i: number) => {
    const y = 400 + i * 120;
    const style = cell.html ? 'endArrow=classic;html=1;' : 'endArrow=classic;';
    const lines = [
      `        <mxCell id="${cell.id}" value="${cell.child ? '' : escape(cell.value)}" style="${style}" edge="1" parent="1">`,
      `          <mxGeometry width="50" height="50" relative="1" as="geometry">`,
      `            <mxPoint x="0" y="${y}" as="sourcePoint" />`,
      `            <mxPoint x="400" y="${y}" as="targetPoint" />`,
      `          </mxGeometry>`,
      `        </mxCell>`,
    ];
    if (cell.child)
      lines.push(
        `        <mxCell id="${cell.child}" value="${escape(cell.value)}" style="edgeLabel;html=1;align=left;verticalAlign=bottom;resizable=0;points=[];" vertex="1" connectable="0" parent="${cell.id}">`,
        `          <mxGeometry x="-1" relative="1" as="geometry">`,
        `            <mxPoint as="offset" />`,
        `          </mxGeometry>`,
        `        </mxCell>`,
      );
    return lines.join('\n');
  };
  const cells = [
    ...HTML_SHAPES.map((cell, i) => shape(cell, 'rounded=0;whiteSpace=wrap;html=1;', i)),
    ...PLAIN_SHAPES.map((cell, i) => shape(cell, 'rounded=0;whiteSpace=wrap;', i)),
    ...EDGES.map(edge),
  ];
  return `<mxfile host="Electron" agent="draw.io/24.7.5" version="24.7.5">
  <diagram name="Lignes vides" id="empty-lines">
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

/** Textes créés au rendu d'une page. */
function texts(page: PageModel): TextSpec[] {
  const created: TextSpec[] = [];
  const ctx: RenderContext = {
    ...MEASURE,
    text: {
      create(spec) {
        created.push(spec);
        return new Object3D();
      },
    },
    volume: { depth: 40 },
  };
  buildPageScene(page, registry, ctx, 'flat');
  return created;
}

/** Lignes du texte dessiné (texte riche ou texte brut). */
const drawnLines = (spec: TextSpec) =>
  spec.rich ? spec.rich.map((line) => line.map((run) => run.text).join('')) : spec.text.split('\n');

/** Texte unique dessiné pour une cellule de la fixture (forme, ou flèche avec son texte). */
function drawnText(page: PageModel, id: string): TextSpec {
  const shape = page.shapes.find((s) => s.id === id);
  const edge = page.edges.find((e) => e.id === id);
  const shown = texts({ ...page, shapes: shape ? [shape] : [], edges: edge ? [edge] : [] });
  expect(shown).toHaveLength(1);
  return shown[0]!;
}

const ALL: Array<Cell & { child?: string }> = [...HTML_SHAPES, ...PLAIN_SHAPES, ...EDGES];

describe('fixture empty-lines.drawio', () => {
  it('est à jour', () => {
    const built = build();
    if (process.env.WRITE_FIXTURES === '1')
      writeFileSync(fileURLToPath(new URL('../../../fixtures/empty-lines.drawio', import.meta.url)), built);
    expect(built).toBe(fixture('empty-lines.drawio'));
  });

  it('lignes vides en tête, au milieu et en fin dessinées (formes, flèches, texte de début)', () => {
    const page = readDrawio(build()).document.pages[0]!;
    for (const cell of ALL) expect(drawnLines(drawnText(page, cell.id)), cell.id).toEqual(cell.lines);
  });
});

const SAVED = fileURLToPath(new URL('../../../fixtures/drawio-saved/empty-lines.drawio', import.meta.url));
const SVG = fileURLToPath(new URL('../../../fixtures/drawio-saved/empty-lines.svg', import.meta.url));

describe.runIf(existsSync(SAVED))('empty-lines.drawio réenregistré par draw.io', () => {
  it('mêmes textes relus, lignes vides comprises', () => {
    const ours = readDrawio(build()).document.pages[0]!;
    const theirs = readDrawio(fixture('drawio-saved/empty-lines.drawio')).document.pages[0]!;
    const labels = (page: PageModel) =>
      Object.fromEntries([
        ...page.shapes.map((s) => [s.id, s.label]),
        ...page.edges.flatMap((e) => [[e.id, e.label], ...e.labels.map((l) => [l.id, l.label])]),
      ]);
    expect(labels(theirs)).toEqual(labels(ours));
  });
});

/** HTML affiché par draw.io pour chaque cellule (export SVG : contenu du bloc de texte de l'objet étranger). */
function drawioShownHtml(svg: string): Map<string, string> {
  const shown = new Map<string, string>();
  for (const part of svg.split('data-cell-id="').slice(1)) {
    const id = part.slice(0, part.indexOf('"'));
    const match = /pointer-events: all;[^"]*">([\s\S]*?)<\/div><\/div><\/div><\/foreignObject>/.exec(part);
    if (match) shown.set(id, match[1]!);
  }
  return shown;
}

/** Lignes de base des `<text>` d'une cellule dessinée en texte SVG (texte brut sans retour automatique). */
function drawioTextBaselines(svg: string, id: string): number[] {
  const part = svg.split(`data-cell-id="${id}"`)[1]!.split('data-cell-id=')[0]!;
  return [...part.matchAll(/<text x="[-\d.]+" y="([-\d.]+)">/g)].map((m) => parseFloat(m[1]!));
}

describe.runIf(existsSync(SVG))('empty-lines.drawio : autant de lignes que dans draw.io (export SVG)', () => {
  const page = readDrawio(build()).document.pages[0]!;
  let svg: string | undefined;
  let shown: Map<string, string> | undefined;
  for (const cell of ALL.filter((c) => c.id !== 'e-plain')) {
    it(cell.id, () => {
      svg ??= fixture('drawio-saved/empty-lines.svg');
      shown ??= drawioShownHtml(svg);
      const html = shown.get(cell.child ?? cell.id);
      expect(html, cell.id).toBeDefined();
      // Lignes du HTML affiché par draw.io (après ses conversions : retours littéraux, lignes vides finales).
      expect(drawnLines(drawnText(page, cell.id)).length, html).toBe(parseRichHtml(html!).length);
    });
  }

  it('e-plain : texte SVG de draw.io centré sur autant de lignes, lignes vides comprises', () => {
    svg ??= fixture('drawio-saved/empty-lines.svg');
    // draw.io ne dessine pas les lignes vides : « a » (ligne 1) et « b » (ligne 3) ; leur milieu (ligne 2) est au
    // centre du bloc (à la ligne de base près, moins d'une demi-ligne) seulement si le bloc compte 5 lignes.
    const [a, b] = drawioTextBaselines(svg, 'e-plain');
    const spec = drawnText(page, 'e-plain');
    const count = drawnLines(spec).length;
    const lineHeight = (b! - a!) / 2;
    const offset = (a! + b!) / 2 - spec.y - (2 - (count - 1) / 2) * lineHeight;
    expect(count).toBe(5);
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThan(lineHeight / 2);
  });
});
