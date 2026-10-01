import type { Object3D } from 'three';
import type { PageModel } from '../model/types';
import type { PageScene } from './pageScene';

/**
 * Scènes de pages construites (SPEC §7.4) : seule la page courante est visible, les autres
 * restent en cache pour un retour instantané. Le cache est plafonné ; la page la moins
 * récemment affichée est libérée en premier, jamais la page courante.
 */
export class SceneManager {
  /** Ordre d'insertion = ordre d'usage (la plus récente à la fin). */
  private readonly scenes = new Map<string, PageScene>();
  private currentId: string | undefined;

  constructor(
    private readonly container: Object3D,
    private readonly build: (page: PageModel) => PageScene,
    private maxCached = 8,
  ) {}

  /** Affiche une page (construite si besoin) et masque les autres. */
  show(page: PageModel): PageScene {
    const scene = this.ensure(page);
    this.currentId = page.id;
    for (const [id, s] of this.scenes) s.root.visible = id === page.id;
    this.touch(page.id);
    this.evict();
    return scene;
  }

  /** Construit une page sans l'afficher (préchargement, SPEC §11.1). */
  prebuild(page: PageModel): PageScene {
    const scene = this.ensure(page);
    this.evict();
    return scene;
  }

  /** Masque toutes les pages (document vide). */
  hideAll(): void {
    this.currentId = undefined;
    for (const s of this.scenes.values()) s.root.visible = false;
  }

  get current(): PageScene | undefined {
    return this.currentId ? this.scenes.get(this.currentId) : undefined;
  }

  has(pageId: string): boolean {
    return this.scenes.has(pageId);
  }

  /** Identifiants des pages en cache, de la moins à la plus récemment utilisée. */
  cachedIds(): string[] {
    return [...this.scenes.keys()];
  }

  setMaxCached(max: number): void {
    this.maxCached = Math.max(1, Math.floor(max));
    this.evict();
  }

  /** Libère toutes les scènes (nouveau document). */
  clear(): void {
    for (const id of [...this.scenes.keys()]) this.drop(id);
    this.currentId = undefined;
  }

  private ensure(page: PageModel): PageScene {
    let scene = this.scenes.get(page.id);
    if (!scene) {
      scene = this.build(page);
      scene.root.visible = false;
      this.scenes.set(page.id, scene);
      this.container.add(scene.root);
    }
    return scene;
  }

  private touch(pageId: string): void {
    const scene = this.scenes.get(pageId);
    if (!scene) return;
    this.scenes.delete(pageId);
    this.scenes.set(pageId, scene);
  }

  private evict(): void {
    for (const id of this.scenes.keys()) {
      if (this.scenes.size <= this.maxCached) break;
      if (id !== this.currentId) this.drop(id);
    }
  }

  private drop(pageId: string): void {
    const scene = this.scenes.get(pageId);
    if (!scene) return;
    this.container.remove(scene.root);
    scene.dispose();
    this.scenes.delete(pageId);
  }
}
