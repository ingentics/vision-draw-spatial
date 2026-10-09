/** Formats des valeurs affichées par les curseurs des paramètres. */
export const percent = (v: number) => `${Math.round(v * 100)} %`;
export const ms = (v: number) =>
  v === 0 ? 'instantané' : v < 1000 ? `${v} ms` : `${(v / 1000).toLocaleString('fr-FR')} s`;
