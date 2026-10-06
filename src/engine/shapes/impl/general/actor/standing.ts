import { Group, Vector3 } from 'three';
import type { Point, Rect, ShapeModel } from '../../../../model/types';
import { createLabel } from '../../../../render/flat/box';
import { dashPattern } from '../../../../render/geometry/stroke';
import { ellipsePath, rectPath } from '../../../../render/geometry/paths';
import { blockHeight } from '../../../../render/iso/block';
import { edgeLines } from '../../../../render/lines';
import { fillMesh, solidMaterial, strokeMesh } from '../../../../render/meshes';
import { styleColor, styleNumber, styleOpacity } from '../../../../render/styleValues';
import { PART_ORDER } from '../../../../render/types';
import type { RenderContext } from '../../../../render/types';
import { SPATIAL, spatialValue } from '../../../../spatial';
import type { SceneRenderer } from '../../../types';
import { actorFigure } from './figure';

/** Tête : assez de côtés pour rester ronde au zoom. */
const HEAD_SEGMENTS = 48;
/** Traits juste devant la tête (vers la caméra) : pas de z-fighting avec son fond. */
const FRONT = 0.05;

/** Pancarte : largeur (fraction de celle du bonhomme), hauteur (fraction de la sienne), et dépassement de son bord
 * haut au-dessus des mains (fraction de sa hauteur). */
const SIGN_WIDTH = 1.4;
const SIGN_HEIGHT = 0.35;
const SIGN_ABOVE_HANDS = 0.15;
/** Pancarte devant le corps (vers la caméra) : assez pour que les traits du corps passent derrière elle. */
const SIGN_FRONT = 1;
/** Bordure puis texte de la pancarte, devant son fond. */
const SIGN_LAYER = 0.05;

/** Hauteur debout en iso / 3D : celle de la forme, `spatial.height` prioritaire. */
export function actorHeight(shape: ShapeModel, ctx: RenderContext): number {
  return blockHeight(shape, ctx, shape.bounds.height);
}

/**
 * Actor en iso / 3D : pas d'extrusion, le bonhomme 2D se tient **debout**, comme une unité de jeu. Sa silhouette
 * est dans un plan vertical, pieds au centre de l'emprise, de la hauteur de la forme (`spatial.height` prioritaire)
 * et aux proportions de la 2D ; le moteur la tourne face à la caméra à chaque image (`userData.billboard`,
 * `render/billboard.ts`). Il tient son texte sur une pancarte, entre ses mains (`createSign`) ; sans pancarte
 * (`spatial.sign=0`), le label hors de la forme est posé au sol devant lui (`createShapeObject`).
 *
 * Repère de la silhouette : x horizontal (vers la droite vu de la caméra), z vers le haut, face vers −y.
 */
export const standingActor: SceneRenderer = {
  create(shape, ctx) {
    const { bounds, style } = shape;
    const height = actorHeight(shape, ctx);
    const width = bounds.height > 0 ? (bounds.width * height) / bounds.height : bounds.width;
    const group = new Group();
    group.name = `shape:${shape.id}`;
    group.userData.height = height;
    // Se clique sur toute sa hauteur, pas seulement au dessus (`interaction/pick.ts`).
    group.userData.standing = true;

    const silhouette = new Group();
    silhouette.name = 'silhouette';
    silhouette.userData.billboard = true;
    silhouette.position.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, 0);
    group.add(silhouette);

    // Du cadre 2D du bonhomme (y vers le bas) au plan de la silhouette (z vers le haut).
    const figure = actorFigure(width, height);
    const upright = (p: Point): Point => ({ x: p.x - width / 2, y: height - p.y });
    const sign = signFrame(shape, width, height);
    if (sign) {
      // Bras tendus jusqu'aux bords de la pancarte : les mains la tiennent.
      const hands = height - sign.y - sign.height + sign.height * SIGN_ABOVE_HANDS;
      figure.strokes[1] = [
        { x: width / 2 - sign.width / 2, y: hands },
        { x: width / 2 + sign.width / 2, y: hands },
      ];
    }
    const head = ellipsePath(figure.head, HEAD_SEGMENTS).map(upright);
    // Cadre de la tête et traits dans le plan de la silhouette (x, z) : la sélection entoure la tête
    // (`core/selection/highlight.ts`) et le clic ne prend que la silhouette (`core/selection/picking.ts`).
    silhouette.userData.head = {
      x: figure.head.x - width / 2,
      y: height - figure.head.y - figure.head.height,
      width: figure.head.width,
      height: figure.head.height,
    };
    silhouette.userData.strokes = figure.strokes.map((line) => line.map(upright));
    if (sign) silhouette.userData.sign = sign;

    const fill = styleColor(style, 'fillColor', '#ffffff');
    if (fill) {
      // Plan (x, y) couché sur (x, z) : rotation d'un quart de tour autour de x.
      const plane = new Group();
      plane.rotation.x = Math.PI / 2;
      const disc = fillMesh(head, fill, 1);
      disc.material = solidMaterial(fill);
      disc.name = 'head';
      plane.add(disc);
      silhouette.add(plane);
    }

    const stroke = styleColor(style, 'strokeColor', '#000000');
    const strokeWidth = styleNumber(style, 'strokeWidth', 1);
    if (stroke && strokeWidth > 0) {
      const segments: number[] = [];
      const polyline = (points: Point[], closed: boolean) => {
        const last = closed ? points.length : points.length - 1;
        for (let i = 0; i < last; i++) {
          const a = points[i]!;
          const b = points[(i + 1) % points.length]!;
          segments.push(a.x, -FRONT, a.y, b.x, -FRONT, b.y);
        }
      };
      polyline(head, true);
      for (const line of figure.strokes) polyline(line.map(upright), false);
      const lines = edgeLines(segments, {
        color: stroke,
        opacity: styleOpacity(style, 'strokeOpacity'),
        width: strokeWidth,
        dash: dashPattern(style, strokeWidth),
      });
      lines.name = 'stroke';
      lines.renderOrder = PART_ORDER.stroke;
      silhouette.add(lines);
    }

    if (sign) silhouette.add(createSign(shape, ctx, sign));
    else {
      const label = createLabel(shape, ctx);
      if (label) group.add(label);
    }
    return group;
  },
};

