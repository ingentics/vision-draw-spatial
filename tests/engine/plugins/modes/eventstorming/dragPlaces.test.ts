import { describe, expect, it } from 'vitest';
import {
  ACTOR,
  COMMAND,
  CONSTRAINT,
  EVENT,
  HOTSPOT,
  POLICY,
  QUERY,
} from '../../../../../src/engine/plugins/modes/eventstorming/kinds';
import { dragPlaces, sidesFor } from '../../../../../src/engine/plugins/modes/eventstorming/places/dragPlaces';
import { setup, sticky, stormingXml } from './helpers';

const size = (x: number, y: number) => ({ x, y, width: 160, height: 160 });

describe('mode Event storming : cases où poser le post-it glissé (sujet 481)', () => {
  it('grammaire : côtés du voisin, dans les deux sens ; Hotspot partout', () => {
    expect(sidesFor(COMMAND, ACTOR)).toEqual(['e']);
    expect(sidesFor(ACTOR, COMMAND)).toEqual(['w']);
    expect(sidesFor(COMMAND, EVENT)).toEqual(['w']);
    expect(sidesFor(EVENT, EVENT)).toEqual(['e', 'w']);
    expect(sidesFor(POLICY, EVENT)).toEqual(['s']);
    expect(sidesFor(EVENT, POLICY)).toEqual(['n']);
    expect(sidesFor(QUERY, EVENT)).toEqual(['e']);
    expect(sidesFor(ACTOR, QUERY)).toEqual(['e']);
    expect(sidesFor(ACTOR, EVENT)).toEqual([]);
    expect(sidesFor(HOTSPOT, ACTOR)).toEqual(['n', 'e', 's', 'w']);
    expect(sidesFor(ACTOR, HOTSPOT)).toEqual(['n', 'e', 's', 'w']);
    expect(sidesFor(CONSTRAINT, CONSTRAINT)).toEqual(['n', 's']);
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
    // Command glissée entre l'Actor et l'Event : à droite de l'un, à gauche de l'autre.
    expect(dragPlaces(page(), shape('c'), size(250, 20))).toEqual({ places: [size(160, 0), size(340, 0)] });
  });

  it('case qui chevaucherait un post-it : pas montrée ; case en double : une fois', () => {
    const { page, shape } = setup(
      stormingXml(sticky('c', 'command', 1000, 1000) + sticky('a', 'actor', 0, 0) + sticky('x', 'system', 200, 0)),
    );
    expect(dragPlaces(page(), shape('c'), size(150, 200))!.places).toEqual([]);
    const twice = setup(
      stormingXml(sticky('c', 'command', 1000, 1000) + sticky('a', 'actor', 0, 0) + sticky('e', 'event', 320, 0)),
    );
    expect(dragPlaces(twice.page(), twice.shape('c'), size(160, 50))!.places).toEqual([size(160, 0)]);
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
    // Command | Constraint et Constraint | Domain Event : cases prises par le voisin ; reste celle à cheval.
    expect(dragPlaces(page(), shape('k'), size(100, -200))!.places).toEqual([size(80, -160)]);
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

  it('Command seule : pas de case à cheval, la case à sa droite', () => {
    const { page, shape } = setup(stormingXml(sticky('k', 'constraint', 1000, 1000) + sticky('c', 'command', 0, 0)));
    expect(dragPlaces(page(), shape('k'), size(100, -200))!.places).toEqual([size(160, 0)]);
  });
});
