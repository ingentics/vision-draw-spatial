import { parseRichHtml, richToText } from '../format/richText';
import type { EdgeModel, ShapeModel } from '../model/types';

/**
 * Commentaire d'un élément : l'attribut `tooltip` de son `<UserObject>`, celui que draw.io montre en infobulle au
 * survol (ticket 188). Texte brut, ou HTML quand il a une mise en forme partielle, signalé par `spatial.commentHtml`
 * (ticket 191) : un texte brut qui contient « < » n'est pas pris pour du HTML.
 */
export const COMMENT_ATTRIBUTE = 'tooltip';
export const COMMENT_HTML_ATTRIBUTE = 'spatial.commentHtml';

/** Commentaire d'un élément : texte brut, et HTML draw.io s'il a une mise en forme partielle. */
export interface ElementComment {
  text: string;
  html?: string;
}

/** Commentaire de l'élément ; undefined s'il n'en a pas (ou s'il est vide). */
export function commentOf(element: ShapeModel | EdgeModel): ElementComment | undefined {
  const raw = element.attributes[COMMENT_ATTRIBUTE];
  if (!raw?.trim()) return undefined;
  if (element.attributes[COMMENT_HTML_ATTRIBUTE] !== '1') return { text: raw };
  const text = richToText(parseRichHtml(raw));
  return text.trim() ? { text, html: raw } : undefined;
}

/** Même commentaire (texte et mise en forme). */
export function sameComment(a: ElementComment | undefined, b: ElementComment | undefined): boolean {
  return a?.text === b?.text && a?.html === b?.html;
}
