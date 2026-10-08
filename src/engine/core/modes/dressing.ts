import type { ReadonlyEdgeModel as EdgeModel, ReadonlyShapeModel as ShapeModel } from '../model/readonly';
import type { EdgeBadgeStyle } from '../render/types';

/** Habillage d'une page par son mode. */
export interface PageDressing {
  /**
   * Clés de style dessinées à la place de celles de la forme (ex. fond d'une région éclairci, sujet 345) ; le style
   * draw.io reste intact. undefined = son style.
   */
  shapeStyle?(shape: ShapeModel): Record<string, string> | undefined;
  /**
   * Couleur du mode pour une flèche (#rrggbb, ex. celle de son flux) : trait et pointes la prennent, assombrie de
   * `edgeDarken` ; undefined = son style.
   */
  edgeColor?(edge: EdgeModel): string | undefined;
  /** Assombrissement du trait coloré par le mode (fraction de la luminosité, 0,25 = −25 % ; défaut : 0,25). */
  edgeDarken?: number;
  /** Pastille posée sur une flèche, face à la caméra. */
  edgeBadge?(edge: EdgeModel): EdgeBadge | undefined;
  /** Apparence des pastilles (défaut : `DEFAULT_EDGE_BADGE`). */
  edgeBadgeStyle?: EdgeBadgeStyle;
}

/** Pastille ronde d'une flèche : au-dessus de son texte du milieu, plus petite au milieu de la flèche sans texte. */
export interface EdgeBadge {
  text: string;
  /** Fond (#rrggbb) ; le texte est noir. */
  color: string;
}
