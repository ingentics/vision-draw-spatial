import { describe, expect, it } from 'vitest';
import {
  groupLabel,
  groupOf,
  stickyGroups,
} from '../../../../../../src/engine/plugins/modes/eventstorming/groups/stickyGroups';
import { setup, sticky, stormingXml } from '../helpers';

describe('mode Event storming : groupes de post-it collés (sujet 514)', () => {
  it('post-it reliés de proche en proche, deux au moins ; un coin ou un chevauchement ne relient pas', () => {
    const { page } = setup(
      stormingXml(
        sticky('a', 'event', 0, 0) +
          sticky('b', 'command', 160, 0) +
          sticky('c', 'policy', 160, 160) +
          sticky('corner', 'actor', 320, 320) +
          sticky('d', 'query', 600, 0) +
          sticky('over', 'hotspot', 650, 50),
      ),
    );
    const groups = stickyGroups(page());
    expect(groups.map((group) => group.shapes.map((shape) => shape.id))).toEqual([['a', 'b', 'c']]);
    expect(groupOf(page(), 'corner')).toBeUndefined();
    expect(groupOf(page(), 'd')).toBeUndefined();
  });

  it('premier post-it : le plus haut, puis le plus à gauche ; titre au-dessus, aligné sur le bord gauche du groupe', () => {
    const { page } = setup(stormingXml(sticky('low', 'event', 0, 100) + sticky('high', 'command', 160, 0)));
    const [group] = stickyGroups(page());
    expect(group!.shapes[0]!.id).toBe('high');
    expect(group!.bounds).toEqual({ x: 0, y: 0, width: 320, height: 260 });
    expect(group!.title.x).toBe(0);
    expect(group!.title.y + group!.title.height).toBeLessThan(0);
    expect(group!.title.width).toBe(320);
  });

  it('libellé : le premier écrit dans l’ordre du groupe, sinon « Group label »', () => {
    const { page } = setup(
      stormingXml(
        sticky('a', 'event', 0, 0) + sticky('b', 'command', 160, 0, '', 160, 160, 'spatial.es.group=Paiement;'),
      ),
    );
    expect(groupLabel(stickyGroups(page())[0]!)).toBe('Paiement');
    const bare = setup(stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'command', 160, 0)));
    expect(groupLabel(stickyGroups(bare.page())[0]!)).toBe('Group label');
  });
});
