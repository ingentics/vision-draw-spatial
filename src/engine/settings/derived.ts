import type { AccessibilitySettings, StyleSettings } from './types';

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
