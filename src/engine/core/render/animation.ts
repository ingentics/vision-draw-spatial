import { Color } from 'three';
import type { BufferAttribute, Mesh, Object3D } from 'three';

/**
 * Objets animés d'eux-mêmes (sujet 538, Metamorph) : un loader qui tourne autour de son axe z, des teintes qui tournent
 * (halo arc-en-ciel), qui peuvent aller et venir en rythme. L'état suit l'horloge de l'image : une forme reconstruite reprend la même phase. Tant qu'un tel
 * objet est visible, le moteur redemande une image à chaque image.
 */

/**
 * Rythme d'une pulsation : un temps de `beat` secondes par élément de `pattern` (1 : une pulsation, 0 : un temps de
 * pause), en boucle. Ex. `[1, 1, 0, 0]` : « vou vou, pause pause ».
 */
export interface Rhythm {
  beat: number;
  pattern: readonly number[];
}

/**
 * Teintes qui tournent : chaque sommet garde sa teinte de départ (attribut `hue`, 0 à 1) décalée de `turnsPerSecond`
 * tours par seconde, couleurs vives. `pulse` : les couleurs vont et viennent depuis `background` à ce rythme ; absent,
 * elles restent vives.
 */
export interface HueSpin {
  turnsPerSecond: number;
  background: string;
  pulse?: Rhythm;
}

/** Fait tourner `object` de `turnsPerSecond` tours par seconde (sens horaire à l'écran, y vers le bas). */
export function spinObject(object: Object3D, turnsPerSecond: number): void {
  object.userData.spin = turnsPerSecond;
}

/**
 * Fait tourner les teintes des sommets de `mesh` : sa géométrie porte `hue` (teinte de départ) et `color` (RGB ou RGBA,
 * l'alpha reste tel quel), son matériau `vertexColors`.
 */
export function spinHues(mesh: Mesh, spin: HueSpin): void {
  mesh.userData.hueSpin = spin;
}

/** Intensité de la pulsation à `seconds` : 0 au repos, 1 au plus fort. */
export function pulseIntensity(pulse: Rhythm, seconds: number): number {
  const beats = seconds / pulse.beat;
  const index = Math.floor(beats) % pulse.pattern.length;
  return (pulse.pattern[index] ?? 0) * Math.sin(Math.PI * (beats - Math.floor(beats)));
}

/**
 * Anime les objets visibles déclarés par `spinObject` ou `spinHues` à l'instant `now` (ms) ; vrai s'il y en a. Seules
 * la rotation et les couleurs changent : opacités et fondus restent au moteur.
 */
export function animateObjects(root: Object3D, now: number): boolean {
  let found = false;
  const seconds = now / 1000;
  const visit = (object: Object3D) => {
    if (!object.visible) return;
    const speed = object.userData.spin as number | undefined;
    if (speed !== undefined) {
      object.rotation.z = (seconds * speed * 2 * Math.PI) % (2 * Math.PI);
      found = true;
    }
    const spin = object.userData.hueSpin as HueSpin | undefined;
    if (spin) {
      applyHueSpin(object as Mesh, spin, seconds);
      found = true;
    }
    for (const child of object.children) visit(child);
  };
  visit(root);
  return found;
}

function applyHueSpin(mesh: Mesh, spin: HueSpin, seconds: number): void {
  const hues = mesh.geometry.getAttribute('hue') as BufferAttribute | undefined;
  const colors = mesh.geometry.getAttribute('color') as BufferAttribute | undefined;
  if (!hues || !colors) return;
  const background = new Color(spin.background);
  const intensity = spin.pulse ? pulseIntensity(spin.pulse, seconds) : 1;
  const shift = seconds * spin.turnsPerSecond;
  const color = new Color();
  for (let i = 0; i < hues.count; i++) {
    const hue = (((hues.getX(i) + shift) % 1) + 1) % 1;
    color.setHSL(hue, 1, 0.55).lerp(background, 1 - intensity);
    colors.setXYZ(i, color.r, color.g, color.b);
  }
  colors.needsUpdate = true;
}
