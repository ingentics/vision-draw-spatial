import { Color, Group } from 'three';
import type { Point } from '../../model/types';
import { direction, distance } from '../../model/geometry';
import { fadedStrokeMesh, strokeMesh } from '../meshes';
import { length, positionAlong } from './polyline';
import { styleFlag } from '../../model/styleValues';
import { clamp } from '../../model/numbers';

/**
 * Flèche coupée en deux (`split=1`, ticket 219) : seuls un tronçon au départ de la source et un tronçon à l'arrivée
 * sur la cible sont dessinés. Sans étiquette de renvoi (`splitLabelLeft` côté source, `splitLabelRight` côté cible),
 * le tronçon s'efface en fondu vers le milieu ; avec, il s'arrête net sur un cadre portant le texte.
 */

/** Réglages des flèches coupées (paramètres « Flèches coupées »), en pixels de page. */
export interface EdgeSplitSettings {
  /** Longueur visible d'un tronçon. */
  length: number;
  /** Longueur du fondu, comprise dans la longueur visible. */
  fade: number;
  /** Marge entre le texte et le bord du cadre de renvoi. */
  labelPadding: number;
  /** Taille du texte de renvoi. */
  labelSize: number;
}

export const DEFAULT_EDGE_SPLIT: EdgeSplitSettings = { length: 40, fade: 20, labelPadding: 4, labelSize: 7 };

export function isSplit(style: Record<string, string>): boolean {
  return styleFlag(style, 'split');
}

/** Un tronçon dessiné, du bout de la flèche vers le milieu. */
export interface SplitPiece {
  /** Tracé, du bout (source ou cible) vers le milieu de la flèche. */
  points: Point[];
  /** Côté de la flèche : `left` = source, `right` = cible. */
  side: 'left' | 'right';
  /** Texte de renvoi au bout du tronçon (pas de fondu). */
  label?: string;
  /** Opacité (0 à 1) d'un point du tronçon : 1 jusqu'au fondu, puis jusqu'à 0 au bout ; 1 partout avec un texte. */
  alphaAt: (p: Point) => number;
}

/** Les deux tronçons d'une flèche coupée, découpés sur le trait dessiné `line` (de la source à la cible). */
export function splitPieces(line: Point[], style: Record<string, string>, settings: EdgeSplitSettings): SplitPiece[] {
  const total = length(line);
  if (line.length < 2 || total === 0) return [];
  const visible = Math.min(settings.length, total / 2);
  const fade = Math.min(settings.fade, visible);
  const reversed = [...line].reverse();
  return (['left', 'right'] as const).map((side) => {
    const from = side === 'left' ? line : reversed;
    const label = (side === 'left' ? style.splitLabelLeft : style.splitLabelRight)?.trim() || undefined;
    // Point de début du fondu inséré dans le tracé : l'opacité varie linéairement entre deux points.
    const points =
      label || fade === 0
        ? subPath(from, visible)
        : [...subPath(from, visible - fade), ...tail(from, visible - fade, visible)];
    const alphaAt = (p: Point) => {
      if (label || fade === 0) return 1;
      const along = ((positionAlong(points, p) + 1) / 2) * visible;
      return clamp((visible - along) / fade, 0, 1);
    };
    return { points, side, alphaAt, ...(label && { label }) };
  });
}

/** Début d'une polyligne, jusqu'à la longueur `to`. */
function subPath(points: Point[], to: number): Point[] {
  const result: Point[] = [points[0]!];
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const segment = distance(a, b);
    if (travelled + segment >= to) {
      const u = direction(a, b);
      const k = to - travelled;
      result.push({ x: a.x + u.x * k, y: a.y + u.y * k });
      return result;
    }
    result.push(b);
    travelled += segment;
  }
  return result;
}

/** Morceau d'une polyligne entre les longueurs `from` et `to`, sans le point en `from` (fin de `subPath(from)`). */
function tail(points: Point[], from: number, to: number): Point[] {
  // `subPath(from)` : les points d'origine passés, puis le point en `from` ; `subPath(to)` reprend les mêmes.
  const passed = subPath(points, from).length - 1;
  return subPath(points, to).slice(passed);
}

/**
 * Cadre de renvoi posé au bout d'un tronçon : centre et taille d'un rectangle `width` × `height` dont le bord touche
 * le bout `end`, dans le prolongement de la direction `direction` (vecteur unitaire, du bout vers le cadre).
 */
export function splitLabelFrame(end: Point, direction: Point, width: number, height: number): Point {
  const reachX = direction.x === 0 ? Infinity : width / 2 / Math.abs(direction.x);
  const reachY = direction.y === 0 ? Infinity : height / 2 / Math.abs(direction.y);
  const reach = Math.min(reachX, reachY);
  return { x: end.x + direction.x * reach, y: end.y + direction.y * reach };
}

/** Ce qu'il faut pour dessiner le survol d'une flèche coupée (`userData.splitHover` de l'objet de la flèche). */
export interface SplitHover {
  /** Bouts coupés : fin du tronçon de départ et fin du tronçon d'arrivée (vide : pas de ligne directe). */
  ends: Point[];
  /** Tronçons tels que dessinés (tirets compris) et leur opacité. */
  pieces: Array<{ paths: Point[][]; alphaAt: (p: Point) => number }>;
  /** Coins des cadres de renvoi. */
  frames: Point[][];
  stroke: Color;
  opacity: number;
  strokeWidth: number;
}

/** Épaississement des tronçons et des cadres au survol, en pixels de page. */
export const SPLIT_HOVER_THICKEN = 1;
/** Ligne directe du survol : 1 px à l'écran, noire à 30 %. */
const DIRECT_LINE = { width: 1, color: '#000000', opacity: 0.3 };

/**
 * Survol d'une flèche coupée (ticket 224), au-dessus de tout le schéma : tronçons et cadres redessinés 1 px plus
 * épais, et une ligne droite entre les deux bouts coupés (épaisseur constante à l'écran, d'où `zoom`).
 */
export function splitHoverOverlay(hover: SplitHover, zoom: number): Group {
  const group = new Group();
  group.name = 'split-hover';
  const width = hover.strokeWidth + SPLIT_HOVER_THICKEN;
  for (const piece of hover.pieces) {
    const mesh = fadedStrokeMesh(piece.paths, piece.alphaAt, hover.stroke, hover.opacity, width);
    if (mesh) group.add(mesh);
  }
  for (const corners of hover.frames) {
    const border = strokeMesh(corners, hover.stroke, hover.opacity, { width, closed: true });
    if (border) group.add(border);
  }
  const direct =
    hover.ends.length === 2 &&
    strokeMesh(hover.ends, new Color(DIRECT_LINE.color), DIRECT_LINE.opacity, {
      width: DIRECT_LINE.width / zoom,
      closed: false,
    });
  if (direct) group.add(direct);
  group.traverse((o) => {
    o.renderOrder = Number.MAX_SAFE_INTEGER;
  });
  return group;
}
