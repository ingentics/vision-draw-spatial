import { LINE_HEIGHT } from './richLayout';
import type { FontSpec, MeasureText } from './richLayout';

const ELLIPSIS = '…';

/** Ligne coupée pour que, suivie de « … », elle tienne dans `width`. */
function withEllipsis(line: string, width: number, font: FontSpec, measure: MeasureText): string {
  let end = line.length;
  while (end > 0 && measure(line.slice(0, end) + ELLIPSIS, font) > width) end -= 1;
  return line.slice(0, end) + ELLIPSIS;
}

/**
 * Texte tronqué à un cadre (sujet 331), sans retour automatique : une ligne trop large finit par « … » ; si les
 * lignes dépassent `height` (interligne du rendu, au moins une ligne), la dernière ligne visible finit par « … » et
 * les suivantes sont retirées. Les lignes sont séparées par `\n`.
 */
export function truncateLines(
  text: string,
  width: number,
  height: number,
  font: FontSpec,
  measure: MeasureText,
): string {
  if (!text) return '';
  const lines = text.split('\n');
  const visible = Math.max(1, Math.floor(height / (LINE_HEIGHT * font.size) + 1e-9));
  const cut = lines.length > visible;
  const kept = cut ? lines.slice(0, visible) : lines;
  return kept
    .map((line, index) => {
      if (cut && index === kept.length - 1) return withEllipsis(line, width, font, measure);
      return measure(line, font) > width ? withEllipsis(line, width, font, measure) : line;
    })
    .join('\n');
}
