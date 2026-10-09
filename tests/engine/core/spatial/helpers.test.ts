import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { jsonListValue, readJsonList, spatialValue } from '../../../../src/engine/core/spatial';
import { FLOWS, readFlows, writeFlows } from '../../../../src/engine/plugins/modes/sequences/flows';
import { fixture } from '../../../helpers';

describe('utilitaires des attributs spatiaux (sujet 291)', () => {
  it('liste JSON lue au mieux, écrite sans attribut quand elle est vide', () => {
    expect(readJsonList(undefined)).toEqual([]);
    expect(readJsonList('[1,{"a":2}]')).toEqual([1, { a: 2 }]);
    expect(readJsonList('{"a":1}')).toBeUndefined();
    expect(readJsonList('[1,')).toBeUndefined();
    expect(jsonListValue([])).toBeUndefined();
    expect(jsonListValue([{ id: 'f1' }])).toBe('[{"id":"f1"}]');
  });

  it('fixtures RDD et Séquences relues et réécrites à l’identique', () => {
    let checked = 0;
    for (const page of readDrawio(fixture('sequences.drawio')).document.pages) {
      const flows = page.attributes[`spatial.seq.${FLOWS}`];
      if (flows === undefined) continue;
      expect(writeFlows(readFlows(page))).toBe(flows);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
    checked = 0;
    for (const shape of readDrawio(fixture('rdd.drawio')).document.pages[0]!.shapes) {
      const fields = spatialValue(shape, 'spatial.rdd.fields');
      // Le mode remet en ordre certains champs à la lecture (ex. type de la clé primaire) : on compare la liste brute.
      if (fields === undefined) continue;
      expect(jsonListValue(readJsonList(fields)!)).toBe(fields);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});
