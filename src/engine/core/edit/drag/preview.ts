import { Group, Mesh } from 'three';
import type { MeshBasicMaterial, Object3D } from 'three';
import { sideOfConstraint } from '../../../edit/edgeEnds';
import type { EndAttachment } from '../../../edit/edgeEnds';
import type { PageModel, Point } from '../../../model/types';
import { perimeterKind } from '../../../render/edges/route';
import { parseStyle } from '../../../format/style';
import { connectionHints } from '../../../render/handles';
import { disposeObject } from '../../../render/meshes';
import type { AnchorSkip, TakenAnchor } from '../edges/anchors';
import type { EngineCore } from '../../EngineCore';

/** Aperçu d'un connecteur ou d'un bout de flèche en cours : tracé, repères d'accroche sur la forme visée. */
export class ConnectorPreview {
  private connectorPreview: Object3D | undefined;

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
}