/**
 * Cadre de la pancarte dans le plan de la silhouette (x horizontal, y vers le haut), centrée, son bord haut un peu
 * au-dessus des mains (épaules du bonhomme) ; `undefined` sans pancarte (`spatial.sign=0`, ou pas de texte).
 */
function signFrame(shape: ShapeModel, width: number, height: number): Rect | undefined {
  if (spatialValue(shape, SPATIAL.sign) === '0' || !shape.label.trim() || shape.style.noLabel === '1') return undefined;
  const signWidth = width * SIGN_WIDTH;
  const signHeight = height * SIGN_HEIGHT;
  const hands = height - height / 3;
  const top = hands + signHeight * SIGN_ABOVE_HANDS;
  return { x: -signWidth / 2, y: top - signHeight, width: signWidth, height: signHeight };
}

/**
 * Pancarte tenue devant le corps : fond et bordure de la forme, texte de la forme ajusté au panneau (taille réduite
 * s'il ne tient pas, retour à la ligne entre les mots). Repère du panneau : x retourné de la silhouette, y vers le bas (comme
 * l'espace page, celui des textes), face vers la caméra.
 */
function createSign(shape: ShapeModel, ctx: RenderContext, frame: Rect): Group {
  const { style } = shape;
  const sign = new Group();
  sign.name = 'sign';
  // L'espace page est un repère indirect (y vers le bas) : x de la silhouette retourné, sinon le texte est en miroir.
  sign.matrix.makeBasis(new Vector3(-1, 0, 0), new Vector3(0, 0, -1), new Vector3(0, -1, 0));
  sign.matrix.setPosition(0, -SIGN_FRONT, 0);
  sign.matrix.decompose(sign.position, sign.quaternion, sign.scale);
  // Cadre du panneau dans son repère (y vers le bas).
  const panel = { x: frame.x, y: -(frame.y + frame.height), width: frame.width, height: frame.height };
  const path = rectPath(panel);

  const fill = styleColor(style, 'fillColor', '#ffffff');
  if (fill) {
    const board = fillMesh(path, fill, 1);
    board.material = solidMaterial(fill);
    board.name = 'sign-board';
    sign.add(board);
  }
  const stroke = styleColor(style, 'strokeColor', '#000000');
  const strokeWidth = styleNumber(style, 'strokeWidth', 1);
  if (stroke && strokeWidth > 0) {
    const border = strokeMesh(path, stroke, styleOpacity(style, 'strokeOpacity'), {
      width: strokeWidth,
      closed: true,
      dash: dashPattern(style, strokeWidth),
    });
    if (border) {
      border.position.z = SIGN_LAYER;
      border.renderOrder = PART_ORDER.stroke;
      sign.add(border);
    }
  }

  // Texte de la forme centré dans le panneau, ajusté (`fitText`), quelle que soit sa position en 2D.
  const signStyle: Record<string, string> = { ...style, align: 'center', verticalAlign: 'middle' };
  signStyle.fitText = '1';
  signStyle.whiteSpace = 'wrap';
  for (const key of [
    'labelPosition',
    'verticalLabelPosition',
    'spacingTop',
    'spacingBottom',
    'spacingLeft',
    'spacingRight',
  ])
    delete signStyle[key];
  const label = createLabel({ ...shape, style: signStyle }, ctx, shape.label, panel);
  if (label) {
    label.position.z += 2 * SIGN_LAYER;
    sign.add(label);
  }
  return sign;
}
