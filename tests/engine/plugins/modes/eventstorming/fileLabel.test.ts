import { describe, expect, it } from 'vitest';
import { cellLabelValue } from '../../../../../src/engine/core/format/cellEdits';
import { rewriteLabels } from '../../../../../src/engine/core/format/fileLabels';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../src/engine/core/format/write';
import { modeHost } from '../../../modeHost';
import { sticky, stormingXml } from './helpers';

/** Valeur de la cellule `id` telle qu'écrite dans le fichier `xml`. */
const valueIn = (xml: string, id: string) => cellLabelValue(readDrawio(xml).tree.pages[0]!, id);

/** Le fichier `xml` enregistré (en-têtes ajoutés). */
function saved(xml: string): string {
  const { document, tree } = readDrawio(xml);
  const labelOf = modeHost().host.fileLabels(document.pages, 'export');
  return labelOf && rewriteLabels(document, tree, labelOf).length > 0 ? writeDrawio(tree) : xml;
}

/** Le fichier `xml` ouvert : arbre changé ou non, et valeur gardée de la cellule `id`. */
function opened(xml: string, id: string) {
  const { document, tree } = readDrawio(xml);
  const labelOf = modeHost().host.fileLabels(document.pages, 'import')!;
  const changed = rewriteLabels(document, tree, labelOf).length > 0;
  return { changed, value: cellLabelValue(tree.pages[0]!, id) };
}

describe('mode Event storming : nom du type en tête de la valeur dans le fichier (sujet 478)', () => {
  const xml = stormingXml(
    sticky('a', 'command', 0, 0, 'Payer') + sticky('b', 'event', 200, 0) + sticky('c', 'actor', 400, 0, 'A&lt;br&gt;B'),
  );
  const text = `<mxCell id="t" value="x" style="text;html=1;" vertex="1" parent="1"><mxGeometry x="0" y="300" width="60" height="30" as="geometry" /></mxCell>`;

  it('enregistré : label en gras en tête, puis le texte ; seul sans texte ; autres formes intactes', () => {
    const file = saved(xml.replace('</root>', `${text}</root>`));
    expect(valueIn(file, 'a')).toBe('<b>Command</b><br>Payer');
    expect(valueIn(file, 'b')).toBe('<b>Domain Event</b>');
    expect(valueIn(file, 'c')).toBe('<b>Actor</b><br>A<br>B');
    expect(valueIn(file, 't')).toBe('x');
    // Le modèle lu par draw.io comme par l'appli : le nom du type en première ligne.
    expect(readDrawio(file).document.pages[0]!.shapes.find((s) => s.id === 'a')!.label).toBe('Command\nPayer');
  });

  it('rouvert : l’appli ne garde que le texte du ticket (aller-retour sans changement)', () => {
    const file = saved(xml);
    expect(opened(file, 'a')).toEqual({ changed: true, value: 'Payer' });
    expect(opened(file, 'b').value).toBe('');
    expect(opened(file, 'c').value).toBe('A<br>B');
    // Réenregistré par draw.io : `<br/>` accepté.
    expect(opened(file.replace('&lt;br&gt;Payer', '&lt;br/&gt;Payer'), 'a').value).toBe('Payer');
    // Fichier sans en-tête : rien ne change.
    expect(opened(xml, 'a')).toEqual({ changed: false, value: 'Payer' });
  });

  it('« Labels » décoché : rien en tête ; l’en-tête d’un autre type n’est pas retiré', () => {
    const hidden = stormingXml(sticky('a', 'command', 0, 0, 'Payer', 160, 160, 'spatial.es.labels=0;'));
    expect(saved(hidden)).toBe(hidden);
    const other = stormingXml(sticky('a', 'command', 0, 0, '&lt;b&gt;Actor&lt;/b&gt;&lt;br&gt;Payer'));
    expect(opened(other, 'a').value).toBe('<b>Actor</b><br>Payer');
  });

  it('« Labels » décoché : un texte qui commence par le nom du type est gardé à l’ouverture (sujet 503)', () => {
    const hidden = stormingXml(
      sticky('a', 'command', 0, 0, '&lt;b&gt;Command&lt;/b&gt;&lt;br&gt;x', 160, 160, 'spatial.es.labels=0;'),
    );
    expect(saved(hidden)).toBe(hidden);
    expect(opened(hidden, 'a')).toEqual({ changed: false, value: '<b>Command</b><br>x' });
  });

  it('texte brut (html=0) : même texte après l’aller-retour ; un en-tête écrit en texte n’est pas retiré (sujet 503)', () => {
    const plain = (id: string, value: string) =>
      `<mxCell id="${id}" value="${value}" style="spatial.kind=eventstorming-command;" vertex="1" parent="1"><mxGeometry width="160" height="160" as="geometry" /></mxCell>`;
    const xml = stormingXml(
      plain('a', 'A&lt;B &amp;amp; C&#10;D') + plain('b', '&lt;b&gt;Command&lt;/b&gt;&lt;br&gt;x'),
    );
    const file = saved(xml);
    expect(valueIn(file, 'a')).toBe('<b>Command</b><br>A&lt;B &amp;amp; C<br>D');
    const label = (source: string, id: string) =>
      readDrawio(source).document.pages[0]!.shapes.find((s) => s.id === id)!.label;
    expect(label(file, 'a')).toBe('Command\nA<B &amp; C\nD');
    const { document, tree } = readDrawio(file);
    rewriteLabels(document, tree, modeHost().host.fileLabels(document.pages, 'import')!);
    expect(label(writeDrawio(tree), 'a')).toBe(label(xml, 'a'));
    expect(label(writeDrawio(tree), 'b')).toBe(label(xml, 'b'));
  });
});
