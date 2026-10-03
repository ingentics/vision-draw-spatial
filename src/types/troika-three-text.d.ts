// Déclaration minimale : troika-three-text ne fournit pas de types.
declare module 'troika-three-text' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports -- classe étendue ci-dessous
  import { Color, Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    color: Color | string | number | null;
    anchorX: number | string;
    anchorY: number | string;
    textAlign: 'left' | 'right' | 'center' | 'justify';
    lineHeight: number | 'normal';
    maxWidth: number;
    whiteSpace: 'normal' | 'nowrap';
    overflowWrap: 'normal' | 'break-word';
    fillOpacity: number;
    /** Contour autour des glyphes (unités locales, ou pourcentage de la taille : '10%'). */
    outlineWidth: number | string;
    outlineColor: Color | string | number;
    outlineOpacity: number;
    outlineBlur: number | string;
    sync(callback?: () => void): void;
    dispose(): void;
  }

  export function preloadFont(options: { font?: string; characters?: string | string[] }, callback: () => void): void;
}
