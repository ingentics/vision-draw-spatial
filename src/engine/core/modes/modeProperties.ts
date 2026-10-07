/** Valeur d'un réglage `toggle` déclaré par un mode quand il est coché (décoché : pas de valeur). */
export const TOGGLE_ON = '1';

/** Le réglage `toggle` de valeur `value` est-il coché ? */
export function isToggled(value: string | undefined): boolean {
  return value === TOGGLE_ON;
}

/** Valeur d'un réglage `toggle` coché (`on`) ou décoché (`undefined` : l'attribut disparaît). */
export function toggleValue(on: boolean): string | undefined {
  return on ? TOGGLE_ON : undefined;
}
