import { describe, expect, it } from 'vitest';
import {
  creationLayerId,
  currentLayerId,
  layerCounts,
  newLayerName,
  readElevation,
} from '../../../../src/engine/core/edit/layerChoice';
import type { LayerModel } from '../../../../src/engine/core/model/types';

// Sujet 523 : calque courant, calque d'une création, nom d'un nouveau calque.

const layer = (id: string, extra: Partial<LayerModel> = {}): LayerModel => ({
  id,
  name: '',
  visible: true,
  locked: false,
  elevation: 0,
  ...extra,
});

describe('choix des calques (sujet 523)', () => {
  it('calque courant : celui choisi s’il existe encore, sinon le premier', () => {
    const layers = [layer('1'), layer('2')];
    expect(currentLayerId(layers, '2')).toBe('2');
    expect(currentLayerId(layers, 'parti')).toBe('1');
    expect(currentLayerId(layers, undefined)).toBe('1');
    expect(currentLayerId([], undefined)).toBeUndefined();
  });

  it('création : le courant, sinon le plus haut visible et déverrouillé, à défaut le courant', () => {
    const layers = [layer('1'), layer('2'), layer('3', { locked: true })];
    expect(creationLayerId(layers, '1')).toBe('1');
    expect(creationLayerId(layers, '3')).toBe('2');
    expect(creationLayerId([layer('1', { visible: false }), layer('2')], '1')).toBe('2');
    expect(creationLayerId([layer('1', { visible: false })], '1')).toBe('1');
  });

  it('nom : « Calque N », N libre à partir du nombre de calques plus un', () => {
    expect(newLayerName([layer('1')])).toBe('Calque 2');
    expect(newLayerName([layer('1'), layer('2', { name: 'Calque 3' })])).toBe('Calque 4');
  });
});

describe('nombre d’éléments et élévation saisie (sujet 548)', () => {
  it('compte les éléments posés directement sur chaque calque', () => {
    const element = (layerId: string, parentId?: string) => ({ layerId, parentId }) as never;
    const page = { shapes: [element('1'), element('1', 'c'), element('L2')], edges: [element('1')] };
    expect(layerCounts(page)).toEqual({ '1': 2, L2: 1 });
  });

  it('lit une élévation : vide = 0, virgule décimale, refus du négatif et du texte', () => {
    expect(readElevation('')).toBe(0);
    expect(readElevation(' 12,5 ')).toBe(12.5);
    expect(readElevation('-3')).toBeUndefined();
    expect(readElevation('haut')).toBeUndefined();
  });
});
