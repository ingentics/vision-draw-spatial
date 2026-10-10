import type { PageModel, ShapeModel } from '../../../../core/plugins';
import { shapeOf } from '../../../../core/plugins';
import { WARNINGS } from '../export/wallRules';
import type { WallWarning, WarningCode } from '../export/wallRules';
import { ACTOR, COMMAND, CONSTRAINT, EVENT, HOTSPOT, POLICY, QUERY, stickyType, SYSTEM } from '../kinds';
import type { StickyType } from '../kinds';

/**
 * Messages des pastilles (sujet 519) : le message court de l'export (`WARNINGS`), puis ce qui est attendu avec un
 * exemple de mur adapté au type du post-it. Les exemples reprennent ceux de la palette (`kinds.ts`) et du mur
 * d'exemple, pour qu'ils se reconnaissent.
 */

/** Post-it nommé : type et texte entre guillemets (espaces insécables : ils ne vont pas seuls à la ligne). */
const named = (type: StickyType, text: string) => `${type.label} «\u00a0${text}\u00a0»`;

/** Post-it du mur cité : nommé, ou son type seul s'il n'a pas de texte. */
function quoted(shape: ShapeModel | undefined): string {
  const type = shape && stickyType(shape);
  const text = shape?.label.replace(/\s+/g, ' ').trim();
  return type ? (text ? named(type, text) : type.label) : 'un post-it';
}

/** Exemple : post-it typés lus de gauche à droite. */
const sequence = (...stickies: [StickyType, string][]) => stickies.map(([type, text]) => named(type, text)).join(' → ');

/**
 * Place de chaque type sur le mur (règles R1 à R4 de `wallRules.ts`) : où il se colle, et un exemple où il est le
 * post-it principal. Sert aux avertissements qui touchent tous les types (W1, W7, W8).
 */
const PLACES = new Map<StickyType, { place: string; example: string }>([
  [
    ACTOR,
    {
      place: 'Un Actor se colle à gauche de la Command qu’il lance ; un Query Model peut l’informer, collé contre lui.',
      example: sequence([ACTOR, 'Client'], [COMMAND, 'Passer commande']),
    },
  ],
  [
    COMMAND,
    {
      place:
        'Une Command se colle à droite de ce qui la lance (Actor, Policy ou Domain Event) et à gauche du Domain Event ' +
        'qu’elle produit ; System, Query Model et Constraint se collent contre elle.',
      example: sequence([ACTOR, 'Client'], [COMMAND, 'Payer'], [EVENT, 'Paiement effectué']),
    },
  ],
  [
    EVENT,
    {
      place:
        'Un Domain Event se colle à droite de la Command qui le produit ; à sa droite, la Policy, la Command ou le ' +
        'Query Model qui en découlent. Deux issues d’une même Command s’empilent.',
      example: sequence(
        [COMMAND, 'Payer'],
        [EVENT, 'Paiement effectué'],
        [POLICY, 'Quand le paiement est effectué, préparer le colis'],
      ),
    },
  ],
  [
    POLICY,
    {
      place:
        'Une Policy se colle entre le Domain Event qui la déclenche (à gauche) et la Command qu’elle émet (à droite).',
      example: sequence(
        [EVENT, 'Paiement refusé'],
        [POLICY, 'Quand le paiement échoue, prévenir'],
        [COMMAND, 'Prévenir le client'],
      ),
    },
  ],
  [
    SYSTEM,
    {
      place:
        'Un System se colle, de n’importe quel côté, contre la Command qui l’appelle ou le Domain Event qui l’implique.',
      example: `${named(SYSTEM, 'Prestataire de paiement')} collé sous la ${named(COMMAND, 'Payer')}`,
    },
  ],
  [
    QUERY,
    {
      place:
        'Un Query Model se colle à droite du Domain Event qui l’alimente, ou contre l’Actor ou la Command qu’il informe.',
      example: sequence([EVENT, 'Commande expédiée'], [QUERY, 'Suivi de commande']),
    },
  ],
  [
    CONSTRAINT,
    {
      place: 'Une Constraint se colle contre la Command qu’elle limite, ou contre le Query Model qu’elle vérifie.',
      example: `${named(CONSTRAINT, 'Pas plus que le stock disponible')} collée au-dessus de la ${named(COMMAND, 'Passer commande')}`,
    },
  ],
  [
    HOTSPOT,
    {
      place: 'Un Hotspot se colle contre le post-it qu’il questionne : au-dessus, en dessous ou à côté.',
      example: `${named(HOTSPOT, 'Règle floue')} collé sous la ${named(COMMAND, 'Payer')}`,
    },
  ],
]);

/** Place du type du post-it, avant le texte propre à l'avertissement. */
const placeOf = (shape: ShapeModel) => PLACES.get(stickyType(shape)!)!;

/** Ce qui est attendu, puis l'exemple ; `shape` : le post-it qui porte la pastille. */
const EXPECTED: Record<WarningCode, (shape: ShapeModel) => { text: string; example: string }> = {
  W1: (shape) => ({ text: placeOf(shape).place, example: placeOf(shape).example }),
  W2: () => ({
    text:
      'Une Policy réagit en émettant une commande : colle à sa droite la Command qu’elle émet. Si la suite reste ' +
      'à trancher, colle-lui un Hotspot qui pose la question.',
    example: sequence([POLICY, 'Quand le paiement échoue, prévenir'], [COMMAND, 'Prévenir le client']),
  }),
  W3: () => ({
    text: 'Une Policy est déclenchée par un événement : colle à sa gauche le Domain Event qui la déclenche.',
    example: sequence([EVENT, 'Paiement refusé'], [POLICY, 'Quand le paiement échoue, prévenir']),
  }),
  W4: () => ({
    text: 'Un Hotspot questionne un post-it : colle-le contre celui qu’il concerne (au-dessus, en dessous ou à côté).',
    example: PLACES.get(HOTSPOT)!.example,
  }),
  W5: () => ({
    text: 'Un événement est le résultat d’une commande : colle à sa gauche la Command qui le produit.',
    example: sequence([COMMAND, 'Payer'], [EVENT, 'Paiement effectué']),
  }),
  W6: () => ({
    text: 'Une commande est lancée par quelqu’un ou quelque chose : colle à sa gauche un Actor, une Policy ou un Domain Event.',
    example: sequence([ACTOR, 'Client'], [COMMAND, 'Passer commande']),
  }),
  W7: (shape) => ({
    text: `Ce post-it ne touche aucun autre : il n’entre dans aucun lien. ${placeOf(shape).place}`,
    example: placeOf(shape).example,
  }),
  W8: (shape) => ({
    text: `Deux post-it posés l’un sur l’autre se cachent et ne se lisent pas : décale-les bord à bord. ${placeOf(shape).place}`,
    example: placeOf(shape).example,
  }),
};

/** Message d'un avertissement sur `shape` : titre (avec l'autre post-it pour W1 et W8), attendu et exemple. */
export function warningHint(page: PageModel, shape: ShapeModel, warning: WallWarning): { title: string; text: string } {
  const other = warning.shapeIds.find((id) => id !== shape.id);
  const message = WARNINGS[warning.code].message;
  const title = other ? `${message} avec ${quoted(shapeOf(page, other))}` : message;
  const { text, example } = EXPECTED[warning.code](shape);
  return { title, text: `${text}\nEx. : ${example}` };
}
