import type { PageModeDefinition } from '../../../core/plugins';
import { exportedLabel, importedLabel } from './file/fileLabel';
import { EVENT_STORMING_KEYS } from './keys';
import { STICKY_TYPES } from './kinds';
import { LABELS_PROPERTY, syncLabels } from './labels/pageLabels';
import { stackPlaced } from './order/stacking';
import { dragPlaces } from './places/placesAround';
import { snapTargets } from './places/snapTargets';

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
  icon: {
    fill: 'M1 5h4.5v6H1zM10.5 5H15v6h-4.5z',
    accent: 'M6 5.5h4v5H6z',
  },
  page: {
    viewModes: ['top'],
    properties: [LABELS_PROPERTY],
    palette: {
      shapes: [...STICKY_TYPES.map((type) => type.kind), 'text', 'title'],
      categories: [{ id: 'eventstorming', name: 'Event storming', order: 5 }],
    },
  },
  lifecycle: {
    // Fichier modifié ailleurs : chaque post-it reprend le réglage « Labels » de sa page.
    opened: (edit) => syncLabels(edit),
    // Nom du type en tête de la valeur dans le fichier, lisible dans draw.io (sujet 478).
    exportedLabel,
    importedLabel,
  },
  gestures: {
    // Post-it posé : il prend le réglage « Labels » de la page, et passe derrière le post-it collé sous lui (sujet 484).
    placed: (edit, shapeIds) => {
      syncLabels(edit, shapeIds);
      stackPlaced(edit, shapeIds);
    },
    // Cases où poser le post-it glissé, selon la grammaire, et échange avec un autre (sujet 481).
    dragPlaces,
    // Un post-it se colle bord à bord aux autres post-it (sujet 477).
    snapTargets,
  },
};
