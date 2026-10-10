import { Box3, Color, OrthographicCamera, Scene, WebGLRenderer } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { inflate } from '../../model/geometry';
import type { PageModel, Rect } from '../../model/types';
import { orientBillboards } from '../../render/billboard';
import { pageRectOfBox } from '../../render/space';
import { imageSize, imageTiles } from '../../render/png/imageTiles';
import { BASE_DPI, withPngDensity } from '../../render/png/pngDensity';
import type { EngineCore } from '../EngineCore';

/** Réglages d'un export d'image (sujet 431). */
export interface ImageExportOptions {
  /** Pixels par unité du schéma (×1 HD, ×1,5 2K, ×2 4K) ; le PNG porte la résolution 96 dpi × densité. */
  density: number;
  /** Marge autour du contenu, en unités du schéma. */
  margin: number;
  /** Fond transparent ; sinon la couleur de fond de la vue. */
  transparent: boolean;
  /** Seulement la sélection avec son contenu (comme sa mise en valeur), sinon toute la page. */
  selectionOnly: boolean;
}

/** Côté maximal d'un morceau rendu : bien en deçà des limites WebGL courantes (8192 à 16384). */
const MAX_TILE = 4096;
/** Hauteur de la caméra au-dessus du sol : la scène est à plat (élévations nulles). */
const CAMERA_HEIGHT = 1000;

/**
 * Export PNG de la page courante (sujet 431) : une scène à plat construite exprès, rendue hors écran en vue de dessus,
 * par morceaux, sans toucher à la vue affichée.
 */
export class ImageExport {
  constructor(private readonly core: EngineCore) {}

  /** Image PNG ; `undefined` s'il n'y a rien à exporter (page vide, sélection vide). */
  async exportPng(options: ImageExportOptions): Promise<Blob | undefined> {
    const page = this.core.pages.getCurrentPage();
    if (!page) return undefined;
    const kept = options.selectionOnly ? this.selectedIds(page) : undefined;
    if (kept?.size === 0) return undefined;
    const built = this.core.sceneView.buildScene(page, 'flat');
    try {
      for (const child of built.root.children) child.visible = !kept || kept.has(child.userData.elementId as string);
      const scene = new Scene();
      scene.add(built.root);
      await this.core.text.settled();
      scene.updateMatrixWorld(true);
      const bounds = visibleBounds(built.root);
      if (!bounds) return undefined;
      const canvas = this.draw(scene, inflate(bounds, options.margin), options);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return undefined;
      const png = withPngDensity(new Uint8Array(await blob.arrayBuffer()), BASE_DPI * options.density);
      return new Blob([png], { type: 'image/png' });
    } finally {
      built.dispose();
    }
  }

  /** Éléments sélectionnés de la page avec leur contenu, comme la mise en valeur de la sélection. */
  private selectedIds(page: PageModel): Set<string> {
    const selection = this.core.selection.current;
    return selection?.pageId === page.id ? this.core.selection.withContent(page, selection.items) : new Set();
  }

  /** Rendu de `frame` (unités du schéma) dans un canvas 2D, morceau par morceau, par un renderer jetable. */
  private draw(scene: Scene, frame: Rect, options: ImageExportOptions): HTMLCanvasElement {
    const { width, height } = imageSize(frame, options.density);
    const doc = this.core.canvas.ownerDocument;
    const output = doc.createElement('canvas');
    output.width = width;
    output.height = height;
    const context = output.getContext('2d');
    if (!context) throw new Error('Canvas 2D indisponible');
    scene.background = options.transparent ? null : new Color(this.core.settings.background.color);
    const camera = topCamera(frame.x, frame.y, width / options.density, height / options.density);
    orientBillboards(scene, camera);
    const renderer = new WebGLRenderer({
      canvas: doc.createElement('canvas'),
      antialias: true,
      stencil: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    try {
      renderer.setClearColor(0x000000, 0);
      const tile = Math.min(MAX_TILE, renderer.capabilities.maxTextureSize);
      for (const part of imageTiles(width, height, tile)) {
        camera.setViewOffset(width, height, part.x, part.y, part.width, part.height);
        renderer.setSize(part.width, part.height, false);
        renderer.render(scene, camera);
        context.drawImage(renderer.domElement, part.x, part.y);
      }
    } finally {
      renderer.dispose();
      // Un contexte WebGL par export : rendu tout de suite, le navigateur en limite le nombre.
      renderer.forceContextLoss();
    }
    return output;
  }
}

/** Caméra orthographique d'aplomb sur le rectangle (coin `x`, `y`) : x vers la droite, y vers le bas, comme à l'écran. */
function topCamera(x: number, y: number, width: number, height: number): OrthographicCamera {
  const camera = new OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 1, 2 * CAMERA_HEIGHT);
  // Monde : X = x, Z = y ; regarder vers le bas avec le haut de l'image vers −Z.
  camera.position.set(x + width / 2, CAMERA_HEIGHT, y + height / 2);
  camera.up.set(0, 0, -1);
  camera.lookAt(x + width / 2, 0, y + height / 2);
  return camera;
}

/** Emprise dessinée des objets visibles, en coordonnées page ; `undefined` si rien n'est dessiné. */
function visibleBounds(root: Object3D): Rect | undefined {
  const box = new Box3();
  const part = new Box3();
  root.traverseVisible((object) => {
    const geometry = (object as { geometry?: BufferGeometry }).geometry;
    if (!geometry) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) return;
    box.union(part.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld));
  });
  if (box.isEmpty()) return undefined;
  return pageRectOfBox(box);
}
