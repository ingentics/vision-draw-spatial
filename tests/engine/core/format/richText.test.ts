import { describe, expect, it } from 'vitest';
import {
  htmlToText,
  isRich,
  joinHtmlLines,
  parseColor,
  parseRichHtml,
  richToHtml,
  richToText,
} from '../../../../src/engine/core/format/richText';
import { parseDrawio } from '../../../../src/engine/core/format/parse';

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

  it('texte brut : blocs, <br>, entités, espaces', () => {
    expect(isRich(parseRichHtml('Service<br>B &amp; co'))).toBe(false);
    // Espaces fusionnés, comme l'affichage HTML de draw.io.
    expect(richToText(parseRichHtml('  espaces   <b>fusionnés</b>  '))).toBe('espaces fusionnés');
    // Ligne vide d'un éditeur (Chrome : <div><br></div>) : une seule ligne vide, comme à l'écran.
    expect(richToText(parseRichHtml('a<div><br></div>b'))).toBe('a\n\nb');
  });

  it('htmlToText : balises retirées, <br> et blocs en lignes, entités décodées', () => {
    expect(htmlToText('Service<br><b>B</b>')).toBe('Service\nB');
    expect(htmlToText('a<br/>b<BR />c')).toBe('a\nb\nc');
    expect(htmlToText('Titre<div>Ligne 2</div><div>Ligne 3</div>')).toBe('Titre\nLigne 2\nLigne 3');
    expect(htmlToText('<p>un</p><p>deux</p>')).toBe('un\ndeux');
    expect(htmlToText('a&nbsp;&amp;&nbsp;b &lt;x&gt; &#233;&#x20AC;')).toBe('a & b <x> é€');
  });

  it('lignes vides en tête, au milieu et en fin gardées, comme draw.io les affiche (sujet 407)', () => {
    expect(htmlToText('<br>a')).toBe('\na');
    expect(htmlToText('a<br><br>b')).toBe('a\n\nb');
    // Un <br> final ne fait pas de ligne en HTML ; deux, ou <div><br></div>, une ligne vide.
    expect(htmlToText('a<br>')).toBe('a');
    expect(htmlToText('a<br><br>')).toBe('a\n');
    expect(htmlToText('a<div><br></div>')).toBe('a\n');
    expect(htmlToText('a<div><br></div><div><br></div>')).toBe('a\n\n');
    // Éditeur de draw.io (Chrome) : une ligne par bloc.
    expect(htmlToText('<div><br></div><div>a</div><div><br></div><div>b</div><div><br></div>')).toBe('\na\n\nb\n');
    // Retours à la ligne littéraux : des <br> pour draw.io, ceux de la fin des lignes vides.
    expect(htmlToText('\na\r\n\nb\n')).toBe('\na\n\nb\n');
    expect(htmlToText('<div>a</div>\n<div>b</div>')).toBe('a\n\nb');
    // Blancs entre deux blocs : ignorés, comme par le navigateur.
    expect(htmlToText('<div>a</div> <div>b</div>')).toBe('a\nb');
    // Que des lignes vides : texte de blancs (vidé à la saisie).
    expect(htmlToText('<div><br></div>').trim()).toBe('');
  });

  it('écriture des lignes vides : <br>, celles de la fin en <div><br></div>, relues à l’identique', () => {
    expect(joinHtmlLines(['', 'a', '', 'b', '', ''])).toBe('<br>a<br><br>b<div><br></div><div><br></div>');
    expect(joinHtmlLines(['a'])).toBe('a');
    const lines = [[], [{ text: 'a', bold: true }], [], [{ text: 'b' }], []];
    const html = richToHtml(lines);
    expect(html).toBe('<br><b>a</b><br><br>b<div><br></div>');
    expect(parseRichHtml(html)).toEqual(lines);
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

describe('espaces d’un label HTML (sujet 409)', () => {
  it('insécables ni fusionnés ni coupés en bout de ligne, lus comme des espaces ordinaires', () => {
    expect(htmlToText('&nbsp;a&nbsp; &nbsp;b&nbsp;')).toBe(' a   b ');
    expect(htmlToText('a\u00a0\u00a0b')).toBe('a  b');
    expect(htmlToText('<div>a</div><div>&nbsp;</div><div>b</div>')).toBe('a\n \nb');
    // Espaces ordinaires : toujours fusionnés et coupés en bout de ligne, comme en HTML.
    expect(htmlToText('  a   b  ')).toBe('a b');
  });

  it('écrits par richToHtml, relus à l’identique', () => {
    for (const text of [' a', 'a ', 'a  b', '   a   b   ', ' ']) {
      const lines = [[{ text }], [{ text: 'x', bold: true }, { text: '  y ' }]];
      expect(parseRichHtml(richToHtml(lines))).toEqual(lines);
    }
  });

  it('preserveSpaces (éditeur en place, white-space: pre) : tous les espaces comptent', () => {
    expect(richToText(parseRichHtml(' a  <b>b </b> ', { preserveSpaces: true }))).toBe(' a  b  ');
    expect(richToText(parseRichHtml('a<br>  ', { preserveSpaces: true }))).toBe('a\n  ');
  });
});
