import type { Object3D } from 'three';
import type { Point, Rect } from '../model/types';

/**
 * Silhouette debout (sujet 306) : forme dessinée face à la caméra en iso / 3D (ex. Actor), dans un enfant de son objet
 * qui tourne vers la caméra. Contrat entre la forme qui la dessine (`setStandingFigure`) et le tronc qui la lit
 * (`standingFigure`) pour le clic, la mise en valeur de la tête et l'édition du texte sur la pancarte.
 */
export interface StandingFigure {
  /** Cadre de la tête, dans le plan de la silhouette (x horizontal, y vers le haut) : la sélection l'entoure. */
  head: Rect;
  /** Pièces pleines et traits, dans ce plan : le clic ne prend que la silhouette. */
  parts: Point[][];
  strokes: Point[][];
  /** Pancarte tenue devant le corps, dans ce plan : prise au clic sur toute sa surface, texte édité dessus. */
  sign?: Rect;
  /** Style de l'éditeur du texte sur la pancarte (celui du texte dessiné). */
  signLabelStyle?(style: Record<string, string>): Record<string, string>;
}

/** Nom de l'enfant qui porte la silhouette. */
const SILHOUETTE = 'silhouette';

/** Déclare `silhouette`, enfant de `object` (l'objet de la forme), comme sa silhouette debout. */
export function setStandingFigure(object: Object3D, silhouette: Object3D, figure: StandingFigure): void {
  object.userData.standing = true;
  silhouette.name = SILHOUETTE;
  const { head, parts, strokes, sign, signLabelStyle } = figure;
  Object.assign(silhouette.userData, { head, parts, strokes, sign, signLabelStyle });
}

/** Silhouette debout de l'objet d'une forme ; undefined pour une autre forme. */
export function standingFigure(
  object: Object3D | undefined,
): { silhouette: Object3D; figure: StandingFigure } | undefined {
  if (!object?.userData.standing) return undefined;
  const silhouette = object.getObjectByName(SILHOUETTE);
  const data = silhouette?.userData as Partial<StandingFigure> | undefined;
  if (!silhouette || !data?.head || !data.parts || !data.strokes) return undefined;
  const { head, parts, strokes, sign, signLabelStyle } = data;
  return { silhouette, figure: { head, parts, strokes, sign, signLabelStyle } };
}
