import { describe, expect, it } from 'vitest';
import {
  ACTOR,
  COMMAND,
  CONSTRAINT,
  EVENT,
  HOTSPOT,
  POLICY,
  QUERY,
  SYSTEM,
} from '../../../../../../src/engine/plugins/modes/eventstorming/kinds';
import { dragPlaces, sidesFor } from '../../../../../../src/engine/plugins/modes/eventstorming/places/placesAround';
import { setup, sticky, stormingXml } from '../helpers';

const size = (x: number, y: number) => ({ x, y, width: 160, height: 160 });

describe('mode Event storming : cases où poser le post-it glissé (sujets 481, 520)', () => {
  it('grammaire de stickyRules.ts : séquence à droite, attache sur 4 côtés, empilement ; Hotspot partout', () => {
    const all = ['n', 'e', 's', 'w'];
    // R1 seule : à droite de A pour B, à gauche de B pour A.
    expect(sidesFor(QUERY, EVENT)).toEqual(['e']);
    expect(sidesFor(EVENT, QUERY)).toEqual(['w']);
    // Event | Command (causes) et Command | Event (produces).
    expect(sidesFor(COMMAND, EVENT)).toEqual(['e', 'w']);
    // R2 : n'importe quel côté, dans les deux sens (même si une R1 existe aussi).
    expect(sidesFor(COMMAND, ACTOR)).toEqual(all);
    expect(sidesFor(ACTOR, COMMAND)).toEqual(all);
    expect(sidesFor(POLICY, EVENT)).toEqual(all);
    expect(sidesFor(SYSTEM, EVENT)).toEqual(all);
    expect(sidesFor(ACTOR, QUERY)).toEqual(all);
    expect(sidesFor(CONSTRAINT, QUERY)).toEqual(all);
    // Empilement : Domain Events (R5) et Constraints.
    expect(sidesFor(EVENT, EVENT)).toEqual(['n', 's']);
    expect(sidesFor(CONSTRAINT, CONSTRAINT)).toEqual(['n', 's']);
    expect(sidesFor(POLICY, POLICY)).toEqual(['n', 's']);
    // Policy intercalée à droite d'une Command (vers ses Events).
    expect(sidesFor(POLICY, COMMAND)).toEqual(['e', 'w']);
    expect(sidesFor(COMMAND, POLICY)).toEqual(['e', 'w']);
    // Sans règle de lecture, aucune case.
    expect(sidesFor(ACTOR, EVENT)).toEqual([]);
    expect(sidesFor(CONSTRAINT, EVENT)).toEqual([]);
    expect(sidesFor(SYSTEM, SYSTEM)).toEqual([]);
    expect(sidesFor(HOTSPOT, ACTOR)).toEqual(all);
    expect(sidesFor(ACTOR, HOTSPOT)).toEqual(all);
  });

  it('cases des voisins proches, collées et alignées ; les lointains, non', () => {
    const { page, shape } = setup(
      stormingXml(
        sticky('c', 'command', 1000, 1000) +
          sticky('a', 'actor', 0, 0) +
          sticky('e', 'event', 500, 0) +
          sticky('far', 'actor', 0, 600),
      ),
    );
    // Autour de l'Actor (attache), à gauche et à droite de l'Event ; rien autour de l'Actor lointain.
    expect(dragPlaces(page(), shape('c'), size(250, 20))).toEqual({
      places: [size(0, -160), size(160, 0), size(0, 160), size(-160, 0), size(660, 0), size(340, 0)],
    });
  });

  it('case qui chevaucherait un post-it : pas montrée ; case en double : une fois', () => {
    const { page, shape } = setup(
      stormingXml(sticky('q', 'query', 1000, 1000) + sticky('e', 'event', 0, 0) + sticky('x', 'system', 200, 0)),
    );
    expect(dragPlaces(page(), shape('q'), size(150, 200))!.places).toEqual([]);
    const twice = setup(
      stormingXml(sticky('c', 'command', 1000, 1000) + sticky('e1', 'event', 0, 0) + sticky('e2', 'event', 320, 0)),
    );
    // Entre les deux Events : à droite du premier (causes) et à gauche du second (produces), une seule case.
    expect(dragPlaces(twice.page(), twice.shape('c'), size(160, 50))!.places).toEqual([
      size(160, 0),
      size(-160, 0),
      size(480, 0),
    ]);
  });

  it('échange : le post-it sous le centre du post-it glissé', () => {
    const { page, shape } = setup(stormingXml(sticky('c', 'command', 1000, 1000) + sticky('a', 'actor', 0, 0)));
    expect(dragPlaces(page(), shape('c'), size(40, 40))!.swapWith).toBe('a');
    expect(dragPlaces(page(), shape('c'), size(400, 400))!.swapWith).toBeUndefined();
  });

  it('Constraint à cheval au-dessus d’une Command et de son voisin, empilable (sujet 486)', () => {
    const { page, shape } = setup(
      stormingXml(sticky('k', 'constraint', 1000, 1000) + sticky('c', 'command', 0, 0) + sticky('e', 'event', 160, 0)),
    );
    // Autour de la Command (sa droite prise par l'Event), rien autour de l'Event, et la case à cheval.
    expect(dragPlaces(page(), shape('k'), size(100, -200))!.places).toEqual([
      size(0, -160),
      size(0, 160),
      size(-160, 0),
      size(80, -160),
    ]);
    const stacked = setup(
      stormingXml(
        sticky('k', 'constraint', 1000, 1000) +
          sticky('c', 'command', 0, 0) +
          sticky('e', 'event', 160, 0) +
          sticky('k1', 'constraint', 80, -160),
      ),
    );
    // Au-dessus de la première Constraint ; dessous, la rangée : écartée. Plus de case à cheval, prise.
    expect(dragPlaces(stacked.page(), stacked.shape('k'), size(100, -360))!.places).toEqual([size(80, -320)]);
  });

  it('Command seule : pas de case à cheval, les cases autour d’elle', () => {
    const { page, shape } = setup(stormingXml(sticky('k', 'constraint', 1000, 1000) + sticky('c', 'command', 0, 0)));
    expect(dragPlaces(page(), shape('k'), size(100, -200))!.places).toEqual([
      size(0, -160),
      size(160, 0),
      size(0, 160),
      size(-160, 0),
    ]);
  });
});
