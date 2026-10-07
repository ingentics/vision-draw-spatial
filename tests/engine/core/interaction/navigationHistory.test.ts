import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../../src/engine/core/format/parse';
import { NavigationHistory, findParents, usageKey } from '../../../../src/engine/core/interaction/navigationHistory';
import type { HistoryEntry } from '../../../../src/engine/core/interaction/navigationHistory';
import { fixture } from '../../../helpers';

const doc = parseDrawio(fixture('parents.drawio'));

describe('findParents', () => {
  it('pages ayant un lien vers la page, hors elle-même, dans l’ordre du document par défaut', () => {
    expect(findParents(doc, 'detail').map((p) => [p.pageId, p.pageName])).toEqual([
      ['home', 'Accueil'],
      ['archi', 'Architecture'],
    ]);
  });

  it('préfère une forme à une arête pour le cadre de la transition inverse', () => {
    const archi = findParents(doc, 'detail').find((p) => p.pageId === 'archi')!;
    expect(archi).toMatchObject({ elementId: 'archi-to-detail', frame: { x: 200, y: 100, width: 80, height: 40 } });
  });

  it('trie par usage récent, la plus récemment utilisée en premier', () => {
    const usage = { [usageKey('archi', 'detail')]: 2000, [usageKey('home', 'detail')]: 1000 };
    expect(findParents(doc, 'detail', usage).map((p) => [p.pageId, p.lastUsedAt])).toEqual([
      ['archi', 2000],
      ['home', 1000],
    ]);
    // Un parent déjà utilisé passe avant un parent jamais utilisé.
    expect(findParents(doc, 'detail', { [usageKey('archi', 'detail')]: 5 }).map((p) => p.pageId)).toEqual([
      'archi',
      'home',
    ]);
  });

  it('aucun parent : liste vide', () => {
    expect(findParents(doc, 'orphan')).toEqual([]);
    expect(findParents(doc, 'home')).toEqual([]);
  });
});

describe('NavigationHistory', () => {
  const entry = (pageId: string, targetPageId: string): HistoryEntry => ({
    pageId,
    targetPageId,
    elementId: `${pageId}-link`,
    camera: { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 },
  });

  it('pile LIFO, copies indépendantes', () => {
    const history = new NavigationHistory();
    history.push(entry('home', 'archi'));
    history.push(entry('archi', 'detail'));
    expect(history.size).toBe(2);
    expect(history.peek()?.targetPageId).toBe('detail');
    const snapshot = history.entries();
    snapshot[0]!.pageId = 'modifié';
    expect(history.entries()[0]!.pageId).toBe('home');
    expect(history.pop()?.pageId).toBe('archi');
    expect(history.pop()?.pageId).toBe('home');
    expect(history.pop()).toBeUndefined();
  });

  it('replace / clear (restauration, nouveau fichier)', () => {
    const history = new NavigationHistory();
    history.replace([entry('a', 'b')]);
    expect(history.size).toBe(1);
    history.clear();
    expect(history.size).toBe(0);
  });
});
