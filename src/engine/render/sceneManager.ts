import type { Object3D } from 'three';
import type { PageModel } from '../model/types';
import type { PageScene } from './pageScene';
import type { SceneLevel } from './shapes/types';

/**
 * Scènes de pages construites (SPEC §7.4) : seule la page courante est visible, les autres
 * restent en cache pour un retour instantané. Le cache est plafonné ; la scène la moins
 * récemment affichée est libérée en premier, jamais la scène courante.
 *
 * Une page peut avoir une scène par niveau de rendu (à plat, iso…) : `levelOf` donne le niveau
 * effectif d'une page au moment de l'afficher (souvent `flat`, partagé par tous les modes).
 */
export class SceneManager {
  /** Clé `page@niveau` → scène. Ordre d'insertion = ordre d'usage (la plus récente à la fin). */
  private readonly scenes = new Map<string, PageScene>();
  private currentKey: string | undefined;

  constructor(
    private readonly container: Object3D,
    private readonly build: (page: PageModel, level: SceneLevel) => PageScene,
    private maxCached = 8,
    private readonly levelOf: (page: PageModel) => SceneLevel = () => 'flat',
  ) {}

  /** Affiche une page (construite si besoin) et masque les autres. */
  show(page: PageModel): PageScene {
    const key = this.keyOf(page);
    const scene = this.ensure(page, key);
    this.currentKey = key;
    for (const [k, s] of this.scenes) s.root.visible = k === key;
    this.touch(key);
    this.evict();
    return scene;
  }

  /** Construit une page sans l'afficher (préchargement, SPEC §11.1). */
  prebuild(page: PageModel): PageScene {
    const scene = this.ensure(page, this.keyOf(page));
    this.evict();
    return scene;
  }

  /** Masque toutes les pages (document vide). */
  hideAll(): void {
    this.currentKey = undefined;
    for (const s of this.scenes.values()) s.root.visible = false;
  }

  get current(): PageScene | undefined {
    return this.currentKey ? this.scenes.get(this.currentKey) : undefined;
  }

  has(pageId: string): boolean {
    return [...this.scenes.values()].some((s) => s.pageId === pageId);
  }

  /** Identifiants des pages en cache, de la moins à la plus récemment utilisée. */
  cachedIds(): string[] {
    return [...new Set([...this.scenes.values()].map((s) => s.pageId))];
  }

  setMaxCached(max: number): void {
    this.maxCached = Math.max(1, Math.floor(max));
    this.evict();
  }

  /** Libère toutes les scènes (nouveau document). */
  clear(): void {
    for (const key of [...this.scenes.keys()]) this.drop(key);
    this.currentKey = undefined;
  }

  private keyOf(page: PageModel): string {
    return `${page.id}@${this.levelOf(page)}`;
  }

  private ensure(page: PageModel, key: string): PageScene {
    let scene = this.scenes.get(key);
    if (!scene) {
      scene = this.build(page, this.levelOf(page));
      scene.root.visible = false;
      this.scenes.set(key, scene);
      this.container.add(scene.root);
    }
    return scene;
  }

  private touch(key: string): void {
    const scene = this.scenes.get(key);
    if (!scene) return;
    this.scenes.delete(key);
    this.scenes.set(key, scene);
  }

  private evict(): void {
    for (const key of this.scenes.keys()) {
      if (this.scenes.size <= this.maxCached) break;
      if (key !== this.currentKey) this.drop(key);
    }
  }

  private drop(key: string): void {
    const scene = this.scenes.get(key);
    if (!scene) return;
    this.container.remove(scene.root);
    scene.dispose();
    this.scenes.delete(key);
  }
}
