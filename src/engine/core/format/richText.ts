import type { RichLine, TextMarks, TextRun } from '../model/types';
import { decodeEntities } from './labelText';
import { isHexColor } from '../model/styleValues';

/**
 * Texte riche des labels HTML draw.io (`html=1`) : gras, italique, souligné, barré, taille, couleur et
 * police sur une partie du texte (`<b>`, `<i>`, `<u>`, `<strike>`, `<font>`, `<span style>`…).
 * Lecture en lignes de segments (`RichLine[]`) et écriture au format que draw.io relit. Sans DOM :
 * le moteur tourne aussi hors navigateur.
 */

const BLOCK_TAGS = new Set([
  'div',
  'p',
  'li',
  'ul',
  'ol',
  'tr',
  'table',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
]);
const VOID_TAGS = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'wbr']);
/** Tailles de `<font size>` (1 à 7), en pixels, comme les navigateurs. */
const FONT_SIZES = [10, 13, 16, 18, 24, 32, 48];
/** Ligne vide finale d'un label HTML, comme draw.io l'écrit (un `<br>` final ne s'afficherait pas). */
const EMPTY_LAST_LINE = '<div><br></div>';
/** Police à chasse fixe écrite pour du code (draw.io la connaît). */
export const MONOSPACE_FAMILY = 'Courier New';

const NBSP = '\u00a0';

const MARK_KEYS = ['bold', 'italic', 'underline', 'strike', 'fontSize', 'color', 'fontFamily'] as const;

/**
 * Lignes de segments d'un label HTML. Les espaces sont fusionnés comme en HTML, sauf les insécables (`&nbsp;`, écrits
 * par `richToHtml` pour les espaces en tête, en fin ou doublés, sujet 409), lus comme des espaces ordinaires ;
 * `preserveSpaces` : tous les espaces comptent (contenu de l'éditeur en place, en `white-space: pre`). `<br>` et
 * blocs = lignes. Les lignes vides (en tête, au milieu, en fin) sont gardées comme draw.io les affiche : un `<br>`
 * final ne fait pas de ligne (HTML), une ligne vide finale s'écrit `<div><br></div>`.
 */
export function parseRichHtml(html: string, { preserveSpaces = false } = {}): RichLine[] {
  const lines: RichLine[] = [[]];
  const stack: Array<{ tag: string; marks: TextMarks }> = [];
  const current = (): TextMarks => Object.assign({}, ...stack.map((entry) => entry.marks)) as TextMarks;
  let pendingBreak = false;
  const newLine = () => {
    if (lines[lines.length - 1]!.length > 0) lines.push([]);
  };
  const tokens = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|<!--[\s\S]*?-->|([^<]+)/g;
  for (const match of literalBreaks(html).matchAll(tokens)) {
    const [, closing, rawTag, attributes = '', text] = match;
    if (text !== undefined) {
      // Espaces gardés en insécables jusqu'à la fin de la lecture : ni fusionnés, ni coupés en bout de ligne.
      const value = decodeEntities(preserveSpaces ? text.replace(/ /g, NBSP) : text.replace(/[ \t\r\n]+/g, ' '));
      // Blancs entre deux blocs (HTML indenté) : ignorés par le navigateur, pas une ligne vide.
      if (value === '' || (pendingBreak && value === ' ')) continue;
      if (pendingBreak) {
        newLine();
        pendingBreak = false;
      }
      lines[lines.length - 1]!.push({ text: value, ...current() });
      continue;
    }
    if (!rawTag) continue;
    const tag = rawTag.toLowerCase();
    if (tag === 'br') {
      if (pendingBreak) newLine();
      pendingBreak = false;
      lines.push([]);
      continue;
    }
    if (BLOCK_TAGS.has(tag)) pendingBreak = true;
    if (VOID_TAGS.has(tag)) continue;
    if (closing) {
      const index = stack.map((entry) => entry.tag).lastIndexOf(tag);
      if (index >= 0) stack.length = index;
    } else if (!attributes.trimEnd().endsWith('/')) {
      stack.push({ tag, marks: tagMarks(tag, attributes) });
    }
  }
  return lines
    .map(trimLine)
    .filter((line, index, all) => line.length > 0 || index < all.length - 1 || all.length === 1);
}

