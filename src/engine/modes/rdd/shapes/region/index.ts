import { flatBox } from '../../../../render/flat/box';
import { rectPath } from '../../../../render/geometry/paths';
import type { ShapeDefinition } from '../../../../shapes/types';
import { DEFAULT_HEADER_COLOR } from '../../tables';
import { REGION, REGION_KIND, regionStroke } from '../../regions';

/**
 * Région (sujet 182) : rectangle à fond très léger et bordure fine, label en gras en haut à gauche, posé au fond de la
 * pile ; déplacée, elle emporte les formes du mode dont le coin haut-gauche est dedans (`regions.ts`). Dans draw.io,
 * un rectangle de la même couleur (son contenu n'y suit pas ses déplacements).
 */
export const definition: ShapeDefinition = {
  id: REGION_KIND,
  outline: (shape) => rectPath(shape.bounds),
  flat: flatBox((shape) => rectPath(shape.bounds), { fill: DEFAULT_HEADER_COLOR, stroke: null }),
  contains: () => true,
  palette: {
    name: 'Région',
    category: 'rdd',
    order: 6,
    keywords: ['région', 'region', 'zone', 'domaine', 'groupe', 'cadre'],
    style:
      `rounded=0;whiteSpace=wrap;html=1;fillColor=${DEFAULT_HEADER_COLOR};fillOpacity=${REGION.fillOpacity};` +
      `strokeColor=${regionStroke(DEFAULT_HEADER_COLOR)};align=left;verticalAlign=top;fontStyle=1;` +
      `spacingLeft=8;spacingTop=4;spatial.kind=${REGION_KIND};`,
    value: 'Région',
    width: REGION.width,
    height: REGION.height,
    atBack: true,
    icon: '<rect x="3" y="3" width="34" height="22"/><path d="M6 8h9"/>',
  },
};
