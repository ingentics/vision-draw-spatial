import { Group, Vector3 } from 'three';
import {
  PART_ORDER,
  blockHeight,
  createLabel,
  edgeLines,
  fillMesh,
  rectPath,
  solidMaterial,
  spatialValue,
  strokeMesh,
  styleColor,
  styleFlag,
  setStandingFigure,
  styleStroke,
  VERTEX_DEFAULTS,
} from '../../../../../core/plugins';
import type { Point, Rect, RenderContext, SceneRenderer, ShapeModel } from '../../../../../core/plugins';
import { ARMS } from './figure';
import type { FigureOf } from './figure';

/** Actor en iso / 3D : `0` = pas de pancarte (texte au sol) ; absent = il tient son texte sur une pancarte. */
export const SIGN = 'spatial.sign';

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
/** Mains sur la pancarte : longueur posée sur le panneau et dépassement au-delà de son bord (fractions de sa largeur),
 * épaisseur (multiple de celle du trait). */
const HAND_GRIP = 0.12;
const HAND_REACH = 0.04;
const HAND_WIDTH = 1.5;

/** Hauteur debout en iso / 3D : celle de la forme, `spatial.height` prioritaire. */
export function actorHeight(shape: ShapeModel, ctx: RenderContext): number {
  return blockHeight(shape, ctx, shape.bounds.height);
}

/**
 * Acteur en iso / 3D (silhouette de la variante) : pas d'extrusion, le bonhomme 2D se tient **debout**, comme une unité de jeu. Sa silhouette
 * est dans un plan vertical, pieds au centre de l'emprise, de la hauteur de la forme (`spatial.height` prioritaire)
 * et aux proportions de la 2D ; le moteur la tourne face à la caméra à chaque image (`userData.billboard`,
 * `render/billboard.ts`). Il tient son texte sur une pancarte, entre ses mains (`createSign`) ; sans pancarte
 * (`spatial.sign=0`), le label hors de la forme est posé au sol devant lui (`createShapeObject`).
 *
 * Repère de la silhouette : x horizontal (vers la gauche vu de la caméra : l'espace page est un repère indirect), z
 * vers le haut, face vers −y. Le dessin 2D y est retourné (`upright`) : il se voit à l'endroit, comme en 2D.
 */
