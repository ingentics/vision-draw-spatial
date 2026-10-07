import type { AccessibilitySettings, Settings, StyleSettings } from './types';

/** Faut-il réduire les animations ? (`systemPrefersReduced` = `prefers-reduced-motion: reduce`). */
export function resolveReducedMotion(
  setting: AccessibilitySettings['reducedMotion'],
  systemPrefersReduced: boolean,
): boolean {
  return setting === 'always' || (setting === 'system' && systemPrefersReduced);
}

/**
 * Couleurs proposées aux modes de page (ex. couleur d'un nouveau flux) : les fonds des styles de forme, styles de base
 * puis palette étendue, à partir du 3ᵉ (ni le blanc ni le gris du début).
 */
export function modePalette(styles: StyleSettings): string[] {
  return [...styles.base, ...styles.extended].slice(2).map((preset) => preset.fillColor);
}

/** Une section des paramètres a-t-elle changé (valeurs comparées, pas l'objet) ? */
export function settingsSectionChanged<K extends keyof Settings>(
  next: Settings,
  previous: Settings,
  section: K,
): boolean {
  return JSON.stringify(next[section]) !== JSON.stringify(previous[section]);
}
