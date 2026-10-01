import { DoubleSide, MeshBasicMaterial } from 'three';
import { Text } from 'troika-three-text';
import type { TextFactory } from './types';

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
      text.sync(onReady);
      return text;
    },
    dispose() {
      baseMaterial.dispose();
    },
  };
}
