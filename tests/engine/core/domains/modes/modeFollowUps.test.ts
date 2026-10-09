import { describe, expect, it } from 'vitest';
import { spy } from './modesCore';

describe('flèche qui arrive sur une partie (sujet 333)', () => {
  it('created et reconnected reçoivent la partie visée (et rien si le départ est rebranché)', () => {
    const { seen, followUps } = spy();
    followUps.edgeCreated('p', 'e', 'haut');
    followUps.edgeReconnected('p', 'e', 'bas');
    followUps.edgeReconnected('p', 'e');
    expect(seen.created).toEqual(['haut']);
    expect(seen.reconnected).toEqual(['bas', undefined]);
  });
});
