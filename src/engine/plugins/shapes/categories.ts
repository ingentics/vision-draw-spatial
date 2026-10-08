import type { ShapeCategory } from '../../core/plugins';
import { FACADE_TAGS_SETTING } from './generic/building';

/**
 * Catégories de la palette des formes, dans l'ordre d'affichage : une par dossier `shapes/<catégorie>/` (sujet 306 :
 * le tronc n'en connaît aucune, la racine de composition les enregistre). Les modes ajoutent les leurs
 * (`page.palette.categories`), rangées avec celles-ci par `order`. Une catégorie déclare les réglages partagés par ses
 * formes (sujet 380 : Paramètres › Formes › <catégorie>).
 */
export const PALETTE_CATEGORIES: ShapeCategory[] = [
  { id: 'geometry', name: 'Géométrie', order: 10 },
  { id: 'general', name: 'Général', order: 20 },
  { id: 'architecture', name: 'Architecture', order: 30, settings: [FACADE_TAGS_SETTING] },
];
