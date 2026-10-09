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

/** Ligne placée : ses morceaux `runs[start..end[`, son haut, sa hauteur et sa largeur. */
export interface PlacedLine {
  start: number;
  end: number;
  top: number;
  height: number;
  width: number;
}

export interface RichTextLayout {
  runs: PlacedRun[];
  lines: PlacedLine[];
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
  const placed: PlacedLine[] = [];
  let top = 0;
  for (const line of laidOut) {
    const start = runs.length;
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
    placed.push({ start, end: runs.length, top, height: LINE_HEIGHT * line.size, width: line.width });
    top += LINE_HEIGHT * line.size;
  }
  return { runs, lines: placed, width: blockWidth, height: top };
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
/** Plus petite taille du mode « Remplir » (`fitText=fill`, post-it, sujet 411) : en dessous, le texte finit par « … ». */
export const MIN_FILL_SIZE = 6;

/**
 * Plus grande taille essayée par « Remplir » : une ligne de toute la hauteur de la zone, sans descendre sous le
 * minimum.
 */
export function maxFillSize(height: number): number {
  return Math.max(Math.floor(height / LINE_HEIGHT), MIN_FILL_SIZE);
}

/**
 * Taille du texte ajusté à sa zone. « Ajuster » (`fitText=1`) : `base.size` si le texte tient, sinon la plus grande
 * taille entière à laquelle le texte mis en page (retour à la ligne à `width` si `wrap`) tient dans `width` ×
 * `height`, jamais sous `MIN_FIT_SIZE`. « Remplir » (`fill`) : la plus grande taille entière qui tient, plus grande
 * ou plus petite que `base.size`, jamais sous `MIN_FILL_SIZE`. Les tailles partielles suivent la taille de base, à
 * proportion.
 */
export function fitFontSize(
  lines: DeepReadonly<RichLine[]>,
  base: BaseTextFormat,
  measure: MeasureText,
  zone: { width: number; height: number; wrap: boolean; align: 'left' | 'center' | 'right'; fill?: boolean },
): number {
  const fits = (size: number) => {
    const factor = size / base.size;
    const layout = layoutRichText(scaleRichLines(lines, factor), { ...base, size }, measure, {
      maxWidth: zone.wrap ? zone.width : undefined,
      align: zone.align,
    });
    return layout.width <= zone.width + 1e-6 && layout.height <= zone.height + 1e-6;
  };
  if (zone.fill) return largestFitting(maxFillSize(zone.height), fits, MIN_FILL_SIZE);
  if (fits(base.size)) return base.size;
  return largestFitting(Math.max(Math.ceil(base.size) - 1, MIN_FIT_SIZE), fits);
}

/**
 * Plus grande taille entière de `min` à `max` pour laquelle `fits` est vrai (recherche dichotomique : un texte plus
 * petit tient toujours mieux) ; `min` si aucune ne convient. Partagée par le rendu et l'éditeur en place (qui mesure,
 * lui, dans le DOM).
 */
export function largestFitting(max: number, fits: (size: number) => boolean, min = MIN_FIT_SIZE): number {
  if (fits(max)) return max;
  let low = min;
  let high = max;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return low;
}

const ELLIPSIS = '…';

/**
 * Texte mis en page coupé à sa zone (« Remplir » au minimum, sujet 411) : les lignes qui dépassent la hauteur sont
 * retirées (au moins une reste) et la dernière gardée finit par « … » ; une ligne trop large (mot plus long que la
 * zone) aussi. Les lignes raccourcies restent alignées selon `align`.
 */
export function clipLayout(
  layout: RichTextLayout,
  zone: { width: number; height: number },
  measure: MeasureText,
  align: 'left' | 'center' | 'right',
): RichTextLayout {
  const fitting = layout.lines.filter((line) => line.top + line.height <= zone.height + 1e-6);
  const kept = fitting.length > 0 ? fitting : layout.lines.slice(0, 1);
  const cut = kept.length < layout.lines.length;
  if (!cut && kept.every((line) => line.width <= zone.width + 1e-6)) return layout;
  const runs: PlacedRun[] = [];
  const lines: PlacedLine[] = [];
  kept.forEach((line, index) => {
    const own = layout.runs.slice(line.start, line.end).map((run) => ({ ...run }));
    const ellipsis = (cut && index === kept.length - 1) || line.width > zone.width + 1e-6;
    const shortened = ellipsis ? withEllipsis(own, zone.width, measure) : own;
    const width = shortened.reduce((sum, run) => sum + run.width, 0);
    const shift = (line.width - width) * (align === 'left' ? 0 : align === 'right' ? 1 : 0.5);
    const start = runs.length;
    for (const run of shortened) runs.push({ ...run, x: run.x + shift });
    lines.push({ ...line, start, end: runs.length, width });
  });
  const last = lines[lines.length - 1];
  return {
    runs,
    lines,
    width: Math.min(layout.width, zone.width),
    height: last ? last.top + last.height : 0,
  };
}

/** Morceaux d'une ligne raccourcis (lettre par lettre, puis espaces de fin) pour que, suivis de « … », ils tiennent. */
function withEllipsis(runs: PlacedRun[], width: number, measure: MeasureText): PlacedRun[] {
  const font = runs[runs.length - 1];
  if (!font) return runs;
  const total = () => runs.reduce((sum, run) => sum + run.width, 0);
  const room = width - measure(ELLIPSIS, font);
  while (runs.length > 0 && total() > room) {
    const last = runs[runs.length - 1]!;
    const text = last.text.slice(0, -1);
    if (text) runs[runs.length - 1] = { ...last, text, width: measure(text, last) };
    else runs.pop();
  }
  const last = runs[runs.length - 1];
  if (!last) return [{ ...font, text: ELLIPSIS, x: 0, width: measure(ELLIPSIS, font) }];
  const text = last.text.trimEnd() + ELLIPSIS;
  runs[runs.length - 1] = { ...last, text, width: measure(text, last) };
  return runs;
}
