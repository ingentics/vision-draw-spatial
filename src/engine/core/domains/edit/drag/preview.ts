import { Color, Group, Mesh } from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import { anchorPosition, sideOfConstraint, sideSegment } from '../../../edit/edgeEnds';
import type { EndAttachment } from '../../../edit/edgeEnds';
import { distance } from '../../../model/geometry';
import type { PageModel, Point, Rect } from '../../../model/types';
import { perimeterKind } from '../../../render/edges/route';
import { parseStyle } from '../../../format/style';
import { dragPlacesMarks, partSelection } from '../../../render/decorations';
import { connectionHints } from '../../../render/handleMeshes';
import { disposeObject, fadedStrokeMesh } from '../../../render/meshes';
import { dashPolyline } from '../../../render/geometry/stroke';
import { shownLimit } from '../../../edit/obstacles';
import type { Segment } from '../../../edit/obstacles';
import type { AnchorSkip, TakenAnchor } from '../edges/anchors';
import type { EngineCore } from '../../EngineCore';
import { shapeOf } from '../../../model/pageIndex';

/** Aperçu d'un connecteur ou d'un bout de flèche en cours : tracé, repères d'accroche sur la forme visée. */
export class ConnectorPreview {
  private connectorPreview: Object3D | undefined;
  /** Limites montrées pendant un geste borné (sujet 241). */
  private readonly limits: OverlayLayer;
  /** Places montrées pendant le glisser d'une forme (sujet 481). */
  private readonly places: OverlayLayer;

  constructor(private readonly core: EngineCore) {
    this.limits = new OverlayLayer(core);
    this.places = new OverlayLayer(core);
  }

  /** Repères d'accroche (contour, points de connexion) sur la forme visée par un bout de flèche. */
  showConnectionHints(
    page: PageModel,
    attachment: EndAttachment | undefined,
    extra?: Object3D,
    skip?: AnchorSkip,
    taken: TakenAnchor[] = [],
    part?: string,
  ): void {
    this.clearConnectorPreview();
    const root = this.core.scenes.current?.root;
    if (!root) return;
    const group = new Group();
    group.name = 'connector-preview';
    if (extra) group.add(extra);
    const shape = attachment && attachment.kind !== 'free' ? shapeOf(page, attachment.shapeId) : undefined;
    if (shape && attachment?.kind === 'fixed' && this.core.arrangement.distributes(page)) {
      // Ancrage automatique : le côté visé est surligné.
      const side = sideOfConstraint(attachment.constraint);
      const b = shape.bounds;
      const hints = connectionHints(
        { bounds: b, perimeter: 'rectangle', style: shape.style },
        [],
        this.core.camera.state.zoom,
        { outline: false, side: side && sideSegment(b, side), accent: this.core.settings.selection.accentColor },
      );
      hints.position.z = this.core.sceneView.elementTop(shape.id) + 0.3;
      group.add(hints);
    } else if (shape && attachment?.kind !== 'free') {
      const anchors = this.core.anchors.anchorsOf(page, shape, skip, taken);
      const active =
        attachment?.kind === 'fixed'
          ? anchors.findIndex(
              (a) => a.constraint.x === attachment.constraint.x && a.constraint.y === attachment.constraint.y,
            )
          : undefined;
      const hints = connectionHints(
        {
          bounds: shape.bounds,
          perimeter: perimeterKind(shape.style, parseStyle(shape.raw?.styleString).names),
          style: shape.style,
        },
        anchors.map((a) => ({ point: anchorPosition(shape, a.constraint), used: a.used })),
        this.core.camera.state.zoom,
        { active, outline: attachment?.kind === 'floating', accent: this.core.settings.selection.accentColor },
      );
      hints.position.z = this.core.sceneView.elementTop(shape.id) + 0.3;
      group.add(hints);
    }
    // Partie visée (sujet 333) : du même cadre que la sélection d'une partie.
    const rect = shape && part !== undefined ? this.core.shapeParts.bounds(page, shape, part) : undefined;
    if (shape && rect) {
      const mark = partSelection(rect, this.core.camera.state.zoom, this.core.settings.selection.accentColor);
      mark.position.z = this.core.sceneView.elementTop(shape.id) + 0.25;
      group.add(mark);
    }
    group.traverse((o) => {
      o.renderOrder = Number.MAX_SAFE_INTEGER;
      if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
    });
    this.connectorPreview = group;
    root.add(group);
    this.core.rendering.requestRender();
  }

