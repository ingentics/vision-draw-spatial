import { fitBounds } from '../../interaction/cameraMath';
import type { CameraState } from '../../interaction/cameraMath';
import { NavigationHistory, findParents } from '../../interaction/navigationHistory';
import type { HistoryEntry } from '../../interaction/navigationHistory';
import type { Rect } from '../../model/types';
import type { BackTarget, InitialView } from '../types';
import type { EngineCore } from '../EngineCore';

/** « Retour » (SPEC §11.3) : pile de navigation, sinon pages parentes de la page courante. */
export class BackHistory {
  private readonly stack = new NavigationHistory();

  constructor(private readonly core: EngineCore) {}

  getHistory(): HistoryEntry[] {
    return this.stack.entries();
  }

  /** Lien suivi : de quoi y revenir par « Retour ». */
  push(entry: HistoryEntry): void {
    this.stack.push(entry);
    this.core.events.emit('historyChange', this.stack.entries());
  }

  /** Page supprimée : les entrées qui y mènent ou en partent disparaissent. */
  forgetPage(pageId: string): void {
    const entries = this.stack.entries();
    const kept = entries.filter((e) => e.pageId !== pageId && e.targetPageId !== pageId);
    if (kept.length === entries.length) return;
    this.stack.replace(kept);
    this.core.events.emit('historyChange', kept);
  }

  /** Nouveau document : la pile reprend celle de la session (sans l'annoncer, l'UI la lit au chargement). */
  resetDocument(initialView: InitialView | undefined): void {
    this.stack.replace(initialView?.history ?? []);
  }

  getBackTarget(): BackTarget {
    const page = this.core.pages.getCurrentPage();
    if (!page || !this.core.file.document) return { kind: 'none' };
    const entry = this.stack.peek();
    if (entry && entry.targetPageId === page.id) {
      const pageName = this.core.pages.pageById(entry.pageId)?.name ?? entry.pageId;
      return { kind: 'history', entry, pageName };
    }
    const parents = findParents(this.core.file.document, page.id, this.core.links.linkUsage);
    if (parents.length === 1) return { kind: 'parent', parent: parents[0]! };
    if (parents.length > 1) return { kind: 'choose', parents };
    return { kind: 'none' };
  }

  back(): void {
    if (!this.core.canInteract()) return;
    const target = this.getBackTarget();
    if (target.kind === 'history') {
      this.stack.pop();
      this.core.events.emit('historyChange', this.stack.entries());
      this.returnTo(target.entry.pageId, target.entry.frame, target.entry.camera);
    } else if (target.kind === 'parent') {
      this.backTo(target.parent.pageId);
    } else if (target.kind === 'choose') {
      this.core.events.emit('backChoice', target.parents);
    }
  }

  backTo(parentPageId: string): void {
    const page = this.core.pages.getCurrentPage();
    if (!page || !this.core.file.document || !this.core.canInteract()) return;
    const parent = findParents(this.core.file.document, page.id, this.core.links.linkUsage).find(
      (p) => p.pageId === parentPageId,
    );
    if (!parent) return;
    // La pile ne mène plus à la page courante : on repart d'une pile vide.
    this.stack.clear();
    this.core.events.emit('historyChange', []);
    this.returnTo(parent.pageId, parent.frame, this.core.pages.pageCameras.get(parent.pageId));
  }

  private returnTo(pageId: string, frame: Rect | undefined, camera: CameraState | undefined): void {
    const inner = this.core.pages.getCurrentPage();
    const outer = this.core.pages.pageById(pageId);
    if (!inner || !outer) return;
    const destination =
      camera ??
      fitBounds(outer.bounds, this.core.display.viewport, {
        ...this.core.camera.orientation(),
        limits: this.core.camera.limits,
      });
    this.core.transitions.runTransition({ direction: 'out', outer, inner, frame, destination });
  }
}
