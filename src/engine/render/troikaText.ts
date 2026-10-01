import { DoubleSide, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Color } from 'three';
import { Text } from 'troika-three-text';
import type { TextFactory } from './types';

const BACKGROUND_PADDING = 1;

/** Rectangle de fond aux dimensions du texte mis en page (connues seulement après la synchro troika). */
function updateBackground(text: Text, color: Color, opacity: number): void {
  const info = (text as Text & { textRenderInfo?: { blockBounds: [number, number, number, number] } }).textRenderInfo;
  if (!info) return;
  const [minX, minY, maxX, maxY] = info.blockBounds;
  const previous = text.getObjectByName('label-background');
  if (previous) {
    text.remove(previous);
    (previous as Mesh).geometry.dispose();
    ((previous as Mesh).material as MeshBasicMaterial).dispose();
  }
  const mesh = new Mesh(
    new PlaneGeometry(maxX - minX + 2 * BACKGROUND_PADDING, maxY - minY + 2 * BACKGROUND_PADDING),
    new MeshBasicMaterial({ color, opacity, transparent: true, depthWrite: false, side: DoubleSide }),
  );
  mesh.name = 'label-background';
  mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, 0);
  // Juste sous le texte, mais au-dessus du trait de l'élément.
  mesh.renderOrder = text.renderOrder - 0.5;
  text.add(mesh);
}

/** URLs de polices (.ttf, .otf ou .woff — pas de .woff2). Sans police, troika en charge une depuis un CDN. */
export interface FontSet {
  regular?: string;
  bold?: string;
}

/**
 * Texte SDF (SPEC §8.5) : net en vue de dessus quel que soit le zoom, et posé à plat sur le sol.
 * La mise en page se fait dans un worker ; `onReady` est appelé à chaque texte prêt, pour redessiner.
 */
export function createTroikaTextFactory(fonts: FontSet, onReady: () => void): TextFactory & { dispose(): void } {
  const baseMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide });

  return {
    create(spec) {
      const text = new Text();
      text.material = baseMaterial;
      text.text = spec.text;
      text.font = (spec.bold ? fonts.bold : fonts.regular) ?? fonts.regular ?? null;
      text.fontSize = spec.fontSize;
      text.color = spec.color;
      text.fillOpacity = spec.opacity;
      text.anchorX = spec.anchorX;
      text.anchorY = spec.anchorY;
      text.textAlign = spec.align;
      text.lineHeight = 1.2;
      if (spec.maxWidth !== undefined) {
        text.maxWidth = spec.maxWidth;
        text.overflowWrap = 'break-word';
      } else {
        text.whiteSpace = 'nowrap';
      }
      text.position.set(spec.x, spec.y, 0);
      // L'espace page a y vers le bas ; le texte troika a y vers le haut.
      text.scale.set(1, -1, 1);
      const background = spec.background;
      text.sync(() => {
        if (background) updateBackground(text, background, spec.opacity);
        onReady();
      });
      return text;
    },
    dispose() {
      baseMaterial.dispose();
    },
  };
}
