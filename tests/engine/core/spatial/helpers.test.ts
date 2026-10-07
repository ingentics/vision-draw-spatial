import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { jsonListValue, readJsonList, spatialFlag, spatialValue } from '../../../../src/engine/core/spatial';
import { FLOWS, readFlows, writeFlows } from '../../../../src/engine/plugins/modes/sequences/flows';
import { fixture } from '../../../helpers';

const element = (style: Record<string, string>, attributes: Record<string, string> = {}) => ({ style, attributes });

describe('utilitaires des attributs spatiaux (sujet 291)', () => {
  it('spatialFlag : vrai pour 1, dans le style ou l’objet', () => {
    expect(spatialFlag(element({ 'spatial.secondary': '1' }), 'spatial.secondary')).toBe(true);
    expect(spatialFlag(element({}, { 'spatial.secondary': '1' }), 'spatial.secondary')).toBe(true);
    expect(spatialFlag(element({ 'spatial.secondary': '0' }), 'spatial.secondary')).toBe(false);
    expect(spatialFlag(element({ 'spatial.secondary': 'true' }), 'spatial.secondary')).toBe(false);
    expect(spatialFlag(element({}), 'spatial.secondary')).toBe(false);
  });

  it('liste JSON lue au mieux, écrite sans attribut quand elle est vide', () => {
    expect(readJsonList(undefined)).toEqual([]);
    expect(readJsonList('[1,{"a":2}]')).toEqual([1, { a: 2 }]);
    expect(readJsonList('{"a":1}')).toBeUndefined();
    expect(readJsonList('[1,')).toBeUndefined();
    expect(jsonListValue([])).toBeUndefined();
    expect(jsonListValue([{ id: 'f1' }])).toBe('[{"id":"f1"}]');
  });

  it('fixtures RDD et Séquences relues et réécrites à l’identique', () => {
    for (const page of readDrawio(fixture('sequences.drawio')).document.pages) {
      const flows = page.attributes[FLOWS];
      if (flows !== undefined) expect(writeFlows(readFlows(page))).toBe(flows);
    }
    for (const shape of readDrawio(fixture('rdd.drawio')).document.pages[0]!.shapes) {
      const fields = spatialValue(shape, 'spatial.fields');
      // Le mode remet en ordre certains champs à la lecture (ex. type de la clé primaire) : on compare la liste brute.
      if (fields !== undefined) expect(jsonListValue(readJsonList(fields)!)).toBe(fields);
    }
  });
});
