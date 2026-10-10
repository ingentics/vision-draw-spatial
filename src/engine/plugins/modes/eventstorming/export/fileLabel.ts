import type { PageModel, ShapeModel } from '../../../../core/plugins';
import { stickyType } from '../kinds';
import { showsLabel } from '../shapes/common/stickyLayout';

/**
 * Label d'un post-it dans le fichier (sujet 478) : le nom du type en gras en tête (`<b>Command</b><br>Payer`), pour
 * qu'il se lise dans draw.io, qui n'en dessine que la valeur ; rien en tête quand la page masque les labels. L'appli
 * ne garde que le texte du ticket : l'en-tête est ajouté à l'enregistrement et retiré à l'ouverture.
 */

const header = (label: string) => `<b>${label}</b>`;

/** Label écrit dans le fichier (`value` : le texte du ticket, HTML) ; undefined pour une autre forme ou sans label. */
export function exportedLabel(_page: PageModel, shape: ShapeModel, value: string): string | undefined {
  const type = stickyType(shape);
  if (!type || !showsLabel(shape)) return undefined;
  return value ? `${header(type.label)}<br>${value}` : header(type.label);
}

/**
 * Label lu du fichier (ou collé), sans l'en-tête du type (suivi d'un retour à la ligne, ou seul) ; undefined s'il n'y
 * en a pas. Labels masqués : rien n'a été mis en tête à l'enregistrement, donc rien n'est retiré (sujet 503).
 */
export function importedLabel(_page: PageModel, shape: ShapeModel, value: string): string | undefined {
  const type = stickyType(shape);
  if (!type || !showsLabel(shape)) return undefined;
  const head = header(type.label);
  if (!value.startsWith(head)) return undefined;
  const rest = value.slice(head.length);
  if (rest === '') return '';
  const br = /^<br\s*\/?>/.exec(rest);
  return br ? rest.slice(br[0].length) : undefined;
}
