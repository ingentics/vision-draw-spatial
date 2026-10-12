import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GenerationRequest } from '../../../src/engine';
import { createMockMetamorphServer } from '../../../src/app/metamorph/metamorphServer';

const request = (shapeId: string) =>
  ({
    shapeId,
    kind: 'metamorph',
    text: 'Serveur',
    comment: '',
    instructions: '',
    width: 80,
    height: 60,
  }) as GenerationRequest;

/** Ids des formes d'une bibliothèque rendue par le mock ; aucune quand il n'en a pas. */
const idsOf = (json: unknown) =>
  (json as { shapes: { id: string }[] } | undefined)?.shapes.map((shape) => shape.id) ?? [];

describe('serveur Metamorph mocké (sujet 554)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  async function generate(server: ReturnType<typeof createMockMetamorphServer>, shapeId: string) {
    const pending = server.generate(request(shapeId));
    await vi.advanceTimersByTimeAsync(2000);
    return idsOf(await pending);
  }

  it('une nouvelle demande pour la forme oublie ses propositions précédentes ; accepter oublie les autres', async () => {
    const server = createMockMetamorphServer();
    const first = await generate(server, 'm');
    const second = await generate(server, 'm');
    // Propositions oubliées : plus acceptables.
    expect(idsOf(await server.accept(first[0]!)).includes(first[0]!)).toBe(false);
    expect(idsOf(await server.accept(second[0]!))).toContain(second[0]);
    const others = second.slice(1);
    for (const id of others) expect(idsOf(await server.accept(id))).not.toContain(id);
  });
});
