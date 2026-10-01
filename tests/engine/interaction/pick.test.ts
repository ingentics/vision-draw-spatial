import { describe, expect, it } from 'vitest';
import { parseDrawio } from '../../../src/engine/format/parse';
import { distanceToPolyline, pickElement } from '../../../src/engine/interaction/pick';
import { fixture } from '../../helpers';

const options = (routes: Record<string, { x: number; y: number }[]> = {}) => ({
  edgeTolerance: 4,
  edgeRoute: (id: string) => routes[id],
});

describe('pickElement', () => {
  const groups = parseDrawio(fixture('groups.drawio')).pages[0]!;

  it('l’enfant passe avant son conteneur, le conteneur reste attrapable ailleurs', () => {
    expect(pickElement(groups, { x: 150, y: 160 }, options())?.element.id).toBe('lane-a');
    expect(pickElement(groups, { x: 250, y: 250 }, options())?.element.id).toBe('lane');
  });

  it('les groupes invisibles sans lien ne sont pas attrapés', () => {
    // Dans g-outer mais hors de « deep » : rien.
    expect(pickElement(groups, { x: 200, y: 380 }, options())).toBeUndefined();
    expect(pickElement(groups, { x: 70, y: 320 }, options())?.element.id).toBe('deep');
  });

  it('ellipse : les coins de sa boîte ne comptent pas', () => {
    const simple = parseDrawio(fixture('simple.drawio')).pages[0]!;
    expect(pickElement(simple, { x: 80, y: 220 }, options())?.element.id).toBe('e1');
    expect(pickElement(simple, { x: 42, y: 182 }, options())).toBeUndefined();
  });

  it('arêtes : à distance de tolérance de leur tracé, au-dessus des formes dessinées avant', () => {
    const page = parseDrawio(fixture('drawio-desktop.drawio')).pages[0]!;
    const edgeId = 'Fs-0jHc4KjceeW8xsn6R-4';
    const routes = {
      [edgeId]: [
        { x: 180, y: 280 },
        { x: 180, y: 440 },
        { x: 280, y: 440 },
      ],
    };
    expect(pickElement(page, { x: 183, y: 350 }, options(routes))?.element.id).toBe(edgeId);
    expect(pickElement(page, { x: 190, y: 350 }, options(routes))).toBeUndefined();
  });

  it('calques cachés et éléments invisibles ignorés', () => {
    const layers = parseDrawio(fixture('layers.drawio')).pages[0]!;
    expect(pickElement(layers, { x: 110, y: 10 }, options())).toBeUndefined(); // calque caché
    expect(pickElement(layers, { x: 10, y: 110 }, options())).toBeUndefined(); // forme cachée
    expect(pickElement(layers, { x: 10, y: 10 }, options())?.element.id).toBe('base-shape');
  });
});

describe('distanceToPolyline', () => {
  it('distance au segment le plus proche, extrémités comprises', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    expect(distanceToPolyline({ x: 5, y: 3 }, line)).toBe(3);
    expect(distanceToPolyline({ x: 13, y: 4 }, line)).toBe(5);
  });
});
