import type { RichLine } from '../model/types';
import type { DeepReadonly } from '../model/readonly';

/**
 * Mise en page d'un texte riche (segments de tailles, graisses et polices différentes) : retour à la
 * ligne entre les mots, alignement des lignes, lignes de base, soulignés et barrés. Pure : la mesure
 * des largeurs est injectée (canvas 2D dans le navigateur, approximation en test).
 */

export interface FontSpec {
  size: number;
  bold: boolean;
  italic: boolean;
  family?: string;
}

/** Largeur d'un texte dans une police, en pixels de page. */
export type MeasureText = (text: string, font: FontSpec) => number;

/** Format de base (style de l'élément), complété ou remplacé segment par segment. */
export interface BaseTextFormat extends FontSpec {
  underline: boolean;
  strike: boolean;
  color?: string;
}

/** Morceau placé : un mot ou des espaces (gardés pour leurs traits : souligné continu sous « deux mots »). */
export interface PlacedRun extends FontSpec {
  text: string;
  /** Bord gauche et ligne de base, relatifs au coin haut-gauche du bloc. */
  x: number;
  baseline: number;
  width: number;
  color?: string;
  underline: boolean;
  strike: boolean;
}

export interface RichTextLayout {
  runs: PlacedRun[];
  width: number;
  height: number;
}

/** Hauteur de ligne en multiple de la taille, comme le texte SDF. */
export const LINE_HEIGHT = 1.2;
/** Ligne de base sous le haut de la ligne, en multiple de la taille (Roboto, interligne 1,2). */
const BASELINE = 0.942;

export function layoutRichText(
  lines: DeepReadonly<RichLine[]>,
  base: BaseTextFormat,
  measure: MeasureText,
  options: { maxWidth?: number; align: 'left' | 'center' | 'right' },
): RichTextLayout {
  type Piece = Omit<PlacedRun, 'x' | 'baseline'> & { space: boolean };
  const laidOut: Array<{ pieces: Piece[]; width: number; size: number }> = [];

  for (const line of lines) {
    // Mots et espaces, chacun avec sa police.
    const pieces: Piece[] = [];
    for (const run of line) {
      const format = {
        size: run.fontSize ?? base.size,
        bold: run.bold ?? base.bold,
        italic: run.italic ?? base.italic,
        family: run.fontFamily ?? base.family,
        color: run.color ?? base.color,
        underline: run.underline ?? base.underline,
        strike: run.strike ?? base.strike,
      };
      for (const token of run.text.split(/( +)/)) {
        if (token) pieces.push({ ...format, text: token, width: measure(token, format), space: token[0] === ' ' });
      }
    }
    // Retour à la ligne entre les mots (un mot trop long déborde, comme draw.io).
    let current: Piece[] = [];
    let width = 0;
    const flush = () => {
      while (current.length && current[current.length - 1]!.space) width -= current.pop()!.width;
      const size = current.reduce((max, piece) => Math.max(max, piece.size), 0) || lineSize(line, base);
      laidOut.push({ pieces: current, width: Math.max(width, 0), size });
      current = [];
      width = 0;
    };
    const maxWidth = options.maxWidth;
    let wrapped = false;
    for (const piece of pieces) {
      if (maxWidth !== undefined && !piece.space && current.length > 0 && width + piece.width > maxWidth) {
        flush();
        wrapped = true;
      }
      // Les espaces au début d'une ligne coupée disparaissent.
      if (piece.space && wrapped && current.length === 0) continue;
      current.push(piece);
      width += piece.width;
    }
    flush();
  }

  const blockWidth = laidOut.reduce((max, line) => Math.max(max, line.width), 0);
  const runs: PlacedRun[] = [];
  let top = 0;
  for (const line of laidOut) {
    const baseline = top + BASELINE * line.size;
    let x =
      options.align === 'left'
        ? 0
        : options.align === 'right'
          ? blockWidth - line.width
          : (blockWidth - line.width) / 2;
    for (const { space: _space, ...piece } of line.pieces) {
      runs.push({ ...piece, x, baseline });
      x += piece.width;
    }
    top += LINE_HEIGHT * line.size;
  }
  return { runs, width: blockWidth, height: top };
}

/** Taille d'une ligne vide : celle de son premier segment, sinon la taille de base. */
function lineSize(line: DeepReadonly<RichLine>, base: BaseTextFormat): number {
  return line[0]?.fontSize ?? base.size;
}

/** Traits de souligné et de barré d'un segment : décalage sous (+) ou sur (−) la ligne de base, épaisseur. */
export function decorationLines(run: PlacedRun): Array<{ y: number; thickness: number }> {
  const thickness = Math.max(run.size / 14, 0.5);
  const lines: Array<{ y: number; thickness: number }> = [];
  if (run.underline) lines.push({ y: run.baseline + run.size * 0.12, thickness });
  if (run.strike) lines.push({ y: run.baseline - run.size * 0.28, thickness });
  return lines;
}

/** Largeur approximative (sans canvas) : 0,55 em par caractère, 0,6 em en chasse fixe. */
export const approximateMeasure: MeasureText = (text, font) =>
  text.length * font.size * (font.family && /mono|courier/i.test(font.family) ? 0.6 : font.bold ? 0.58 : 0.55);

/** Texte dont toutes les tailles (base et tailles partielles) sont multipliées par `factor`. */
export function scaleRichLines(lines: DeepReadonly<RichLine[]>, factor: number): RichLine[] {
  return lines.map((line) =>
    line.map((run) => (run.fontSize === undefined ? run : { ...run, fontSize: run.fontSize * factor })),
  );
}

/** Plus petite taille du mode « Ajuster » (`fitText=1`) : en dessous, le texte garde 1 et déborde. */
export const MIN_FIT_SIZE = 1;

/**
 * Taille du texte « Ajuster » (`fitText=1`) : `base.size` si le texte tient, sinon la plus grande taille entière à
 * laquelle le texte mis en page (retour à la ligne à `width` si `wrap`) tient dans `width` × `height`.
 * Les tailles partielles suivent la taille de base, à proportion. Jamais sous `MIN_FIT_SIZE`.
 */
export function fitFontSize(
  lines: DeepReadonly<RichLine[]>,
  base: BaseTextFormat,
  measure: MeasureText,
  zone: { width: number; height: number; wrap: boolean; align: 'left' | 'center' | 'right' },
): number {
  const fits = (size: number) => {
    const factor = size / base.size;
    const layout = layoutRichText(scaleRichLines(lines, factor), { ...base, size }, measure, {
      maxWidth: zone.wrap ? zone.width : undefined,
      align: zone.align,
    });
    return layout.width <= zone.width + 1e-6 && layout.height <= zone.height + 1e-6;
  };
  if (fits(base.size)) return base.size;
  return largestFitting(Math.max(Math.ceil(base.size) - 1, MIN_FIT_SIZE), fits);
}

/**
 * Plus grande taille entière de `MIN_FIT_SIZE` à `max` pour laquelle `fits` est vrai (recherche
 * dichotomique : un texte plus petit tient toujours mieux) ; `MIN_FIT_SIZE` si aucune ne convient.
 * Partagée par le rendu et l'éditeur en place (qui mesure, lui, dans le DOM).
 */
export function largestFitting(max: number, fits: (size: number) => boolean): number {
  if (fits(max)) return max;
  let low = MIN_FIT_SIZE;
  let high = max;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return low;
}
