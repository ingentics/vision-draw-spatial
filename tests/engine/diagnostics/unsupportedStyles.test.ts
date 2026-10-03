import { describe, expect, it } from 'vitest';
import { collectUnsupported } from '../../../src/engine/diagnostics/unsupportedStyles';
import { parseDrawio } from '../../../src/engine/format/parse';
import { createDefaultRegistry } from '../../../src/engine/render/shapes/registry';
import { fixture } from '../../helpers';

const xml = `<mxfile>
  <diagram id="p1" name="Archi"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
    <mxCell id="db1" value="Base" style="shape=cube;size=15;" vertex="1" parent="1"><mxGeometry width="60" height="80" as="geometry"/></mxCell>
    <mxCell id="db2" value="Cache" style="shape=cube;" vertex="1" parent="1"><mxGeometry x="100" width="60" height="80" as="geometry"/></mxCell>
    <mxCell id="ok" value="OK" style="rounded=1;" vertex="1" parent="1"><mxGeometry x="200" width="60" height="40" as="geometry"/></mxCell>
    <mxCell id="e1" style="edgeStyle=isometricEdgeStyle;endArrow=ERmandOne;startArrow=classic;" edge="1" parent="1" source="db1" target="db2"><mxGeometry relative="1" as="geometry"/></mxCell>
  </root></mxGraphModel></diagram>
  <diagram id="p2" name="Détail"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
    <mxCell id="db3" style="shape=cube;" vertex="1" parent="1"><mxGeometry width="60" height="80" as="geometry"/></mxCell>
    <mxCell id="hex" style="shape=hexagon;" vertex="1" parent="1"><mxGeometry x="100" width="60" height="80" as="geometry"/></mxCell>
  </root></mxGraphModel></diagram>
</mxfile>`;

describe('collectUnsupported', () => {
  const report = collectUnsupported(parseDrawio(xml), createDefaultRegistry());

  it('recense tout le document, trié par fréquence', () => {
    expect(report.entries.map((e) => [e.category, e.name, e.count])).toEqual([
      ['shape', 'cube', 3],
      ['endArrow', 'ERmandOne', 1],
      ['shape', 'hexagon', 1],
      ['edgeStyle', 'isometricEdgeStyle', 1],
    ]);
    expect(report.elementCount).toBe(6);
    expect(report.unsupportedElementCount).toBe(5);
  });

  it('garde pages, occurrences et un exemple de style', () => {
    const cylinder = report.entries[0]!;
    expect(cylinder.pages).toEqual(['Archi', 'Détail']);
    expect(cylinder.occurrences).toEqual([
      { pageId: 'p1', pageName: 'Archi', elementId: 'db1', label: 'Base' },
      { pageId: 'p1', pageName: 'Archi', elementId: 'db2', label: 'Cache' },
      { pageId: 'p2', pageName: 'Détail', elementId: 'db3', label: '' },
    ]);
    expect(cylinder.sampleStyle).toBe('shape=cube;size=15;');
  });

  it('fichier entièrement supporté : rapport vide', () => {
    const clean = collectUnsupported(parseDrawio(fixture('drawio-desktop.drawio')), createDefaultRegistry());
    expect(clean).toEqual({ entries: [], elementCount: 4, unsupportedElementCount: 0 });
  });
});