/**
 * Retours à la ligne écrits tels quels dans un label HTML : draw.io (`mxText`, `replaceLinefeeds`) les affiche comme
 * des `<br>`, et ceux de la fin comme des lignes vides (`mxUtils.replaceTrailingNewlines`, `<div><br></div>`).
 * Seulement hors des balises.
 */
function literalBreaks(html: string): string {
  const normalized = html.replace(/\r\n?/g, '\n');
  const body = normalized.replace(/\n+$/, '');
  return (
    body.replace(/<[^>]*>|\n/g, (match) => (match === '\n' ? '<br>' : match)) +
    EMPTY_LAST_LINE.repeat(normalized.length - body.length)
  );
}

/**
 * Lignes HTML jointes comme draw.io les écrit : `<br>` entre les lignes, chaque ligne vide finale en
 * `<div><br></div>` (`mxUtils.replaceTrailingNewlines`) pour qu'elle compte à l'affichage.
 */
export function joinHtmlLines(lines: string[]): string {
  let end = lines.length;
  while (end > 1 && lines[end - 1] === '') end--;
  return lines.slice(0, end).join('<br>') + EMPTY_LAST_LINE.repeat(lines.length - end);
}

/** Texte brut des lignes. */
export function richToText(lines: RichLine[]): string {
  return lines.map((line) => line.map((run) => run.text).join('')).join('\n');
}

/**
 * Texte brut d'un label HTML draw.io (`html=1`, SPEC §7.1) : mêmes lignes que le texte riche, lignes vides comprises
 * (en tête, au milieu, en fin), espaces fusionnés comme à l'affichage.
 */
export function htmlToText(html: string): string {
  return richToText(parseRichHtml(html));
}

/** Le texte a-t-il une mise en forme partielle (sinon : texte brut, format porté par le style) ? */
export function isRich(lines: RichLine[]): boolean {
  return lines.some((line) => line.some((run) => MARK_KEYS.some((key) => run[key] !== undefined)));
}

/** HTML draw.io des lignes : balises simples pour gras / italique / souligné / barré, `<span style>` sinon. */
export function richToHtml(lines: RichLine[]): string {
  return joinHtmlLines(lines.map((line) => mergeRuns(line).map(runToHtml).join('')));
}

function runToHtml(run: TextRun): string {
  let html = escapeText(run.text);
  const css: string[] = [];
  if (run.fontSize !== undefined) css.push(`font-size: ${formatSize(run.fontSize)}px`);
  if (run.color !== undefined) css.push(`color: ${run.color}`);
  if (run.fontFamily !== undefined) css.push(`font-family: ${run.fontFamily}`);
  if (run.bold === false) css.push('font-weight: normal');
  if (run.italic === false) css.push('font-style: normal');
  if (run.underline === false && run.strike === false) css.push('text-decoration: none');
  if (run.strike) html = `<strike>${html}</strike>`;
  if (run.underline) html = `<u>${html}</u>`;
  if (run.italic) html = `<i>${html}</i>`;
  if (run.bold) html = `<b>${html}</b>`;
  return css.length > 0 ? `<span style="${css.join('; ')};">${html}</span>` : html;
}

/** Segments voisins de même mise en forme fusionnés. */
function mergeRuns(line: RichLine): RichLine {
  const merged: TextRun[] = [];
  for (const run of line) {
    const previous = merged[merged.length - 1];
    if (previous && MARK_KEYS.every((key) => previous[key] === run[key])) previous.text += run.text;
    else merged.push({ ...run });
  }
  return merged;
}

/** Échappe le texte ; espaces en tête, en fin ou doublés gardés par des espaces insécables. */
function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/ {2}/g, ' &nbsp;')
    .replace(/^ | $/g, '&nbsp;');
}

