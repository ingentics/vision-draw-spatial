import { BufferGeometry, Color, Float32BufferAttribute, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import {
  animateObjects,
  animateScene,
  pulseIntensity,
  restLeft,
  spinHues,
} from '../../../../src/engine/core/render/animation';

describe('objets animés (sujet 538)', () => {
  it('pulsation « vou vou, pause pause » : deux temps forts puis deux temps de repos, en boucle', () => {
    const rhythm = { beat: 1, pattern: [1, 1, 0, 0] };
    expect([0.5, 1.5, 2.5, 3.5, 4.5].map((s) => pulseIntensity(rhythm, s))).toEqual([1, 1, 0, 0, 1]);
    expect(pulseIntensity(rhythm, 1)).toBeCloseTo(0);
  });

  it('teintes qui tournent : décalées avec le temps, alpha gardé, couleur du fond au repos', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
    geometry.setAttribute('color', new Float32BufferAttribute([1, 1, 1, 0.5], 4));
    geometry.setAttribute('hue', new Float32BufferAttribute([0], 1));
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true }));
    const colorAt = () => {
      const c = geometry.getAttribute('color');
      return new Color(c.getX(0), c.getY(0), c.getZ(0));
    };
    spinHues(mesh, { turnsPerSecond: 0.5, background: '#ffffff' });
    expect(animateObjects(mesh, 0)).toBe(true);
    expect(colorAt().getHSL({ h: 0, s: 0, l: 0 }).h).toBeCloseTo(0);
    animateObjects(mesh, 1000);
    expect(colorAt().getHSL({ h: 0, s: 0, l: 0 }).h).toBeCloseTo(0.5);
    expect(geometry.getAttribute('color').getW(0)).toBe(0.5);
    spinHues(mesh, { turnsPerSecond: 0.5, background: '#ffffff', gray: true });
    const lightness = () => colorAt().getHSL({ h: 0, s: 0, l: 0 });
    animateObjects(mesh, 0);
    expect(lightness().s).toBeCloseTo(0);
    expect(lightness().l).toBeCloseTo(0.7);
    animateObjects(mesh, 1000);
    expect(lightness().l).toBeCloseTo(0.3);
    expect(animateObjects(new Mesh(), 0)).toBe(false);
    spinHues(mesh, { turnsPerSecond: 0.5, background: '#ffffff', pulse: { beat: 1, pattern: [0] } });
    animateObjects(mesh, 1000);
    expect(colorAt().getHexString()).toBe('ffffff');
  });
});

/** Maillage d'un sommet portant une teinte, comme le halo. */
function hueMesh(): Mesh {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
  geometry.setAttribute('color', new Float32BufferAttribute([1, 1, 1, 0.5], 4));
  geometry.setAttribute('hue', new Float32BufferAttribute([0], 1));
  return new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true }));
}

describe('repos des pulsations (sujet 553)', () => {
  const rhythm = { beat: 1, pattern: [1, 1, 0, 0] };

  it('rien pendant une pulsation ; jusqu’à la suivante pendant un repos (pauses qui se suivent comptées ensemble)', () => {
    expect(restLeft(rhythm, 0.5)).toBe(0);
    expect(restLeft(rhythm, 2.5)).toBeCloseTo(1.5);
    expect(restLeft(rhythm, 3.75)).toBeCloseTo(0.25);
    expect(restLeft({ beat: 1, pattern: [0] }, 0.5)).toBeCloseTo(0.5);
  });

  it('scène : attente nulle si un objet pulse, fin du repos si tous reposent, rien sans objet animé', () => {
    const mesh = hueMesh();
    spinHues(mesh, { turnsPerSecond: 1, background: '#ffffff', pulse: rhythm });
    expect(animateScene(mesh, 500)).toBe(0);
    expect(animateScene(mesh, 2500)).toBeCloseTo(1500);
    expect(animateScene(new Mesh(), 0)).toBeUndefined();
  });
});
