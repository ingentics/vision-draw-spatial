import { reverseEdgeCell, setCellStyleValue } from '../../../format/edit';
import { writeDrawio } from '../../../format/write';
import { applyStylePreset } from '../../../edit/styles';
import type { StylePreset } from '../../../edit/styles';
import type { EngineCore } from '../../EngineCore';
import { SPATIAL } from '../../../spatial';

/**
 * Clés de style d'une flèche qui ne changent que le dessin de son texte : réglables en direct sans reconstruire la
 * page.
 */
const LIVE_EDGE_TEXT_KEYS: ReadonlySet<string> = new Set([SPATIAL.labelFollowShift]);

/**
 * Style des formes et des flèches : styles de la palette, clés de style draw.io (réglages en direct compris), sens des
 * flèches.
 */
export class StyleCommands {
  constructor(private readonly core: EngineCore) {}

  applyStylePreset(elementIds: string[], preset: StylePreset, known: StylePreset[] = []): void {
    const editable = this.core.targets.editablePage();
    if (!editable || !this.core.file.xmlTree) return;
    const shapes = editable.page.shapes.filter((s) => elementIds.includes(s.id));
    const before = writeDrawio(this.core.file.xmlTree);
    let changed = false;
    for (const shape of shapes) {
      changed = applyStylePreset(editable.pageTree, shape.id, shape.style, preset, known) || changed;
    }
    if (!changed) return;
    this.core.edits.recordSnapshot(shapes.length > 1 ? 'Style des formes' : 'Style', before);
    this.core.file.documentChanged([editable.page.id]);
  }

  setElementsStyle(
    elementIds: string[],
    patch: Record<string, string | undefined> | ((style: Record<string, string>) => Record<string, string | undefined>),
    label = 'Style',
    merge?: string,
  ): void {
    const editable = this.core.targets.editablePage();
    if (!editable) return;
    // Formes ou flèches (ex. tracé d'une flèche : `rounded`, `curved`).
    const shapes = [...editable.page.shapes, ...editable.page.edges].filter((s) => elementIds.includes(s.id));
    // Patch calculé élément par élément (ex. routeur orthogonal remis aux seules flèches droites).
    const changes = shapes.flatMap((shape) =>
      Object.entries(typeof patch === 'function' ? patch(shape.style) : patch)
        .filter(([key, value]) => shape.style[key] !== value)
        .map(([key, value]) => ({ id: shape.id, key, value })),
    );
    if (changes.length === 0) return;
    this.core.edits.recordMergeableEdit(label, merge);
    for (const { id, key, value } of changes) setCellStyleValue(editable.pageTree, id, key, value);
    // Réglage en direct d'une clé qui ne touche que le texte d'une flèche : seule la flèche est redessinée (comme
    // pendant un glisser), sans reconstruire la page (tous ses textes clignoteraient à chaque frappe).
    const edges = new Map(editable.page.edges.map((edge) => [edge.id, edge]));
    if (merge !== undefined && changes.every(({ id, key }) => edges.has(id) && LIVE_EDGE_TEXT_KEYS.has(key))) {
      for (const { id, key, value } of changes) {
        const style = edges.get(id)!.style;
        if (value === undefined) delete style[key];
        else style[key] = value;
      }
      this.core.live.retraceEdges(editable.page, new Set(changes.map(({ id }) => id)));
      this.core.live.afterLiveEdit();
      this.core.labelEditor.relocateLabelEdit();
      this.core.edits.syncModified();
      if (this.core.file.document) this.core.events.emit('documentChange', this.core.file.document);
      return;
    }
    this.core.file.documentChanged([editable.page.id]);
  }

  reverseEdges(edgeIds: string[]): void {
    const editable = this.core.targets.editablePage();
    const ids = editable?.page.edges.filter((edge) => edgeIds.includes(edge.id)).map((edge) => edge.id) ?? [];
    if (!editable || ids.length === 0) return;
    this.core.edits.recordEdit('Inverser');
    for (const id of ids) reverseEdgeCell(editable.pageTree, id);
    this.core.file.documentChanged([editable.page.id], { distribute: false });
  }
}
