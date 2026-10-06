import { formatLink } from '../../../format/link';
import { formatNumber, setCellObjectAttribute, setCellStyleValue } from '../../../format/edit';
import { setCellLink, setCellWrapperAttribute } from '../../../format/create';
import { COMMENT_ATTRIBUTE, commentOf } from '../../../edit/comment';
import { GRAPH_PAGE_ID } from '../../../graph/graphPage';
import type { LinkModel } from '../../../model/types';
import { SPATIAL_PREFIX, spatialValue, SPATIAL } from '../../../spatial';
import type { EngineCore } from '../../EngineCore';

/** Attributs spatiaux qui ne touchent que le dessin de leur forme : réglés en direct, seule la forme est redessinée. */
const LIVE_SHAPE_KEYS: ReadonlySet<string> = new Set([SPATIAL.tag]);

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

  /** Commentaire d'un élément (attribut `tooltip`) ; vide = retiré. */
  setComment(elementId: string, comment: string): void {
    const editable = this.core.targets.editablePage();
    const element = editable && [...editable.page.shapes, ...editable.page.edges].find((e) => e.id === elementId);
    if (!editable || !element) return;
    const text = comment.trim() ? comment.replace(/\s+$/, '') : undefined;
    if (text === commentOf(element)) return;
    this.core.edits.recordEdit(text ? 'Commentaire' : 'Commentaire retiré');
    setCellWrapperAttribute(editable.pageTree, elementId, COMMENT_ATTRIBUTE, text);
    this.core.file.documentChanged([editable.page.id]);
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
    const merged =
      merge !== undefined &&
      this.core.edits.lastMerge?.key === merge &&
      this.core.edits.lastMerge.edits === this.core.edits.editCount;
    if (!merged) this.core.edits.recordEdit('Attribut spatial');
    this.core.edits.lastMerge = merge === undefined ? undefined : { key: merge, edits: this.core.edits.editCount };
    const inObject = shape.attributes[key] !== undefined && shape.style[key] === undefined;
    const written = inObject && setCellObjectAttribute(editable.pageTree, elementId, key, text);
    if (!written) setCellStyleValue(editable.pageTree, elementId, key, text);
    if (merge !== undefined && LIVE_SHAPE_KEYS.has(key)) {
      // Le modèle suit le fichier, la forme seule est redessinée ; les autres rendus de la page (autres niveaux,
      // graphe) seront reconstruits à la demande.
      const values = written ? shape.attributes : shape.style;
      if (text === undefined) delete values[key];
      else values[key] = text;
      this.core.live.rebuildShapeObject(shape);
      this.core.scenes.invalidate(editable.page.id);
      this.core.graph.invalidate();
      this.core.scenes.invalidate(GRAPH_PAGE_ID, true);
      this.core.live.afterLiveEdit();
      this.core.edits.syncModified();
      if (this.core.file.document) this.core.events.emit('documentChange', this.core.file.document);
      return;
    }
    this.core.file.documentChanged([editable.page.id]);
  }
}
