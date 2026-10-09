import { stencilName } from './stencil';

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

/** Le token `clé=valeur` est-il celui de `key` ? (un nom de style, sans `=`, n'a pas de clé) */
function isKeyToken(token: string, key: string): boolean {
  return token.includes('=') && token.split('=')[0]!.trim() === key;
}

/**
 * Chaîne de style avec `key` écrite en place (SPEC §14.2) : la clé garde sa position si elle existe, sinon elle est
 * ajoutée à la fin ; undefined la retire (toutes ses occurrences). Les tokens vides sont ôtés ; le « ; » final de
 * draw.io est gardé si l'original l'avait. Rien à changer : la chaîne d'origine, à l'identique.
 */
export function setStyleKey(style: string, key: string, value: string | undefined): string {
  const tokens = style.split(';').filter((token) => token.trim() !== '');
  const index = tokens.findIndex((token) => isKeyToken(token, key));
  if (value === undefined) {
    if (index < 0) return style;
    return joinStyle(
      tokens.filter((token) => !isKeyToken(token, key)),
      style,
    );
  }
  if (index >= 0) {
    if (tokens[index] === `${key}=${value}`) return style;
    tokens[index] = `${key}=${value}`;
  } else {
    tokens.push(`${key}=${value}`);
  }
  return joinStyle(tokens, style);
}

/** Tokens recollés, avec le « ; » final si le style d'origine en avait un (ou était vide). */
function joinStyle(tokens: string[], original: string): string {
  const ended = original.trimEnd().endsWith(';') || original.trim() === '';
  return tokens.join(';') + (ended && tokens.length ? ';' : '');
}

/**
 * Style avec `key` ajoutée seulement si elle n'y est pas : défaut posé à la création d'un élément (ex. taille du
 * texte des paramètres), sans écraser la valeur du modèle de la palette.
 */
export function withStyleDefault(style: string, key: string, value: string): string {
  if (style.split(';').some((token) => isKeyToken(token, key))) return style;
  // Comme draw.io (`mxUtils.setStyle`), la clé ajoutée finit par « ; », même si le modèle n'en avait pas.
  return setStyleKey(style.trim() === '' || style.trimEnd().endsWith(';') ? style : `${style};`, key, value);
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
 * (forme par défaut de draw.io). Un stencil embarqué (`shape=stencil(…)`) prend le nom
 * `stencil:<nom>` de son XML ; illisible, il garde sa valeur brute.
 */
export function resolveShapeKind(style: ParsedStyle): string {
  const explicit = style.values.shape;
  if (explicit?.startsWith('stencil(') && explicit.endsWith(')')) {
    const name = stencilName(explicit.slice('stencil('.length, -1));
    return name ? `stencil:${name}` : explicit;
  }
  if (explicit) return SHAPE_ALIASES[explicit] ?? explicit;

  const first = style.names[0];
  if (first) return SHAPE_ALIASES[first] ?? first;

  return 'rectangle';
}