export function standingActor(figureOf: FigureOf): SceneRenderer {
  return {
    create(shape, ctx) {
      const { bounds, style } = shape;
      const height = actorHeight(shape, ctx);
      const width = bounds.height > 0 ? (bounds.width * height) / bounds.height : bounds.width;
      const group = new Group();
      group.name = `shape:${shape.id}`;
      group.userData.height = height;
      const silhouette = new Group();
      silhouette.userData.billboard = true;
      silhouette.position.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, 0);
      group.add(silhouette);

      // Du cadre 2D du bonhomme (y vers le bas) au plan de la silhouette (z vers le haut), x retourné : vu de la
      // caméra, la droite du dessin reste à droite (antenne du droid).
      const figure = figureOf(width, height);
      const upright = (p: Point): Point => ({ x: width / 2 - p.x, y: height - p.y });
      const sign = signFrame(shape, width, height);
      if (sign) {
        // Bras tendus jusqu'aux bords de la pancarte : les mains la tiennent.
        const hands = height - sign.y - sign.height + sign.height * SIGN_ABOVE_HANDS;
        figure.strokes[ARMS] = [
          { x: width / 2 - sign.width / 2, y: hands },
          { x: width / 2 + sign.width / 2, y: hands },
        ];
      }
      const parts = figure.parts.map((part) => part.map(upright));
      // Silhouette debout (sujet 306) : cadre de la tête, pièces et traits dans son plan (x, z) ; elle se clique sur
      // toute sa hauteur, la sélection entoure la tête, et l'éditeur en place reprend le format du texte de la pancarte.
      setStandingFigure(group, silhouette, {
        head: {
          x: width / 2 - figure.head.x - figure.head.width,
          y: height - figure.head.y - figure.head.height,
          width: figure.head.width,
          height: figure.head.height,
        },
        parts,
        strokes: figure.strokes.map((line) => line.map(upright)),
        ...(sign && { sign, signLabelStyle }),
      });

      const fill = styleColor(style, 'fillColor', VERTEX_DEFAULTS.fill);
      if (fill) {
        // Plan (x, y) couché sur (x, z) : rotation d'un quart de tour autour de x.
        const plane = new Group();
        plane.rotation.x = Math.PI / 2;
        parts.forEach((part, i) => {
          const piece = fillMesh(part, fill, 1);
          piece.material = solidMaterial(fill);
          piece.name = i === 0 ? 'head' : 'part';
          plane.add(piece);
        });
        silhouette.add(plane);
      }

      const stroke = styleStroke(style, VERTEX_DEFAULTS.stroke);
      if (stroke) {
        const segments: number[] = [];
        const polyline = (points: Point[], closed: boolean) => {
          const last = closed ? points.length : points.length - 1;
          for (let i = 0; i < last; i++) {
            const a = points[i]!;
            const b = points[(i + 1) % points.length]!;
            segments.push(a.x, -FRONT, a.y, b.x, -FRONT, b.y);
          }
        };
        for (const part of parts) polyline(part, true);
        for (const line of figure.strokes) polyline(line.map(upright), false);
        const lines = edgeLines(segments, stroke);
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
}

/** Style du texte sur la pancarte : centré et ajusté au panneau (`fitText`), quelle que soit sa position en 2D. */
export function signLabelStyle(style: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {
    ...style,
    align: 'center',
    verticalAlign: 'middle',
    fitText: '1',
    whiteSpace: 'wrap',
  };
  for (const key of [
    'labelPosition',
    'verticalLabelPosition',
    'spacingTop',
    'spacingBottom',
    'spacingLeft',
    'spacingRight',
  ])
    delete result[key];
  return result;
}

/**
 * Cadre de la pancarte dans le plan de la silhouette (x horizontal, y vers le haut), centrée, son bord haut un peu
 * au-dessus des mains (épaules du bonhomme) ; `undefined` sans pancarte (`spatial.sign=0`, ou pas de texte).
 */
function signFrame(shape: ShapeModel, width: number, height: number): Rect | undefined {
  if (spatialValue(shape, SIGN) === '0' || !shape.label.trim() || styleFlag(shape.style, 'noLabel')) return undefined;
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

  const fill = styleColor(style, 'fillColor', VERTEX_DEFAULTS.fill);
  if (fill) {
    const board = fillMesh(path, fill, 1);
    board.material = solidMaterial(fill);
    board.name = 'sign-board';
    sign.add(board);
  }
  const stroke = styleStroke(style, VERTEX_DEFAULTS.stroke);
  if (stroke) {
    const border = strokeMesh(path, stroke.color, stroke.opacity, {
      width: stroke.width,
      closed: true,
      dash: stroke.dash,
    });
    if (border) {
      border.position.z = SIGN_LAYER;
      sign.add(border);
    }
    // Mains : un petit trait de chaque côté, devant le panneau et à cheval sur son bord, à la hauteur des bras.
    const hands = -(frame.y + frame.height - frame.height * SIGN_ABOVE_HANDS);
    for (const side of [-1, 1]) {
      const edge = (side * frame.width) / 2;
      const hand = strokeMesh(
        [
          { x: edge + side * frame.width * HAND_REACH, y: hands },
          { x: edge - side * frame.width * HAND_GRIP, y: hands },
        ],
        stroke.color,
        stroke.opacity,
        { width: stroke.width * HAND_WIDTH, closed: false },
      );
      if (hand) {
        hand.name = 'hand';
        hand.position.z = 3 * SIGN_LAYER;
        sign.add(hand);
      }
    }
  }

  // Texte de la forme sur le panneau, centré et ajusté.
  const label = createLabel({ ...shape, style: signLabelStyle(style) }, ctx, shape.label, panel);
  if (label) {
    label.position.z += 2 * SIGN_LAYER;
    sign.add(label);
  }
  return sign;
}
