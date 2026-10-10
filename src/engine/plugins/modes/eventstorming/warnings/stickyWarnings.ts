import type { ModeProperty, PageModel, Point, Rect, ShapeModel } from '../../../../core/plugins';
import { isToggled, rectContains, toggleValue } from '../../../../core/plugins';
import { readWall } from '../export/wallRules';
import type { WallWarning } from '../export/wallRules';
import { keys, VALIDATION } from '../keys';
import { isSticky } from '../kinds';
import { isPivotUnknown, pivotQuestion } from '../pivot/pivot';
import { stickyBadgeRect } from './stickyBadge';
import type { StickyBadgeKind } from './stickyBadge';
import { warningHint } from './warningHints';

/**
 * Pastilles des post-it (sujet 519) : les avertissements de la lecture du mur (`readWall`, sujet 518) par post-it, et
 * le pivot « Je ne sais pas » qui prend leur place. Recalculées à chaque modification de la page : une pastille
 * disparaît dès que son avertissement est résolu. Leur message se lit au survol (partie `badge` du post-it).
 */

/** Partie du post-it occupée par la pastille : son survol montre le message. */
export const BADGE_PART = 'badge';

/** Clé de l'habillage (jamais écrite) : pastille du post-it, lue par son dessin. */
export const BADGE = keys.key('badge');

/** Avertissements de chaque post-it, calculés une fois par page (modèle relu à chaque modification). */
const CACHE = new WeakMap<PageModel, Map<string, WallWarning[]>>();

function warningsByShape(page: PageModel): Map<string, WallWarning[]> {
  const cached = CACHE.get(page);
  if (cached) return cached;
  const byShape = new Map<string, WallWarning[]>();
  for (const warning of readWall(page).warnings)
    for (const id of warning.shapeIds) byShape.set(id, [...(byShape.get(id) ?? []), warning]);
  CACHE.set(page, byShape);
  return byShape;
}

/** La page montre-t-elle les avertissements ? Coché par défaut. */
const validationOn = (page: PageModel): boolean => keys.pageFlag(page, VALIDATION, true);

/** Réglage « Activer la validation » de la page : décoché, plus de pastille « ! » (le « ? » du pivot reste). */
export const VALIDATION_PROPERTY: ModeProperty = {
  type: 'toggle',
  key: VALIDATION,
  label: 'Activer la validation',
  title:
    'Pastille « ! » sur les post-it que les règles du mur ne lisent pas, avec ce qui est attendu au survol ; le « ? » du pivot reste (spatial.es.validation)',
  value: (page) => toggleValue(validationOn(page)),
  write: (edit, _target, value) => edit.setPageAttribute(VALIDATION, isToggled(value) ? undefined : '0'),
};

/**
 * Pastille du post-it : « ? » pour un pivot à décider (à la place de l'avertissement), sinon « ! » s'il en a un et que
 * la validation est activée.
 */
export function badgeOf(page: PageModel, shape: ShapeModel): StickyBadgeKind | undefined {
  if (!isSticky(shape)) return undefined;
  if (isPivotUnknown(shape)) return 'question';
  return validationOn(page) && warningsByShape(page).has(shape.id) ? 'warning' : undefined;
}

/** Habillage : la pastille de chaque post-it, pour son dessin. */
export function badgeStyle(page: PageModel): (shape: ShapeModel) => Record<string, string> | undefined {
  return (shape) => {
    const badge = badgeOf(page, shape);
    return badge && { [BADGE]: badge };
  };
}

/** Pastille que dessine le post-it habillé (`badgeStyle`). */
export const drawnBadge = (shape: ShapeModel): StickyBadgeKind | undefined => {
  const badge = shape.style[BADGE];
  return badge === 'warning' || badge === 'question' ? badge : undefined;
};

/** Emprise de la pastille du post-it, s'il en a une. */
export const badgeBounds = (page: PageModel, shape: ShapeModel): Rect | undefined =>
  badgeOf(page, shape) ? stickyBadgeRect(shape.bounds) : undefined;

/** La pastille est-elle sous `point` ? */
export const badgeAt = (page: PageModel, shape: ShapeModel, point: Point): boolean => {
  const bounds = badgeBounds(page, shape);
  return !!bounds && rectContains(bounds, point);
};

/** Message de la pastille : la question du pivot à trancher, ou chaque avertissement, l'un sous l'autre. */
export function badgeMessage(page: PageModel, shape: ShapeModel): { title: string; text: string } | undefined {
  const badge = badgeOf(page, shape);
  if (badge === 'question') {
    const question = pivotQuestion(shape);
    return {
      title: 'Pivot à décider',
      text:
        (question ? `${question}\n` : '') +
        'Réponds aux questions de la section « Pivot » du panneau : cet événement passe-t-il le relais à un autre métier ?',
    };
  }
  if (!badge) return undefined;
  const hints = (warningsByShape(page).get(shape.id) ?? []).map((warning) => warningHint(page, shape, warning));
  if (hints.length === 1) return hints[0];
  return {
    title: `${hints.length} avertissements`,
    text: hints.map((hint) => `• ${hint.title}\n${hint.text}`).join('\n\n'),
  };
}
