import { Color, Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import type { Point } from '../model/types';

/**
 * Fond de la vue (SPEC §9.5) : un plan au sol, sous tout le reste, qui peint la couleur de fond
 * et la grille. Les lignes sont calculées par pixel (shader) : nettes et d'un pixel d'épaisseur à
 * tout zoom, dans les trois modes ; elles s'estompent quand leurs cases deviennent trop petites
 * à l'écran (dézoom, lointain de la vue 3D), au lieu de produire du moiré.
 */

export interface GridOptions {
  visible: boolean;
  /** Couleur du fond (CSS). */
  background: string;
  /** Couleur des lignes (CSS) ; les lignes secondaires en sont une version plus légère. */
  color: string;
  /** Côté d'une case, en pixels de page. */
  cell: number;
  /** Une ligne principale toutes les `majorEvery` cases ; 1 = pas de lignes principales. */
  majorEvery: number;
  /** Intensité des lignes secondaires (les principales sont pleines), 0–1. */
  minorStrength: number;
}

const vertexShader = /* glsl */ `
  varying vec2 vPage;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPage = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBackground;
  uniform vec3 uColor;
  uniform float uCell;
  uniform float uMajor;
  uniform float uShowGrid;
  uniform float uMinor;
  varying vec2 vPage;

  // Intensité des lignes d'une grille de pas \`cell\` : distance à la ligne la plus proche
  // en pixels écran, par axe (fwidth), trait d'un pixel lissé.
  float lines(float cell, float strength) {
    vec2 coord = vPage / cell;
    vec2 perPixel = max(fwidth(coord), vec2(1e-6));
    vec2 distance = abs(fract(coord - 0.5) - 0.5) / perPixel;
    vec2 line = 1.0 - smoothstep(0.0, 1.0, distance);
    // Lignes trop serrées (cases de moins de quelques pixels) : estompées.
    line *= smoothstep(vec2(3.0), vec2(8.0), 1.0 / perPixel);
    return max(line.x, line.y) * strength;
  }

  void main() {
    float a = 0.0;
    if (uShowGrid > 0.5) {
      a = lines(uCell, uMajor > 1.5 ? uMinor : 1.0);
      if (uMajor > 1.5) a = max(a, lines(uCell * uMajor, 1.0));
    }
    gl_FragColor = vec4(mix(uBackground, uColor, a), 1.0);
    #include <colorspace_fragment>
  }
`;

export interface Grid {
  mesh: Mesh;
  setOptions(options: GridOptions): void;
  /** Recentre le plan sous la vue ; `extent` : côté du plan, au-delà de tout ce qui est visible. */
  follow(center: Point, extent: number): void;
  dispose(): void;
}

export function createGrid(options: GridOptions): Grid {
  // Plan horizontal (XZ, Y = 0) de côté 1, mis à l'échelle de la vue.
  const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uBackground: { value: new Color() },
      uColor: { value: new Color() },
      uCell: { value: 10 },
      uMajor: { value: 1 },
      uShowGrid: { value: 1 },
      uMinor: { value: 0.55 },
    },
    // Fond : dessiné en premier, sans toucher à la profondeur ; tout le reste passe par-dessus.
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'grid';
  mesh.renderOrder = -1_000_000;
  mesh.frustumCulled = false;

  const grid: Grid = {
    mesh,
    setOptions(next) {
      const u = material.uniforms;
      (u.uBackground!.value as Color).set(next.background);
      (u.uColor!.value as Color).set(next.color);
      u.uCell!.value = Math.max(next.cell, 1e-3);
      u.uMajor!.value = Math.max(1, Math.round(next.majorEvery));
      u.uShowGrid!.value = next.visible ? 1 : 0;
      u.uMinor!.value = Math.min(1, Math.max(0, next.minorStrength));
    },
    follow(center, extent) {
      mesh.position.set(center.x, 0, center.y);
      mesh.scale.set(extent, 1, extent);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
  grid.setOptions(options);
  return grid;
}
