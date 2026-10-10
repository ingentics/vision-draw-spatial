import type { PageModeDefinition } from '../../../core/plugins';
import { CONTACTS_PROPERTY } from './contacts/contactsText';
import { EVENT_STORMING_KEYS } from './keys';
import { STICKY_TYPES } from './kinds';
import { LABELS_PROPERTY, syncLabels } from './labels/pageLabels';

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
  },
  gestures: {
    properties: [CONTACTS_PROPERTY],
    // Post-it ajouté ou collé : il prend le réglage « Labels » de la page.
    placed: (edit, shapeIds) => syncLabels(edit, shapeIds),
  },
};
