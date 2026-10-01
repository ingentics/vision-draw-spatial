/**
 * Chaînes de style draw.io : `nom;clé=valeur;clé=valeur;`.
 *
 * Les tokens sans `=` sont des noms de styles (ex. `ellipse`, `text`, `group`) ;
 * le premier sert en général de nom de forme. Une valeur peut contenir `=`
 * (ex. URI d'image), on ne coupe donc que sur le premier.
 */

export interface ParsedStyle {
  /** Tokens sans valeur, dans l'ordre d'apparition. */
  names: string[];
  values: Record<string, string>;
}

export function parseStyle(style: string | null | undefined): ParsedStyle {
  const names: string[] = [];
  const values: Record<string, string> = {};
  if (!style) return { names, values };

  for (const token of style.split(';')) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      names.push(trimmed);
    } else {
      const key = trimmed.slice(0, eq).trim();
      if (key) values[key] = trimmed.slice(eq + 1);
    }
  }
  return { names, values };
}

/** Noms de styles draw.io qui désignent une forme native et leur nom canonique dans le modèle. */
const SHAPE_ALIASES: Record<string, string> = {
  rect: 'rectangle',
  rectangle: 'rectangle',
  label: 'rectangle',
  ellipse: 'ellipse',
  text: 'text',
  group: 'group',
  swimlane: 'swimlane',
};

/**
 * Détermine le nom de forme d'un vertex.
 *
 * Priorité : `shape=…` explicite, puis premier nom de style, puis rectangle
 * (forme par défaut de draw.io).
 */
export function resolveShapeKind(style: ParsedStyle): string {
  const explicit = style.values.shape;
  if (explicit) return SHAPE_ALIASES[explicit] ?? explicit;

  const first = style.names[0];
  if (first) return SHAPE_ALIASES[first] ?? first;

  return 'rectangle';
}
