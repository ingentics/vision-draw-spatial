import type { EngineCore } from '../EngineCore';

/** Fenêtre des mesures de frames : les dernières secondes. */
const FRAME_WINDOW_MS = 2000;

/** Image rendue : son instant de fin et sa durée, en millisecondes. */
export interface FrameSample {
  at: number;
  ms: number;
}

/** Images rendues sur la fenêtre : par seconde, durée moyenne et pire (rendu à la demande : 0 au repos). */
export interface FrameStats {
  fps: number;
  averageMs: number;
  worstMs: number;
}

/** Métriques de l'instance courante du moteur, pour le panneau Diagnostics (sujet 298). */
export interface EngineMetrics {
  /** Images rendues ; `undefined` tant que la mesure des frames n'est pas active. */
  frames: FrameStats | undefined;
  /** Lecture du fichier (décodage + parsing), en ms. */
  readMs: number | undefined;
  /** Dernière construction de la scène de la page courante, en ms. */
  sceneBuildMs: number | undefined;
  /** Formes et flèches de toutes les pages du document. */
  cells: number;
  /** Objets Three.js de la scène de la page courante. */
  sceneObjects: number;
  /** Draw calls de la dernière image. */
  drawCalls: number;
  /** Géométries et textures en mémoire GPU. */
  geometries: number;
  textures: number;
}

/** Statistiques des images finies dans les `windowMs` avant `now`. */
export function frameStats(samples: readonly FrameSample[], now: number, windowMs: number): FrameStats {
  const recent = samples.filter((sample) => sample.at > now - windowMs);
  if (recent.length === 0) return { fps: 0, averageMs: 0, worstMs: 0 };
  const total = recent.reduce((sum, sample) => sum + sample.ms, 0);
  return {
    fps: (recent.length * 1000) / windowMs,
    averageMs: total / recent.length,
    worstMs: Math.max(...recent.map((sample) => sample.ms)),
  };
}

/**
 * Mesures du moteur : durées de lecture et de construction des scènes (toujours, deux `performance.now()`), images
 * rendues seulement quand la mesure des frames est active (panneau Diagnostics ouvert).
 */
export class Metrics {
  /** Mesure des images rendues active. */
  sampling = false;
  private frames: FrameSample[] = [];
  private readMs: number | undefined;
  /** Dernière durée de construction de la scène de chaque page. */
  private readonly sceneBuildMs = new Map<string, number>();

  constructor(private readonly core: EngineCore) {}

  /** Nouveau document : les durées de construction des scènes de l'ancien ne valent plus. */
  resetDocument(): void {
    this.sceneBuildMs.clear();
  }

  setSampling(on: boolean): void {
    this.sampling = on;
    this.frames = [];
  }

  /** Image rendue entre `start` et `end` (à n'appeler que si `sampling`). */
  frameRendered(start: number, end: number): void {
    this.frames.push({ at: end, ms: end - start });
    while (this.frames[0]!.at <= end - FRAME_WINDOW_MS) this.frames.shift();
  }

  fileRead(ms: number): void {
    this.readMs = ms;
  }

  sceneBuilt(pageId: string, ms: number): void {
    this.sceneBuildMs.set(pageId, ms);
  }

  snapshot(): EngineMetrics {
    const core = this.core;
    const info = core.rendering.renderer.info;
    let sceneObjects = 0;
    core.scenes.current?.root.traverse(() => sceneObjects++);
    const pageId = core.pages.currentPageId;
    return {
      frames: this.sampling ? frameStats(this.frames, performance.now(), FRAME_WINDOW_MS) : undefined,
      readMs: this.readMs,
      sceneBuildMs: pageId !== undefined ? this.sceneBuildMs.get(pageId) : undefined,
      cells: (core.file.document?.pages ?? []).reduce((sum, page) => sum + page.shapes.length + page.edges.length, 0),
      sceneObjects,
      drawCalls: info.render.calls,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    };
  }
}