function formatSize(size: number): string {
  return String(Math.round(size * 100) / 100);
}

/** Ligne sans les espaces ordinaires de ses bouts ; ses insécables deviennent des espaces ordinaires. */
function trimLine(line: RichLine): RichLine {
  const runs = line.map((run) => ({ ...run }));
  while (runs.length && /^ *$/.test(runs[0]!.text)) runs.shift();
  while (runs.length && /^ *$/.test(runs[runs.length - 1]!.text)) runs.pop();
  if (runs.length) {
    runs[0]!.text = runs[0]!.text.replace(/^ +/, '');
    runs[runs.length - 1]!.text = runs[runs.length - 1]!.text.replace(/ +$/, '');
  }
  return runs.map((run) => ({ ...run, text: run.text.replace(/\u00a0/g, ' ') }));
}

/** Mise en forme apportée par une balise (et son attribut `style`). */
function tagMarks(tag: string, attributes: string): TextMarks {
  const marks: TextMarks = {};
  if (tag === 'b' || tag === 'strong') marks.bold = true;
  if (tag === 'i' || tag === 'em') marks.italic = true;
  if (tag === 'u') marks.underline = true;
  if (tag === 's' || tag === 'strike' || tag === 'del') marks.strike = true;
  if (tag === 'pre' || tag === 'code' || tag === 'tt') marks.fontFamily = MONOSPACE_FAMILY;
  const attrs = parseAttributes(attributes);
  if (tag === 'font') {
    if (attrs.color) marks.color = parseColor(attrs.color) ?? marks.color;
    if (attrs.face) marks.fontFamily = firstFamily(attrs.face);
    const size = Number(attrs.size);
    if (Number.isInteger(size) && size >= 1 && size <= 7) marks.fontSize = FONT_SIZES[size - 1];
  }
  if (attrs.style) Object.assign(marks, cssMarks(attrs.style));
  return marks;
}

function cssMarks(css: string): TextMarks {
  const marks: TextMarks = {};
  for (const declaration of css.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const name = declaration.slice(0, colon).trim().toLowerCase();
    const value = decodeEntities(declaration.slice(colon + 1))
      .trim()
      .toLowerCase();
    if (name === 'font-weight') marks.bold = value === 'bold' || value === 'bolder' || Number(value) >= 600;
    else if (name === 'font-style') marks.italic = value === 'italic' || value === 'oblique';
    else if (name === 'text-decoration' || name === 'text-decoration-line') {
      marks.underline = value.includes('underline');
      marks.strike = value.includes('line-through');
    } else if (name === 'font-size') {
      const size = parseFloat(value);
      if (Number.isFinite(size) && size > 0) marks.fontSize = value.endsWith('pt') ? (size * 4) / 3 : size;
    } else if (name === 'color') {
      const color = parseColor(value);
      if (color) marks.color = color;
    } else if (name === 'font-family') {
      marks.fontFamily = firstFamily(decodeEntities(declaration.slice(colon + 1)));
    }
  }
  return marks;
}

function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const [, name, , double, single, bare] of source.matchAll(
    /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g,
  )) {
    attrs[name!.toLowerCase()] = decodeEntities(double ?? single ?? bare ?? '');
  }
  return attrs;
}

/** Couleur CSS → #rrggbb (hexadécimal court ou long, `rgb()`), sinon undefined. */
export function parseColor(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb)
    return `#${rgb
      .slice(1, 4)
      .map((c) => Math.min(255, Number(c)).toString(16).padStart(2, '0'))
      .join('')}`;
  if (!isHexColor(v, true)) return undefined;
  return v.length === 4 ? `#${[...v.slice(1)].map((c) => c + c).join('')}` : v;
}

function firstFamily(value: string): string {
  return value
    .split(',')[0]!
    .trim()
    .replace(/^["']|["']$/g, '');
}

/** Police à chasse fixe (code) ? */
export function isMonospace(family: string | undefined): boolean {
  return !!family && /mono|courier|consolas|menlo|monaco|code/i.test(family);
}
