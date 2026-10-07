import { Color, Group, Mesh } from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import { sideOfConstraint } from '../../../edit/edgeEnds';
import type { EndAttachment } from '../../../edit/edgeEnds';
import type { PageModel, Point } from '../../../model/types';
import { perimeterKind } from '../../../render/edges/route';
import { parseStyle } from '../../../format/style';
import { connectionHints } from '../../../render/handles';
import { disposeObject, strokeMesh } from '../../../render/meshes';
import type { Segment } from '../../../edit/obstacles';
import type { AnchorSkip, TakenAnchor } from '../edges/anchors';
import type { EngineCore } from '../../EngineCore';

/** Aperçu d'un connecteur ou d'un bout de flèche en cours : tracé, repères d'accroche sur la forme visée. */
export class ConnectorPreview {
  private connectorPreview: Object3D | undefined;
  /** Limites montrées pendant un geste borné (sujet 241), et leur clé (pas de reconstruction si rien ne change). */
  private limits: Object3D | undefined;
  private limitsKey: string | undefined;

  constructor(private readonly core: EngineCore) {}

  /** Repères d'accroche (contour, points de connexion) sur la forme visée par un bout de flèche. */
  showConnectionHints(
    page: PageModel,
    attachment: EndAttachment | undefined,
    extra?: Object3D,
    skip?: AnchorSkip,
    taken: TakenAnchor[] = [],
  ): void {
    this.clearConnectorPreview();
    const root = this.core.scenes.current?.root;
    if (!root) return;
    const group = new Group();
    group.name = 'connector-preview';
    if (extra) group.add(extra);
    const shape =
      attachment && attachment.kind !== 'free' ? page.shapes.find((s) => s.id === attachment.shapeId) : undefined;
    if (shape && attachment?.kind === 'fixed' && this.core.arrangement.distributes(page)) {
      // Ancrage automatique : le côté visé est surligné.
      const side = sideOfConstraint(attachment.constraint);
      const b = shape.bounds;
      const corners: Record<string, [Point, Point]> = {
        n: [
          { x: b.x, y: b.y },
          { x: b.x + b.width, y: b.y },
        ],
        e: [
          { x: b.x + b.width, y: b.y },
          { x: b.x + b.width, y: b.y + b.height },
        ],
        s: [
          { x: b.x, y: b.y + b.height },
          { x: b.x + b.width, y: b.y + b.height },
        ],
        w: [
          { x: b.x, y: b.y },
          { x: b.x, y: b.y + b.height },
        ],
      };
      const hints = connectionHints(
        { bounds: b, perimeter: 'rectangle', style: shape.style },
        [],
        this.core.camera.state.zoom,
        { outline: false, side: side && corners[side], accent: this.core.settings.selection.accentColor },
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
        anchors.map((a) => ({ point: this.core.anchors.anchorPosition(shape, a.constraint), used: a.used })),
        this.core.camera.state.zoom,
        { active, outline: attachment?.kind === 'floating', accent: this.core.settings.selection.accentColor },
      );
      hints.position.z = this.core.sceneView.elementTop(shape.id) + 0.3;
      group.add(hints);
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
   * d'épaisseur et de tirets constants à l'écran, au-dessus du schéma. Aucune limite : rien n'est montré.
   */
  showLimits(segments: Segment[]): void {
    const key = JSON.stringify(segments);
    if (key === this.limitsKey) return;
    this.clearLimits();
    this.limitsKey = key;
    const root = this.core.scenes.current?.root;
    if (!root || segments.length === 0) return;
    const zoom = this.core.camera.state.zoom;
    const group = new Group();
    group.name = 'drag-limits';
    for (const segment of segments) {
      const mesh = strokeMesh(segment, new Color(LIMIT_COLOR), 1, {
        width: 1.5 / zoom,
        closed: false,
        dash: [6 / zoom, 4 / zoom],
      });
      if (!mesh) continue;
      (mesh.material as MeshBasicMaterial).depthTest = false;
      mesh.renderOrder = Number.MAX_SAFE_INTEGER;
      group.add(mesh);
    }
    group.position.z = 0.5;
    this.limits = group;
    root.add(group);
    this.core.rendering.requestRender();
  }

  clearLimits(): void {
    this.limitsKey = undefined;
    if (!this.limits) return;
    this.limits.removeFromParent();
    disposeObject(this.limits);
    this.limits = undefined;
    this.core.rendering.requestRender();
  }
}

/** Couleur des limites d'un geste borné (sujet 241). */
const LIMIT_COLOR = '#e53935';
