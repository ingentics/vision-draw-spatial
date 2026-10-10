import { Object3D } from 'three';
import type { Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import type { RenderContext } from '../../../../../../src/engine/core/render/types';
import { definition } from '../../../../../../src/engine/plugins/modes/states/shapes/state';
import { MEASURE } from '../../../../../helpers';
import { setup } from '../helpers';

/** Rendu à plat d'un état de la fixture : traits dessinés, textes demandés (le dernier porte la marque de partie). */
function drawn(id: string) {
  const texts: string[] = [];
  const ctx: RenderContext = {
    ...MEASURE,
    text: {
      create: (spec) => {
        texts.push(spec.text);
        return new Object3D();
      },
    },
  };
  const group = definition.flat.create(setup().shape(id), ctx);
  const strokes = group.children.filter((child) => (child as Mesh).isMesh && child.name === 'stroke');
  return { strokes: strokes.length, texts, parts: group.children.map((child) => child.userData.part) };
}

describe('mode Machine à états : dessin de l’état (sujet 433)', () => {
  it('avec contenu : contour, trait sous le titre, titre puis contenu marqué comme partie', () => {
    const { strokes, texts, parts } = drawn('state2');
    expect(strokes).toBe(2);
    expect(texts).toEqual(['State2', 'entry / ouvrir\nexit / fermer']);
    expect(parts).toContain('body');
  });

  it('sans contenu : contour et titre seuls', () => {
    const { strokes, texts, parts } = drawn('state1');
    expect(strokes).toBe(1);
    expect(texts).toEqual(['State1']);
    expect(parts).not.toContain('body');
  });
});
