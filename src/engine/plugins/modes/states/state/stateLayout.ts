import type { MeasureText, Rect, ShapeModel } from '../../../../core/plugins';
import { stateBody } from './bodyText';

/**
 * Mise en page d'un état (sujet 433) : titre en haut, centré et en gras, puis, s'il y a un contenu, un trait et le
 * contenu aligné à gauche. Les zones se calculent depuis le bas (le contenu a une hauteur fixe par ligne, sans retour
 * automatique) : le dessin, la prise au clic et l'éditeur n'ont pas besoin de la mesure du texte ; seule la hauteur
 * ajustée (`fittedHeight`) la demande, pour les retours à la ligne du titre.
 */

export const STATE = {
  radius: 10,
  width: 140,
  height: 60,
  padding: 6,
  titleSize: 12,
  bodySize: 11,
  /** Hauteur minimale de la zone du titre quand il y a un contenu (sans contenu : `height`). */
  titleMin: 30,
  /** Hauteur d'une ligne de texte en multiple de sa taille (celle du rendu). */
  lineHeight: 1.2,
} as const;

/** Police du titre et du contenu, pour la mesure. */
export const TITLE_FONT = { size: STATE.titleSize, bold: true, italic: false };

/** Lignes du contenu : une par ligne saisie, lignes vides de la fin retirées ; aucune sans contenu. */
export function bodyLines(body: string): string[] {
  const text = body.replace(/\s+$/, '');
  return text ? text.split('\n') : [];
}

/** Hauteur de la zone du contenu, marges comprises ; 0 sans contenu. */
function bodyHeight(body: string): number {
  const lines = bodyLines(body).length;
  return lines === 0 ? 0 : lines * STATE.bodySize * STATE.lineHeight + 2 * STATE.padding;
}

/** Ordonnée du trait entre titre et contenu ; undefined sans contenu. */
export function dividerY(shape: ShapeModel): number | undefined {
  const height = bodyHeight(stateBody(shape));
  return height === 0 ? undefined : shape.bounds.y + shape.bounds.height - height;
}

/** Zone du titre : du haut de l'état jusqu'au trait (ou jusqu'en bas), marges sur les côtés. */
export function titleZone(shape: ShapeModel): Rect {
  const { x, y, width, height } = shape.bounds;
  const bottom = dividerY(shape) ?? y + height;
  return { x: x + STATE.padding, y, width: Math.max(width - 2 * STATE.padding, 0), height: bottom - y };
}

/** Zone du contenu, marges déduites ; undefined sans contenu. */
export function bodyZone(shape: ShapeModel): Rect | undefined {
  const top = dividerY(shape);
  if (top === undefined) return undefined;
  const { x, y, width, height } = shape.bounds;
  const { padding } = STATE;
  return {
    x: x + padding,
    y: top + padding,
    width: Math.max(width - 2 * padding, 0),
    height: Math.max(y + height - top - 2 * padding, 0),
  };
}

/**
 * Titre coupé en lignes pour la largeur `width` : une ligne par ligne saisie, coupée entre les mots quand elle dépasse
 * (un mot plus large que la zone reste seul sur sa ligne). Le dessin écrit ces lignes telles quelles : la hauteur
 * ajustée et le dessin comptent les mêmes.
 */
export function titleLines(title: string, width: number, measure: MeasureText): string[] {
  const lines: string[] = [];
  for (const typed of title.trim().split('\n')) {
    let line = '';
    for (const word of typed.trim().split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next, TITLE_FONT) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Hauteur d'un état ajustée à son titre et à son contenu (sujet 433) : au moins `height` sans contenu, au moins
 * `titleMin` pour le titre avec un contenu ; la largeur reste celle de la forme.
 */
export function fittedHeight(shape: ShapeModel, body: string, measure: MeasureText): number {
  const width = Math.max(shape.bounds.width - 2 * STATE.padding, 0);
  const lines = titleLines(shape.label, width, measure).length;
  const content = bodyHeight(body);
  const title = Math.max(
    lines * STATE.titleSize * STATE.lineHeight + 2 * STATE.padding,
    content === 0 ? STATE.height : STATE.titleMin,
  );
  return Math.ceil(title + content);
}
