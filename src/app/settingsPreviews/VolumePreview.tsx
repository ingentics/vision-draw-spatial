import { SETTINGS_LIMITS } from '../../engine';
import type { BackgroundSettings, ViewSettings } from '../../engine';
import { PreviewFrame, mixColor, pathOf } from './previewParts';

/** Bloc dessiné : côté au sol en pixels de page, couleurs du bleu de draw.io. */
const SIDE = 70;
const FILL = '#dae8fc';
const STROKE = '#6c8ebf';
const COS = Math.cos(Math.PI / 6);
const SIN = Math.sin(Math.PI / 6);

/** Point (x, y au sol, z hauteur) en projection isométrique vraie. */
const iso = (x: number, y: number, z: number) => ({ x: (x - y) * COS, y: (x + y) * SIN - z });

/**
 * Aperçu des volumes (sujet 320) : un bloc iso de l'épaisseur réglée, dessus à la couleur de la forme, face de gauche
 * (éclairée) et de droite (à l'ombre) assombries des luminosités réglées (`render/iso/block.ts`) ; à plat sans volume.
 */
export function VolumePreview({ view, background }: { view: ViewSettings; background: BackgroundSettings }) {
  const height = view.isoVolume ? view.isoDepth : 0;
  const shade = (k: number) => mixColor('#000000', FILL, k);
  const face = (corners: Array<[number, number, number]>, fill: string) => (
    <path
      d={`${pathOf(corners.map(([x, y, z]) => iso(x, y, z)))} Z`}
      fill={fill}
      stroke={STROKE}
      strokeLinejoin="round"
    />
  );
  // Cadre fixe, à la place du bloc le plus haut : on voit l'épaisseur changer.
  const top = -SETTINGS_LIMITS['view.isoDepth'].max - 10;
  return (
    <PreviewFrame
      background={background}
      height={170}
      viewBox={`${-SIDE * COS - 10} ${top} ${2 * SIDE * COS + 20} ${2 * SIDE * SIN - top + 10}`}
    >
      {face(
        [
          [0, SIDE, 0],
          [SIDE, SIDE, 0],
          [SIDE, SIDE, height],
          [0, SIDE, height],
        ],
        shade(view.shadeLight),
      )}
      {face(
        [
          [SIDE, 0, 0],
          [SIDE, SIDE, 0],
          [SIDE, SIDE, height],
          [SIDE, 0, height],
        ],
        shade(view.shadeDark),
      )}
      {face(
        [
          [0, 0, height],
          [SIDE, 0, height],
          [SIDE, SIDE, height],
          [0, SIDE, height],
        ],
        FILL,
      )}
    </PreviewFrame>
  );
}
