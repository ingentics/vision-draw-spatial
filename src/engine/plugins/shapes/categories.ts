import type { PaletteCategory } from '../../core/plugins';

/**
 * Catégories de la palette des formes, dans l'ordre d'affichage : une par dossier `shapes/<catégorie>/` (sujet 306 :
 * le tronc n'en connaît aucune, la racine de composition les enregistre). Les modes ajoutent les leurs
 * (`page.palette.categories`), rangées avec celles-ci par `order`.
 */
export const PALETTE_CATEGORIES: PaletteCategory[] = [
  { id: 'geometry', name: 'Géométrie', order: 10 },
  { id: 'general', name: 'Général', order: 20 },
  { id: 'architecture', name: 'Architecture', order: 30 },
];