  clearConnectorPreview(): void {
    if (!this.connectorPreview) return;
    this.connectorPreview.removeFromParent();
    disposeObject(this.connectorPreview);
    this.connectorPreview = undefined;
  }

  /**
   * Limites atteintes par un déplacement ou un redimensionnement borné (sujet 241) : lignes rouges en pointillé,
   * d'épaisseur et de tirets constants à l'écran, au-dessus du schéma. Écartées des rectangles arrêtés `stopped` (hors
   * de leur cadre de sélection), prolongées et fondues à leurs bouts (sujet 316). Aucune limite : rien n'est montré.
   */
  showLimits(segments: Segment[], stopped: Rect[]): void {
    const zoom = this.core.camera.state.zoom;
    this.limits.show(JSON.stringify([segments, stopped, zoom]), () => {
      if (segments.length === 0) return undefined;
      const group = new Group();
      group.name = 'drag-limits';
      for (const segment of segments) {
        const shown = shownLimit(segment, stopped, LIMIT_OFFSET / zoom, LIMIT_EXTENSION);
        // Opacité pleine au milieu, nulle aux bouts, sur les `LIMIT_FADE` derniers pixels.
        const alphaAt = (p: Point) => Math.min(1, Math.min(distance(p, shown[0]), distance(p, shown[1])) / LIMIT_FADE);
        const dashes = dashPolyline(shown, [6 / zoom, 4 / zoom], false);
        const mesh = fadedStrokeMesh(dashes, alphaAt, new Color(LIMIT_COLOR), 1, 1.5 / zoom);
        if (!mesh) continue;
        mesh.renderOrder = Number.MAX_SAFE_INTEGER;
        group.add(mesh);
      }
      return group;
    });
  }

  /**
   * Places proposées par le mode au glisser d'une forme (sujet 481), au-dessus du schéma ; `hit` : la place visée ;
   * `swap` : l'échange en vue. Aucune place ni échange : rien n'est montré.
   */
  showPlaces(places: Rect[], hit: Rect | undefined, swap?: { target: Rect; to: Rect }): void {
    const zoom = this.core.camera.state.zoom;
    this.places.show(JSON.stringify([places, hit, swap, zoom]), () =>
      places.length === 0 && !swap
        ? undefined
        : dragPlacesMarks(places, hit, swap, zoom, this.core.settings.selection.accentColor),
    );
  }

  clearPlaces(): void {
    this.places.clear();
  }

  clearLimits(): void {
    this.limits.clear();
  }
}

/**
 * Calque d'aperçu d'un geste, au-dessus du schéma (sans test de profondeur) : reconstruit seulement quand sa clé change,
 * retiré et libéré à la fin du geste.
 */
class OverlayLayer {
  private object: Object3D | undefined;
  private key: string | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Montre ce que `build` construit pour `key` (undefined : rien), à la place du calque précédent. */
  show(key: string, build: () => Object3D | undefined): void {
    if (key === this.key) return;
    this.clear();
    this.key = key;
    const root = this.core.scenes.current?.root;
    const object = root && build();
    if (!root || !object) return;
    object.traverse((o) => {
      if (o instanceof Mesh) (o.material as MeshBasicMaterial).depthTest = false;
    });
    object.position.z = 0.5;
    this.object = object;
    root.add(object);
    this.core.rendering.requestRender();
  }

  clear(): void {
    this.key = undefined;
    if (!this.object) return;
    this.object.removeFromParent();
    disposeObject(this.object);
    this.object = undefined;
    this.core.rendering.requestRender();
  }
}

/** Couleur des limites d'un geste borné (sujet 241). */
const LIMIT_COLOR = '#e53935';
/** Écart d'une limite au bord arrêté, en pixels écran : au-delà du cadre de sélection (3 px) (sujet 316). */
const LIMIT_OFFSET = 6;
/** Prolongement d'une limite à chaque bout, et longueur de son fondu, en pixels de page (sujet 316). */
const LIMIT_EXTENSION = 40;
const LIMIT_FADE = 10;
