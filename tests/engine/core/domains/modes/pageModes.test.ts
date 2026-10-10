import { describe, expect, it } from 'vitest';
import { ShapeParts } from '../../../../../src/engine/core/domains/modes/shapeParts';
import { EdgeArrangement } from '../../../../../src/engine/core/domains/edit/edges/arrangement';
import { writeDrawio } from '../../../../../src/engine/core/format/write';
import { removeCells } from '../../../../../src/engine/core/format/create';
import { applyModeEdit } from '../../../../../src/engine/core/modes/modeEditWriter';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import { endKey } from '../../../../../src/engine/core/edit/anchoring/auto/distribute';
import { BOOM, fail, setup, spy } from './modesCore';

describe('hôte des appels aux modes (sujet 288)', () => {
  it('une opération qui lève une exception n’écrit rien', () => {
    const { tree, page } = setup();
    const before = writeDrawio(tree);
    expect(() =>
      applyModeEdit(page, tree.pages[0]!, BOOM, (edit) => {
        edit.setPageAttribute('x', '1');
        edit.setElementAttribute('a', 'y', '2');
        fail();
      }),
    ).toThrow('panne');
    expect(writeDrawio(tree)).toBe(before);
  });

  it('check, dressing, placed, carries, obstacles, connects en panne : repli, rien d’écrit, signalés une fois', async () => {
    const { document, tree, modes, followUps, guard, state, page } = setup();
    const before = writeDrawio(tree);
    // Lecture : le document garde ses avertissements, plus l'erreur du mode.
    modes.withModeWarnings(document);
    // Rendu : l'habillage en panne ne colore rien, la pastille reste.
    const dressing = modes.dressing(page)!;
    expect(dressing.edgeColor?.(page.edges[0]!)).toBeUndefined();
    expect(dressing.edgeBadge?.(page.edges[0]!)).toEqual({ text: '1', color: '#ff0000' });
    // Geste : remise en ordre annulée, bornes et accroches comme sans mode.
    expect(followUps.shapesPlaced('p', ['a'])).toBe(false);
    expect(writeDrawio(tree)).toBe(before);
    expect(modes.obstacles(page, page.shapes[0]!)).toBeUndefined();
    expect(modes.endAccepts(page, 'target', 'a')?.(page.shapes[1]!, { x: 0, y: 0 })).toBe(true);
    // Formes emportées : celles trouvées avant la panne.
    expect(modes.carried(page, ['a'])).toEqual(['b']);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      'Mode boom : erreur dans lifecycle.check (panne)',
      'Mode boom : erreur dans dressing.edgeColor (panne)',
      'Mode boom : erreur dans gestures.placed (panne)',
      'Mode boom : erreur dans gestures.obstacles (panne)',
      'Mode boom : erreur dans edges.connects (panne)',
      'Mode boom : erreur dans gestures.carries (panne)',
    ]);
    // La deuxième panne d'un même point d'entrée n'est pas signalée à nouveau.
    modes.obstacles(page, page.shapes[0]!);
    expect(guard.warnings()).toHaveLength(6);
    // Les Diagnostics sont republiés une fois, après l'appel en cours.
    await Promise.resolve();
    expect(state.published).toBe(1);
  });

  it('allowsEffect en panne : effet permis, modes d’affichage de l’effet toujours vérifiés (dette 296)', () => {
    const { modes, guard, page } = setup();
    expect(modes.allowsEffect(page, { id: 'refused' })).toBe(false);
    expect(modes.allowsEffect(page, { id: 'forest' })).toBe(true);
    expect(guard.warnings().map((w) => w.message)).toEqual(['Mode boom : erreur dans page.allowsEffect (panne)']);
  });
});

describe('écritures d’une opération de mode qui échouent en route (sujet 302)', () => {
  it('une écriture vers une cellule disparue : arbre inchangé, pas d’étape d’annulation, erreur signalée', () => {
    const { tree, modes, guard, state } = setup();
    // Le modèle de la page a encore `b`, l'arbre ne l'a plus : l'écriture vers `b` échoue une fois appliquée.
    removeCells(tree.pages[0]!, ['b']);
    const before = writeDrawio(tree);
    const changed = modes.editPageMode('Essai', (edit) => {
      edit.setPageAttribute('x', '1');
      edit.setElementAttribute('a', 'y', '2');
      edit.setElementAttribute('b', 'z', '3');
    });
    expect(changed).toBe(false);
    expect(writeDrawio(tree)).toBe(before);
    expect(state.snapshots).toEqual([]);
    expect(state.changed).toBe(0);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      'Mode boom : erreur dans opération « Essai » (Cellule b introuvable)',
    ]);
  });
});

