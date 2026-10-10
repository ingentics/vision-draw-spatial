import type { PageModel, ShapeModel } from '../../../../core/plugins';
import { shapeOf } from '../../../../core/plugins';
import type { WallWarning } from '../export/wallRules';
import { stickyType } from '../kinds';
import { named, STICKY_RULES, WARNINGS } from '../stickyRules';

/**
 * Messages des pastilles (sujet 519) : le message court de l'export, puis ce qui est attendu avec un exemple de mur
 * adapté au type du post-it. Textes dans `stickyRules.ts` (sujet 520).
 */

/** Post-it du mur cité : nommé, ou son type seul s'il n'a pas de texte. */
function quoted(shape: ShapeModel | undefined): string {
  const type = shape && stickyType(shape);
  const text = shape?.label.replace(/\s+/g, ' ').trim();
  return type ? (text ? named(type.key, text) : type.label) : 'un post-it';
}

/** Message d'un avertissement sur `shape` : titre (avec l'autre post-it pour W1 et W8), attendu et exemple. */
export function warningHint(page: PageModel, shape: ShapeModel, warning: WallWarning): { title: string; text: string } {
  const other = warning.shapeIds.find((id) => id !== shape.id);
  const { message, hint, example } = WARNINGS[warning.code];
  const title = other ? `${message} avec ${quoted(shapeOf(page, other))}` : message;
  // Sans exemple propre (W1, W7, W8, qui touchent tous les types) : la place du type du post-it, et son exemple.
  const own = STICKY_RULES[stickyType(shape)!.key];
  const text = example ? hint : [hint, own.place].filter(Boolean).join(' ');
  return { title, text: `${text}\nEx. : ${example ?? own.example}` };
}
