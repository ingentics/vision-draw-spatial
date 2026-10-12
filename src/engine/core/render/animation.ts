import { Color } from 'three';
import type { BufferAttribute, Mesh, Object3D } from 'three';

/**
 * Objets animés d'eux-mêmes (sujets 538, 539, halo d'une Metamorph) : des teintes qui tournent (arc-en-ciel, ou bande
 * claire en gris), qui peuvent aller et venir en rythme. L'état suit l'horloge de l'image : une forme reconstruite
 * reprend la même phase. Tant qu'un tel objet est visible, le moteur redemande une image à chaque image, sauf pendant
 * le repos de toutes les pulsations (couleurs du fond, rien ne change à l'écran) : la suivante attend sa fin.
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
 * elles restent vives. `gray` : en gris, la teinte de départ donne une bande claire qui tourne.
 */
export interface HueSpin {
  turnsPerSecond: number;
  background: string;
  pulse?: Rhythm;
  gray?: boolean;
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
 * Temps de repos restant (s) d'une pulsation à `seconds` : 0 pendant une pulsation, sinon jusqu'à la suivante (les
 * temps de pause qui se suivent comptent ensemble).
 */
export function restLeft(pulse: Rhythm, seconds: number): number {
  const { beat, pattern } = pulse;
  const beats = seconds / beat;
  const at = (index: number) => pattern[index % pattern.length] ?? 0;
  if (at(Math.floor(beats)) !== 0) return 0;
  let end = Math.floor(beats) + 1;
  for (let k = 1; k < pattern.length && at(end) === 0; k++) end++;
  return (end - beats) * beat;
}

/**
 * Anime les objets visibles déclarés par `spinHues` à l'instant `now` (ms) ; undefined s'il n'y en a pas, sinon
 * l'attente (ms) avant la prochaine image utile : 0 si l'un bouge, la fin du repos le plus court si tous reposent.
 * Seules la rotation et les couleurs changent : opacités et fondus restent au moteur.
 */
export function animateScene(root: Object3D, now: number): number | undefined {
  let wait: number | undefined;
  const seconds = now / 1000;
  const visit = (object: Object3D) => {
    if (!object.visible) return;
    const spin = object.userData.hueSpin as HueSpin | undefined;
    if (spin) {
      applyHueSpin(object as Mesh, spin, seconds);
      const rest = spin.pulse ? restLeft(spin.pulse, seconds) * 1000 : 0;
      wait = Math.min(wait ?? rest, rest);
    }
    for (const child of object.children) visit(child);
  };
  visit(root);
  return wait;
}

/** Anime les objets visibles déclarés par `spinHues` à l'instant `now` (ms) ; vrai s'il y en a (`animateScene`). */
export function animateObjects(root: Object3D, now: number): boolean {
  return animateScene(root, now) !== undefined;
}

/** Couleurs de travail d'un objet animé, créées une fois (pas à chaque image). */
interface SpinColors {
  background: Color;
  color: Color;
}

function applyHueSpin(mesh: Mesh, spin: HueSpin, seconds: number): void {
  const hues = mesh.geometry.getAttribute('hue') as BufferAttribute | undefined;
  const colors = mesh.geometry.getAttribute('color') as BufferAttribute | undefined;
  if (!hues || !colors) return;
  const own = (mesh.userData.spinColors ??= {
    background: new Color(spin.background),
    color: new Color(),
  }) as SpinColors;
  const { background, color } = own;
  const intensity = spin.pulse ? pulseIntensity(spin.pulse, seconds) : 1;
  const shift = seconds * spin.turnsPerSecond;
  for (let i = 0; i < hues.count; i++) {
    const hue = (((hues.getX(i) + shift) % 1) + 1) % 1;
    if (spin.gray) color.setHSL(0, 0, 0.3 + 0.2 * (1 + Math.cos(2 * Math.PI * hue)));
    else color.setHSL(hue, 1, 0.55);
    color.lerp(background, 1 - intensity);
    colors.setXYZ(i, color.r, color.g, color.b);
  }
  colors.needsUpdate = true;
}