/** Mode de test dont les points d'entrée écrivent dans la page qu'on leur remet. */
const WRITER: PageModeDefinition = {
  id: 'boom',
  namespace: 'boom',
  name: 'Boom',
  dressing: (page) => {
    (page.shapes[0]!.bounds as { x: number }).x = 999;
    return {};
  },
  edges: {
    connects: (page) => {
      (page.shapes as unknown[]).length = 0;
      return true;
    },
  },
  parts: {
    dropAt: (page) => {
      (page.edges[0]!.style as Record<string, string>).stroke = 'x';
      return undefined;
    },
    bounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    at: () => undefined,
    move: () => undefined,
  },
};

describe('page remise aux plugins pendant un geste (sujet 324)', () => {
  it('habillage, accroche et glisser de partie qui écrivent : modèle intact, erreur signalée une fois', () => {
    const { core, modes, guard, page } = setup(WRITER);
    // La page du document n'est pas gelée ici : c'est la copie de travail d'un geste.
    expect(Object.isFrozen(page)).toBe(false);
    const snapshot = JSON.stringify(page);
    expect(modes.dressing(page)).toBeUndefined();
    expect(modes.endAccepts(page, 'target', 'a')?.(page.shapes[1]!, { x: 0, y: 0 })).toBe(true);
    const parts = new ShapeParts(core);
    expect(parts.dropAt(page, page.shapes[0]!, 'p', { x: 0, y: 0 })).toBeUndefined();
    expect(JSON.stringify(page)).toBe(snapshot);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      expect.stringMatching(/^Mode boom : erreur dans dressing \(/),
      expect.stringMatching(/^Mode boom : erreur dans edges\.connects \(/),
      expect.stringMatching(/^Mode boom : erreur dans parts\.dropAt \(/),
    ]);
    modes.dressing(page);
    expect(guard.warnings()).toHaveLength(3);
  });
});

describe('flèche qui arrive sur une partie (sujet 333)', () => {
  it('endAccepts passe à connects la partie sous le point, au bout d’arrivée seulement', () => {
    const { seen, modes, page } = spy();
    const b = page.shapes[1]!;
    modes.endAccepts(page, 'target', 'a')?.(b, { x: 310, y: 5 });
    modes.endAccepts(page, 'target', 'a')?.(b, { x: 310, y: 50 });
    modes.endAccepts(page, 'source', 'a')?.(b, { x: 310, y: 5 });
    expect(seen.connects).toEqual(['haut', 'bas', undefined]);
  });
});

describe('point d’arrivée placé par le mode (sujet 338)', () => {
  it('placedEntries : les bouts d’arrivée des flèches nommées par le mode ; aucun si le mode est en panne', () => {
    const placing = setup({ id: 'boom', namespace: 'boom', name: 'Boom', edges: { placedEntries: () => ['e'] } });
    expect([...placing.modes.placedEntries(placing.page)]).toEqual([endKey('e', 'target')]);
    const broken = setup({ id: 'boom', namespace: 'boom', name: 'Boom', edges: { placedEntries: fail } });
    expect(broken.modes.placedEntries(broken.page).size).toBe(0);
  });
});

describe('adaptateur unique des appels aux modes (sujet 379)', () => {
  it('call : chaque argument objet en lecture seule, appel protégé, repli si le point d’entrée est absent', () => {
    const { modes, guard, page } = setup();
    const point = { x: 1, y: 2 };
    const ids = ['a'];
    const writes = (
      p: typeof page,
      shape: (typeof page.shapes)[number],
      at: typeof point,
      list: string[],
      part: string,
    ) => {
      expect(part).toBe('haut');
      expect(() => ((p as { id: string }).id = 'x')).toThrow(TypeError);
      expect(() => ((shape.bounds as { x: number }).x = 1)).toThrow(TypeError);
      expect(() => (at.x = 9)).toThrow(TypeError);
      expect(() => list.push('b')).toThrow(TypeError);
      return 'lu';
    };
    expect(modes.call(BOOM, 'essai', 'repli', writes, page, page.shapes[0]!, point, ids, 'haut')).toBe('lu');
    // Rien n'a été écrit, aucune erreur signalée : les écritures refusées ont été rattrapées dans le point d'entrée.
    expect(point).toEqual({ x: 1, y: 2 });
    expect(ids).toEqual(['a']);
    expect(guard.warnings()).toEqual([]);
    // Une écriture non rattrapée par le mode : repli, erreur signalée sous le nom du point d'entrée.
    const careless = (p: typeof page) => ((p as { id: string }).id = 'x');
    expect(modes.call(BOOM, 'essai', 'repli', careless, page)).toBe('repli');
    expect(page.id).toBe('p');
    expect(guard.warnings().map((w) => w.message)).toEqual([
      expect.stringMatching(/^Mode boom : erreur dans essai \(/),
    ]);
    // Point d'entrée absent : repli, sans appel.
    expect(modes.call(BOOM, 'absent', 'repli', undefined, page)).toBe('repli');
  });
});

describe('bouts attachés imposés par le mode (sujet 438)', () => {
  it('attachedEnds : la réponse du mode ; faux sans la règle ou si le mode est en panne, panne signalée', () => {
    const mode = (attachedEnds?: () => boolean) => ({
      id: 'boom',
      namespace: 'boom',
      name: 'Boom',
      edges: { attachedEnds },
    });
    const strict = setup(mode(() => true));
    expect(strict.modes.attachedEnds(strict.page)).toBe(true);
    const loose = setup(mode());
    expect(loose.modes.attachedEnds(loose.page)).toBe(false);
    const broken = setup(mode(fail));
    expect(broken.modes.attachedEnds(broken.page)).toBe(false);
    expect(broken.guard.warnings().map((w) => w.message)).toEqual([
      'Mode boom : erreur dans edges.attachedEnds (panne)',
    ]);
  });
});

describe('réglages de page posés par le mode à son arrivée (sujet 442)', () => {
  /** Page sans mode passée dans un mode qui déclare `defaults` ; l'agencement note les pages réparties. */
  function arrive(defaults: PageModeDefinition['page'], anchoring?: string) {
    const mode: PageModeDefinition = { id: 'auto', namespace: 'auto', name: 'Auto', page: defaults };
    const { core, modes, tree, page } = setup(mode);
    tree.pages[0]!.diagram!.removeAttribute('spatial.mode');
    if (anchoring) {
      tree.pages[0]!.diagram!.setAttribute('spatial.anchoring', anchoring);
      page.attributes['spatial.anchoring'] = anchoring;
    }
    const distributed: string[][] = [];
    const steps: string[] = [];
    // Agencement réel (il écrit l'ancrage et le tracé, sujet 447), répartition notée.
    const arrangement = Object.assign(new EdgeArrangement(core), {
      distributes: (page: { attributes: Record<string, string> }) => page.attributes['spatial.anchoring'] !== 'manual',
      writeDistribution: (_page: unknown, ids: ReadonlySet<string>) => distributed.push([...ids].sort()),
    });
    Object.assign(core, { edits: { recordEdit: (label: string) => steps.push(label) }, arrangement });
    modes.setPageMode('p', 'auto');
    const diagram = tree.pages[0]!.diagram!;
    return { diagram, distributed, steps };
  }

  it('ancrage et tracé écrits dans l’étape du passage ; les flèches déjà là sont réparties', () => {
    const { diagram, distributed, steps } = arrive({ defaults: { anchoring: 'auto', edgeLine: 'straight' } });
    expect(steps).toEqual(['Mode Auto']);
    expect(diagram.getAttribute('spatial.mode')).toBe('auto');
    expect(diagram.getAttribute('spatial.anchoring')).toBe('auto');
    expect(diagram.getAttribute('spatial.edgeLine')).toBe('straight');
    expect(distributed).toEqual([['a', 'b']]);
  });

  it('page déjà en automatique : un tracé seul changé redessine les flèches (sujet 456)', () => {
    const { diagram, distributed } = arrive({ defaults: { edgeLine: 'straight' } }, 'auto');
    expect(diagram.getAttribute('spatial.edgeLine')).toBe('straight');
    expect(distributed).toEqual([['a', 'b']]);
    expect(arrive({ defaults: { edgeLine: 'straight' } }, 'manual').distributed).toEqual([]);
  });

  it('sans réglages déclarés, rien d’autre que le mode ; une valeur inconnue est ignorée', () => {
    const none = arrive(undefined);
    expect(none.diagram.hasAttribute('spatial.anchoring')).toBe(false);
    expect(none.distributed).toEqual([]);
    const unknown = arrive({ defaults: { edgeLine: 'zigzag' as 'straight' } });
    expect(unknown.diagram.hasAttribute('spatial.edgeLine')).toBe(false);
  });
});
