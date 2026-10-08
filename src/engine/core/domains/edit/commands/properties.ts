import { formatLink } from '../../../format/link';
import { formatNumber, setCellObjectAttribute, setCellStyleValue } from '../../../format/cellEdits';
import { setCellLink, setCellWrapperAttribute } from '../../../format/create';
import { COMMENT_ATTRIBUTE, COMMENT_HTML_ATTRIBUTE, commentOf, sameComment } from '../../../edit/comment';
import type { ElementComment } from '../../../edit/comment';
import type { LinkModel } from '../../../model/types';
import { SPATIAL_PREFIX, spatialValue } from '../../../spatial';
import type { EngineCore } from '../../EngineCore';

/** Lien, commentaire et attributs spatiaux d'un élément (SPEC §14.3). */
export class PropertyEdits {
  constructor(private readonly core: EngineCore) {}

  setLink(elementId: string, link: LinkModel | undefined): void {
    const editable = this.core.targets.editablePage();
    const element = editable && [...editable.page.shapes, ...editable.page.edges].find((e) => e.id === elementId);
    if (!editable || !element) return;
    const href = link ? formatLink(link) : undefined;
    if (href === (element.link ? formatLink(element.link) : undefined)) return;
    this.core.edits.recordEdit(link ? 'Lien' : 'Lien retiré');
    setCellLink(editable.pageTree, elementId, href);
    this.core.file.documentChanged([editable.page.id]);
  }

  /**
   * Commentaire d'un élément (attribut `tooltip`) : texte brut, ou HTML s'il a une mise en forme partielle (marqué par
   * `spatial.commentHtml`) ; texte vide = retiré.
   */
  setComment(elementId: string, comment: ElementComment): void {
    const editable = this.core.targets.writablePage();
    const element = editable && [...editable.page.shapes, ...editable.page.edges].find((e) => e.id === elementId);
    if (!editable || !element) return;
    const next = comment.text.trim()
      ? comment.html !== undefined
        ? { text: comment.text, html: comment.html }
        : { text: comment.text.replace(/\s+$/, '') }
      : undefined;
    if (sameComment(next, commentOf(element))) return;
    this.core.edits.recordEdit(next ? 'Commentaire' : 'Commentaire retiré');
    setCellWrapperAttribute(editable.pageTree, elementId, COMMENT_ATTRIBUTE, next?.html ?? next?.text);
    setCellWrapperAttribute(
      editable.pageTree,
      elementId,
      COMMENT_HTML_ATTRIBUTE,
      next?.html !== undefined ? '1' : undefined,
    );
    this.core.file.documentChanged([editable.page.id]);
  }

  /**
   * Demande l'édition en place du commentaire d'un élément de la page courante, édition activée ou non ; faux si
   * l'élément n'y est pas. `fromNavigation` : élément sélectionné pour l'occasion, désélectionné à la sortie.
   */
  editComment(elementId: string, fromNavigation = false): boolean {
    const editable = this.core.targets.writablePage();
    if (!editable) return false;
    const shape = editable.page.shapes.find((s) => s.id === elementId);
    const element = shape ?? editable.page.edges.find((e) => e.id === elementId);
    if (!element) return false;
    this.core.events.emit('commentEdit', {
      pageId: editable.page.id,
      elementId,
      onEdge: !shape,
      comment: commentOf(element),
      ...(fromNavigation && { fromNavigation }),
    });
    return true;
  }

  setSpatial(elementId: string, key: string, value: number | string | undefined, merge?: string): void {
    const editable = this.core.targets.editablePage();
    const shape = editable?.page.shapes.find((s) => s.id === elementId);
    if (!editable || !shape || !key.startsWith(SPATIAL_PREFIX)) return;
    const text =
      typeof value === 'string'
        ? value.replaceAll(';', '')
        : value === undefined || !Number.isFinite(value)
          ? undefined
          : formatNumber(Math.max(0, value));
    if (spatialValue(shape, key) === text) return;
    this.core.edits.recordMergeableEdit('Attribut spatial', merge);
    const inObject = shape.attributes[key] !== undefined && shape.style[key] === undefined;
    const written = inObject && setCellObjectAttribute(editable.pageTree, elementId, key, text);
    if (!written) setCellStyleValue(editable.pageTree, elementId, key, text);
    // Réglage déclaré en direct par la forme (sujet 306) : il ne touche que le dessin de sa forme.
    const live = this.core.registry.properties(shape).some((p) => p.key === key && p.type === 'text' && p.live);
    // Copie de travail de la page (sujet 312), rendue aussitôt : le modèle du document, gelé, n'est pas modifié.
    const copy = merge !== undefined && live ? this.core.file.livePage(editable.page.id, this) : undefined;
    if (copy) {
      const liveShape = copy.shapes.find((s) => s.id === elementId)!;
      // Le modèle suit le fichier, la forme seule est redessinée.
      const values = written ? liveShape.attributes : liveShape.style;
      if (text === undefined) delete values[key];
      else values[key] = text;
      this.core.live.rebuildShapeObject(liveShape);
      this.core.file.settleLivePage(this);
      this.core.live.afterLiveWrite(editable.page.id);
      return;
    }
    this.core.file.documentChanged([editable.page.id]);
  }
}
