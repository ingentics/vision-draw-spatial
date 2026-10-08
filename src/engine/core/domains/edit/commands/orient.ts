import { canMoveCell, resizeCell, setCellStyleValue } from '../../../format/cellEdits';
import { writeDrawio } from '../../../format/write';
import { orientChange } from '../../../edit/orientShapes';
import type { OrientAction } from '../../../edit/orientShapes';
import type { EngineCore } from '../../EngineCore';

/** Étape d'annulation de chaque action (sujet 335). */
const ORIENT_LABELS: Record<OrientAction, string> = {
  flipHorizontal: 'Retourner horizontalement',
  flipVertical: 'Retourner verticalement',
  rotateLeft: 'Pivoter à gauche',
  rotateRight: 'Pivoter à droite',
};

/** Retourner et pivoter les formes (sujet 335). */
export class OrientCommands {
  constructor(private readonly core: EngineCore) {}

  /**
   * Applique l'action aux formes données qui l'acceptent (capacités de leur définition), chacune sur son propre centre,
   * en une seule étape d'annulation. Écrit `direction`, `flipH`, `flipV` ; un pivot échange aussi largeur et hauteur.
   */
  orientShapes(shapeIds: string[], action: OrientAction): void {
    const editable = this.core.targets.editablePage();
    if (!editable || !this.core.file.xmlTree) return;
    const { page, pageTree } = editable;
    const allowed = page.shapes.filter((shape) => {
      if (!shapeIds.includes(shape.id) || !canMoveCell(pageTree, shape.id)) return false;
      const can = this.core.registry.orientable(shape);
      return action === 'flipHorizontal'
        ? can.flipHorizontal
        : action === 'flipVertical'
          ? can.flipVertical
          : can.rotate;
    });
    const changes = allowed.flatMap((shape) => {
      const change = orientChange(shape.style, action);
      return change ? [{ shape, change }] : [];
    });
    if (changes.length === 0) return;
    const before = writeDrawio(this.core.file.xmlTree);
    for (const { shape, change } of changes) {
      for (const [key, value] of Object.entries(change.style)) setCellStyleValue(pageTree, shape.id, key, value);
      if (change.swapSize) {
        const { width, height } = shape.bounds;
        // Autour du centre : le coin haut gauche se déplace de la moitié de la différence.
        resizeCell(pageTree, shape.id, {
          x: (width - height) / 2,
          y: (height - width) / 2,
          width: height - width,
          height: width - height,
        });
      }
    }
    this.core.edits.recordSnapshot(ORIENT_LABELS[action], before);
    this.core.file.documentChanged([page.id]);
  }
}
