import { fitBounds } from '../../interaction/camera';
import type { CameraState } from '../../interaction/camera';
import { NavigationHistory, findParents } from '../../interaction/history';
import type { HistoryEntry } from '../../interaction/history';
import type { Rect } from '../../model/types';
import type { BackTarget } from '../types';
import type { EngineCore } from '../EngineCore';

/** « Retour » (SPEC §11.3) : pile de navigation, sinon pages parentes de la page courante. */
export class BackHistory {
  readonly stack = new NavigationHistory();

  constructor(private readonly core: EngineCore) {}

  getHistory(): HistoryEntry[] {
    return this.stack.entries();
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
    if (this.core.transitions.active) return;
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
    if (!page || !this.core.file.document || this.core.transitions.active) return;
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
    const destination = camera ?? fitBounds(outer.bounds, this.core.display.viewport, this.core.camera.orientation());
    this.core.transitions.runTransition({ direction: 'out', outer, inner, frame, destination });
  }
}
