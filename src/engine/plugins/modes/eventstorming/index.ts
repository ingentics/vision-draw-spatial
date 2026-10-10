import type { PageModeDefinition } from '../../../core/plugins';
import { exportedLabel, importedLabel } from './file/fileLabel';
import { adoptGroupLabels, GROUP_PARTS, GROUP_PROPERTY, groupTitleStyle } from './groups/groupLabels';
import { EVENT_STORMING_KEYS } from './keys';
import { STICKY_TYPES } from './kinds';
import { LABELS_PROPERTY, syncLabels } from './labels/pageLabels';
import { stackPlaced } from './order/stacking';
import { PIVOT_PROPERTIES } from './pivot/pivot';
import { dragPlaces } from './places/placesAround';
import { snapTargets } from './places/snapTargets';
import { STICKY } from './shapes/common/stickyLayout';
import {
  BADGE_PART,
  badgeAt,
  badgeBounds,
  badgeMessage,
  badgeStyle,
  VALIDATION_PROPERTY,
} from './warnings/stickyWarnings';

/**
 * Mode « Event storming » (sujet 475) : des post-it typés (événement, commande, acteur…) collés les uns contre les
 * autres, comme sur un mur. Le mode pose les formes et lit leurs contacts (`contacts/contacts.ts`) ; leur
 * interprétation viendra dans d'autres sujets. Lu à plat, en 2D seulement.
 */
export const definition: PageModeDefinition = {
  id: 'eventstorming',
  ...EVENT_STORMING_KEYS,
  name: 'Event storming',
  description: 'Event storming : post-it typés (événements, commandes, acteurs…) collés bord à bord, en 2D',
  // Trois petits post-it qui se touchent, celui du milieu en couleur d'accent.
  // Feutre des labels des post-it (sujet 476), fourni par l'hôte.
  fonts: [STICKY.labelFont],
  icon: {
    fill: 'M1 5h4.5v6H1zM10.5 5H15v6h-4.5z',
    accent: 'M6 5.5h4v5H6z',
  },
  page: {
    viewModes: ['top'],
    // « Activer la validation » : pastilles d'avertissement (sujet 519).
    properties: [LABELS_PROPERTY, VALIDATION_PROPERTY],
    palette: {
      // Pas de forme Titre : les groupes de post-it ont leur titre (sujet 514).
      shapes: [...STICKY_TYPES.map((type) => type.kind), 'text'],
      categories: [{ id: 'eventstorming', name: 'Event storming', order: 5 }],
    },
  },
  lifecycle: {
    // Fichier modifié ailleurs : chaque post-it reprend le réglage « Labels » de sa page.
    opened: (edit) => syncLabels(edit),
  },
  // Nom du type en tête de la valeur dans le fichier, lisible dans draw.io (sujet 478).
  file: { exportedLabel, importedLabel },
  // Titre de chaque groupe de post-it collés, dessiné par son premier post-it (sujet 514) ; pastille d'avertissement ou
  // de pivot à décider (sujet 519).
  dressing: (page) => {
    const title = groupTitleStyle(page);
    const badge = badgeStyle(page);
    return {
      shapeStyle: (shape) => {
        const styles = [title(shape), badge(shape)].filter((style) => style !== undefined);
        return styles.length ? Object.assign({}, ...styles) : undefined;
      },
    };
  },
  parts: {
    // Le titre d'un groupe s'édite au double-clic, comme une partie de son premier post-it (sujet 514).
    ...GROUP_PARTS,
    // La pastille (sujet 519) : son survol, ou son clic, montre son message.
    at: (page, shape, point) => (badgeAt(page, shape, point) ? BADGE_PART : undefined),
    bounds: (page, shape, part) =>
      part === BADGE_PART ? badgeBounds(page, shape) : GROUP_PARTS.bounds(page, shape, part),
    comment: (shape, part, page) => (part === BADGE_PART ? badgeMessage(page, shape) : undefined),
  },
  gestures: {
    // « Groupe » d'un post-it collé (sujet 514), « Pivot » d'un Domain Event (sujet 515).
    properties: [GROUP_PROPERTY, ...PIVOT_PROPERTIES],
    // Post-it posé : il prend le réglage « Labels » de la page, passe derrière le post-it collé sous lui (sujet 484) et
    // prend le libellé du groupe qu'il rejoint (sujet 514).
    placed: (edit, shapeIds) => {
      syncLabels(edit, shapeIds);
      stackPlaced(edit, shapeIds);
      adoptGroupLabels(edit, shapeIds);
    },
    // Cases où poser le post-it glissé, selon la grammaire, et échange avec un autre (sujet 481).
    dragPlaces,
    // Un post-it se colle bord à bord aux autres post-it (sujet 477).
    snapTargets,
  },
};
