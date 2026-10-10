import { Color } from 'three';
import type { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createTroikaTextFactory } from '../../../../src/engine/core/render/troikaText';
import type { TextSpec } from '../../../../src/engine/core/render/types';

/** Mises en page lancées par le faux texte, terminées à la demande du test. */
const syncs = vi.hoisted(() => [] as Array<() => void>);

// Faux texte troika : la mise en page (worker) se termine quand le test le décide, avec les événements de troika.
vi.mock('troika-three-text', async () => {
  const { Object3D: Base } = await import('three');
  class Text extends Base {
    sync(callback?: () => void) {
      this.dispatchEvent({ type: 'syncstart' } as never);
      syncs.push(() => {
        this.dispatchEvent({ type: 'synccomplete' } as never);
        callback?.();
      });
    }
  }
  return { Text };
});

const spec = (overrides: Partial<TextSpec> = {}): TextSpec => ({
  text: 'Bonjour',
  x: 0,
  y: 0,
  anchorX: 'left',
  anchorY: 'top',
  align: 'left',
  fontSize: 12,
  color: new Color('#000000'),
  opacity: 1,
  bold: false,
  ...overrides,
});

/** Laisse passer les promesses en attente (polices, mesure). */
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

function finishSyncs() {
  for (const finish of syncs.splice(0)) finish();
}

async function isSettled(promise: Promise<void>): Promise<boolean> {
  let done = false;
  void promise.then(() => (done = true));
  await flushPromises();
  return done;
}

describe('TroikaTextFactory.settled (sujet 445)', () => {
  it('rien en cours : tenue tout de suite', async () => {
    const factory = createTroikaTextFactory({}, () => undefined);
    expect(await isSettled(factory.settled())).toBe(true);
  });

  it('texte simple : tenue à la fin de sa mise en page', async () => {
    const factory = createTroikaTextFactory({}, () => undefined);
    factory.create(spec());
    const settled = factory.settled();
    expect(await isSettled(settled)).toBe(false);
    finishSyncs();
    expect(await isSettled(settled)).toBe(true);
  });

  it('texte riche : attendu avant même que ses morceaux existent, jusqu’à leur mise en page', async () => {
    const factory = createTroikaTextFactory({}, () => undefined);
    const group: Object3D = factory.create(spec({ text: 'Deux mots', underline: true }));
    // Demandée avant que les polices soient prêtes : le groupe est encore vide.
    expect(group.children).toHaveLength(0);
    const settled = factory.settled();
    expect(await isSettled(settled)).toBe(false);
    expect(group.children.length).toBeGreaterThan(0);
    expect(syncs.length).toBeGreaterThan(0);
    finishSyncs();
    expect(await isSettled(settled)).toBe(true);
  });
});
