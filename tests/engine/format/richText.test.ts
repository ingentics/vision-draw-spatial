import { describe, expect, it } from 'vitest';
import { isRich, parseColor, parseRichHtml, richToHtml, richToText } from '../../../src/engine/format/richText';
import { htmlToText } from '../../../src/engine/format/label';
import { parseDrawio } from '../../../src/engine/format/parse';

describe('texte riche des labels HTML', () => {
  it('balises draw.io : gras, italique, souligné, barré, police, taille, couleur', () => {
    const lines = parseRichHtml(
      'Ser<b>vi<i>ce</i></b> <u>A</u><strike>x</strike><br><font color="#ff0000" face="Courier New">code</font>' +
        '<span style="font-size: 16px; color: rgb(0, 128, 255);">gros</span>',
    );
    expect(lines).toEqual([
      [
        { text: 'Ser' },
        { text: 'vi', bold: true },
        { text: 'ce', bold: true, italic: true },
        { text: ' ' },
        { text: 'A', underline: true },
        { text: 'x', strike: true },
      ],
      [
        { text: 'code', color: '#ff0000', fontFamily: 'Courier New' },
        { text: 'gros', fontSize: 16, color: '#0080ff' },
      ],
    ]);
    expect(isRich(lines)).toBe(true);
  });

  it('même texte que la conversion en texte brut (blocs, <br>, entités, espaces)', () => {
    for (const html of ['Service<br>B &amp; co', '<div>Ligne 1</div><div>Ligne 2</div>', '<p>x&nbsp;y</p>']) {
      expect(richToText(parseRichHtml(html)), html).toBe(htmlToText(html));
    }
    expect(isRich(parseRichHtml('Service<br>B &amp; co'))).toBe(false);
    // Espaces fusionnés, comme l'affichage HTML de draw.io.
    expect(richToText(parseRichHtml('  espaces   <b>fusionnés</b>  '))).toBe('espaces fusionnés');
    // Ligne vide d'un éditeur (Chrome : <div><br></div>) : une seule ligne vide, comme à l'écran.
    expect(richToText(parseRichHtml('a<div><br></div>b'))).toBe('a\n\nb');
  });

  it('style CSS : poids, style, décoration, taille en pt, annulations explicites', () => {
    const [line] = parseRichHtml(
      '<span style="font-weight: 700">a</span><span style="font-weight: normal; font-style: italic">b</span>' +
        '<span style="text-decoration: underline line-through; font-size: 12pt">c</span>',
    );
    expect(line).toEqual([
      { text: 'a', bold: true },
      { text: 'b', bold: false, italic: true },
      { text: 'c', underline: true, strike: true, fontSize: 16 },
    ]);
  });

  it('écriture relue à l’identique, segments voisins fusionnés', () => {
    const lines = [
      [
        { text: 'a ' },
        { text: 'b', bold: true },
        { text: 'c', bold: true },
        { text: 'd', fontSize: 18, color: '#333333', fontFamily: 'Courier New', italic: true },
      ],
      [
        { text: 'x < y', underline: true, strike: true },
        { text: 'n', bold: false },
      ],
    ];
    const html = richToHtml(lines);
    expect(html).toContain('<b>bc</b>');
    expect(parseRichHtml(html)).toEqual([
      [
        { text: 'a ' },
        { text: 'bc', bold: true },
        { text: 'd', fontSize: 18, color: '#333333', fontFamily: 'Courier New', italic: true },
      ],
      [
        { text: 'x < y', underline: true, strike: true },
        { text: 'n', bold: false },
      ],
    ]);
  });

  it('couleurs CSS', () => {
    expect(parseColor('#ABC')).toBe('#aabbcc');
    expect(parseColor('rgb(255, 0, 16)')).toBe('#ff0010');
    expect(parseColor('red')).toBeUndefined();
  });
  it('modèle : texte riche seulement pour un label HTML mis en forme en partie', () => {
    const cell = (id: string, value: string, style: string) =>
      `<mxCell id="${id}" value="${value}" style="${style}" vertex="1" parent="1"><mxGeometry width="10" height="10" as="geometry"/></mxCell>`;
    const page = parseDrawio(
      '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
        cell('a', 'Ser&lt;b&gt;vice&lt;/b&gt;', 'html=1;') +
        cell('b', 'Ligne&lt;br&gt;deux', 'html=1;') +
        cell('c', '&lt;b&gt;brut&lt;/b&gt;', '') +
        '</root></mxGraphModel></diagram></mxfile>',
    ).pages[0]!;
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    expect(shape('a')).toMatchObject({ label: 'Service', rich: [[{ text: 'Ser' }, { text: 'vice', bold: true }]] });
    expect(shape('b').rich).toBeUndefined();
    expect(shape('c').rich).toBeUndefined();
  });
});
