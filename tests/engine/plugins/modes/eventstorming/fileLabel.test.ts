import { describe, expect, it } from 'vitest';
import { cellLabelValue } from '../../../../../src/engine/core/format/cellEdits';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import { modeHost } from '../../../modeHost';
import { sticky, stormingXml } from './helpers';

/** Valeur de la cellule `id` telle qu'écrite dans le fichier `xml`. */
const valueIn = (xml: string, id: string) => cellLabelValue(readDrawio(xml).tree.pages[0]!, id);

/** Le fichier `xml` enregistré (en-têtes ajoutés). */
const saved = (xml: string) => modeHost().host.exportLabels(xml, readDrawio(xml).document);

/** Le fichier `xml` ouvert : arbre changé ou non, et valeur gardée de la cellule `id`. */
function opened(xml: string, id: string) {
  const { document, tree } = readDrawio(xml);
  const changed = modeHost().host.importLabels(document, tree);
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
});
