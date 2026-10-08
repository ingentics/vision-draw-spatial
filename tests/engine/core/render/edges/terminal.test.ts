import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { toTerminal } from '../../../../../src/engine/core/render/edges/terminal';

const FILE =
  '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="o" vertex="1" parent="1" style="ellipse;fillColor=#fff;"><mxGeometry x="10" y="20" width="100" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="r" vertex="1" parent="1" style=""><mxGeometry x="0" y="0" width="40" height="40" as="geometry"/></mxCell>' +
  '</root></mxGraphModel></diagram></mxfile>';

describe('bout de tracé d’une forme (sujet 381)', () => {
  it('bornes, contour lu du style, identifiant ; rien sans forme', () => {
    const [ellipse, rect] = readDrawio(FILE).document.pages[0]!.shapes;
    const terminal = toTerminal(ellipse);
    expect(terminal).toMatchObject({ id: 'o', bounds: { x: 10, y: 20, width: 100, height: 60 }, perimeter: 'ellipse' });
    expect(terminal?.style).toBe(ellipse!.style);
    expect(toTerminal(rect)?.perimeter).toBe('rectangle');
    expect(toTerminal(undefined)).toBeUndefined();
  });
});
