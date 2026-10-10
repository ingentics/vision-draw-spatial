import { describe, expect, it } from 'vitest';
import { contacts } from '../../../../../../src/engine/plugins/modes/eventstorming/contacts/contacts';
import { setup, sticky, stormingXml, textCell } from '../helpers';

describe('mode Event storming : contacts (sujet 475)', () => {
  const read = (cells: string) => contacts(setup(stormingXml(cells)).page());

  it('côte à côte : côtés droite / gauche, segment sur toute la hauteur commune', () => {
    const { contacts: list, overlaps } = read(sticky('a', 'actor', 0, 0) + sticky('b', 'command', 160, 40));
    expect(overlaps).toEqual([]);
    expect(list).toEqual([
      {
        a: { shapeId: 'a', side: 'e', share: 0.75 },
        b: { shapeId: 'b', side: 'w', share: 0.75 },
        start: { x: 160, y: 40 },
        end: { x: 160, y: 160 },
        length: 120,
      },
    ]);
  });

  it('l’un sous l’autre : côtés bas / haut, part du côté de chaque forme', () => {
    const { contacts: list } = read(sticky('a', 'event', 0, 0) + sticky('b', 'policy', 80, 160, '', 320, 100));
    expect(list[0]).toMatchObject({
      a: { shapeId: 'a', side: 's', share: 0.5 },
      b: { shapeId: 'b', side: 'n', share: 0.25 },
      start: { x: 80, y: 160 },
      end: { x: 160, y: 160 },
      length: 80,
    });
  });

  it('tolérance de 0,5 : un écart ou un recouvrement plus petit touche, pas au-delà', () => {
    expect(read(sticky('a', 'event', 0, 0) + sticky('b', 'event', 160.4, 0)).contacts).toHaveLength(1);
    expect(read(sticky('a', 'event', 0, 0) + sticky('b', 'event', 159.6, 0)).contacts).toHaveLength(1);
    expect(read(sticky('a', 'event', 0, 0) + sticky('b', 'event', 160.6, 0)).contacts).toHaveLength(0);
    const segment = read(sticky('a', 'event', 0, 0) + sticky('b', 'event', 160.4, 0)).contacts[0]!;
    expect(segment.start.x).toBeCloseTo(160.2);
  });

  it('un coin seul ne compte pas', () => {
    const { contacts: list, overlaps } = read(sticky('a', 'event', 0, 0) + sticky('b', 'system', 160, 160));
    expect(list).toEqual([]);
    expect(overlaps).toEqual([]);
  });

  it('chevauchement signalé à part, pas compté comme contact', () => {
    const { contacts: list, overlaps } = read(sticky('a', 'query', 0, 0) + sticky('b', 'hotspot', 100, 60));
    expect(list).toEqual([]);
    expect(overlaps).toEqual([['a', 'b']]);
  });

  it('seulement entre post-it du mode', () => {
    const text = textCell(160, 0);
    expect(read(sticky('a', 'event', 0, 0) + text).contacts).toEqual([]);
  });
});
