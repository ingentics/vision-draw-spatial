import type { Point } from '../../model/types';
import { freezePlain } from '../../model/freeze';
import { PLUGIN_ID_PATTERN } from '../../spatial';

/**
 * Format JSON d'une bibliothèque de formes (sujet 529) : formes purement visuelles, décrites par des données et non par
 * du code, chargées dans un moteur par `registerShapes`. Le JSON vient de l'hôte (ou d'un tiers) : tout est validé, une
 * clé inconnue est ignorée (un champ ajouté plus tard ne change pas `formatVersion`), `meta` est gardé sans être lu.
 */

export const SHAPE_LIBRARY_FORMAT = 'drawio-spatial/shapes';
export const SHAPE_LIBRARY_FORMAT_VERSION = 1;

/** Style posé à la création d'une forme qui n'en donne pas. */
const DEFAULT_STYLE = 'whiteSpace=wrap;html=1;';
/** Rang d'une catégorie qui n'en donne pas : après celles des formes intégrées. */
const DEFAULT_CATEGORY_ORDER = 1000;
/**
 * Données d'un tracé SVG (`d`) : commandes et nombres seulement. L'icône est injectée telle quelle dans la palette, un
 * tracé ne peut donc rien porter d'autre (ni balise, ni attribut).
 */
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/;

export interface LibraryCategory {
  id: string;
  name: string;
  order: number;
}

/** Tracé intérieur d'une forme, en fraction des bornes (0 à 1). */
export interface LibraryDetail {
  path: Point[];
  closed: boolean;
  filled: boolean;
}

/** Dessin d'une forme : contour fermé et tracés intérieurs en fraction des bornes, hauteur du volume en px. */
export interface LibraryRender {
  outline: Point[];
  details: LibraryDetail[];
  depth?: number;
}

export interface LibraryShape {
  id: string;
  /** Id d'une catégorie de la bibliothèque. */
  category: string;
  name: string;
  description?: string;
  keywords: string[];
  width: number;
  height: number;
  /** Style draw.io posé à la création (sans `spatial.library` ni `spatial.kind`, ajoutés par le moteur). */
  style: string;
  value: string;
  /** Tracés SVG de l'icône (cadre `0 0 40 28`) ; absent : tirée du contour. */
  icon?: string[];
  /** Modes de page où la forme est proposée (`none` : page sans mode) ; absent : page sans mode. */
  modes?: string[];
  meta: Record<string, unknown>;
  render: LibraryRender;
}

export interface ShapeLibrary {
  id: string;
  name: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  tags: string[];
  meta: Record<string, unknown>;
  categories: LibraryCategory[];
  shapes: LibraryShape[];
}

export type ShapeLibraryResult = { ok: true; library: ShapeLibrary } | { ok: false; errors: string[] };

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Lecture d'un JSON, champ par champ : chaque erreur est notée avec le chemin du champ, la lecture continue. */
class Reader {
  readonly errors: string[] = [];

  fail(path: string, message: string): undefined {
    this.errors.push(`${path} : ${message}`);
    return undefined;
  }

  string(object: Json, key: string, path: string, required: boolean): string | undefined {
    const value = object[key];
    if (value === undefined) return required ? this.fail(`${path}${key}`, 'obligatoire') : undefined;
    if (typeof value !== 'string') return this.fail(`${path}${key}`, 'texte attendu');
    if (required && value.trim() === '') return this.fail(`${path}${key}`, 'vide');
    return value;
  }

  id(object: Json, key: string, path: string): string | undefined {
    const value = this.string(object, key, path, true);
    if (value !== undefined && !PLUGIN_ID_PATTERN.test(value))
      return this.fail(`${path}${key}`, `« ${value} » invalide (minuscules, chiffres et tirets)`);
    return value;
  }

  strings(object: Json, key: string, path: string): string[] | undefined {
    const value = object[key];
    if (value === undefined) return undefined;
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
      return this.fail(`${path}${key}`, 'liste de textes attendue');
    return value as string[];
  }

  number(object: Json, key: string, path: string, check: (value: number) => boolean, rule: string) {
    const value = object[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value) || !check(value))
      return this.fail(`${path}${key}`, `nombre ${rule} attendu`);
    return value;
  }

  meta(object: Json, path: string): Record<string, unknown> {
    const value = object.meta;
    if (value === undefined) return {};
    if (!isObject(value)) return this.fail(`${path}meta`, 'objet attendu') ?? {};
    // Copie : le JSON de l'hôte reste à lui, la bibliothèque est gelée.
    return structuredClone(value);
  }

  list(object: Json, key: string, path: string): unknown[] | undefined {
    const value = object[key];
    if (!Array.isArray(value) || value.length === 0) return this.fail(`${path}${key}`, 'liste non vide attendue');
    return value;
  }

  /** Points `[x, y]` en fraction des bornes (0 à 1), au moins `min`. */
  points(value: unknown, path: string, min: number): Point[] | undefined {
    if (!Array.isArray(value) || value.length < min) return this.fail(path, `au moins ${min} points`);
    const points: Point[] = [];
    for (const [i, point] of value.entries()) {
      const valid =
        Array.isArray(point) &&
        point.length === 2 &&
        point.every((v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);
      if (!valid) return this.fail(`${path}[${i}]`, 'point [x, y] attendu, valeurs de 0 à 1');
      points.push({ x: point[0] as number, y: point[1] as number });
    }
    return points;
  }
}

/**
 * Bibliothèque lue d'un JSON (`registerShapes`), gelée ; ou les erreurs (en français, avec le chemin du champ fautif),
 * toutes celles trouvées. Un JSON refusé ne donne rien : pas de bibliothèque à moitié lue.
 */
export function readShapeLibrary(json: unknown): ShapeLibraryResult {
  const reader = new Reader();
  if (!isObject(json)) return { ok: false, errors: ['bibliothèque : objet JSON attendu'] };
  if (json.format !== SHAPE_LIBRARY_FORMAT)
    return { ok: false, errors: [`format : « ${SHAPE_LIBRARY_FORMAT} » attendu`] };
  if (json.formatVersion !== SHAPE_LIBRARY_FORMAT_VERSION)
    return { ok: false, errors: [`formatVersion : version de format ${String(json.formatVersion)} non gérée`] };

  const header = isObject(json.library) ? json.library : reader.fail('library', 'objet attendu');
  const categories = readCategories(reader, json);
  const categoryIds = new Set(categories.map((category) => category.id));
  const shapes = readShapes(reader, json, categoryIds);
  const id = header && reader.id(header, 'id', 'library.');
  const name = header && reader.string(header, 'name', 'library.', true);
  if (reader.errors.length > 0 || !header || id === undefined || name === undefined)
    return { ok: false, errors: reader.errors };

  const optional = (key: 'description' | 'author' | 'license' | 'homepage') => {
    const value = reader.string(header, key, 'library.', false);
    return value === undefined ? {} : { [key]: value };
  };
  const library: ShapeLibrary = {
    id,
    name,
    ...optional('description'),
    ...optional('author'),
    ...optional('license'),
    ...optional('homepage'),
    tags: reader.strings(header, 'tags', 'library.') ?? [],
    meta: reader.meta(header, 'library.'),
    categories,
    shapes,
  };
  if (reader.errors.length > 0) return { ok: false, errors: reader.errors };
  return { ok: true, library: freezePlain(library) };
}

function readCategories(reader: Reader, json: Json): LibraryCategory[] {
  const categories: LibraryCategory[] = [];
  for (const [i, raw] of (reader.list(json, 'categories', '') ?? []).entries()) {
    const path = `categories[${i}].`;
    if (!isObject(raw)) {
      reader.fail(`categories[${i}]`, 'objet attendu');
      continue;
    }
    const id = reader.id(raw, 'id', path);
    const name = reader.string(raw, 'name', path, true);
    const order = reader.number(raw, 'order', path, () => true, 'fini');
    if (id !== undefined && categories.some((other) => other.id === id))
      reader.fail(`${path}id`, `« ${id} » en double`);
    else if (id !== undefined && name !== undefined)
      categories.push({ id, name, order: order ?? DEFAULT_CATEGORY_ORDER + i });
  }
  return categories;
}

function readShapes(reader: Reader, json: Json, categoryIds: ReadonlySet<string>): LibraryShape[] {
  const shapes: LibraryShape[] = [];
  for (const [i, raw] of (reader.list(json, 'shapes', '') ?? []).entries()) {
    const path = `shapes[${i}].`;
    if (!isObject(raw)) {
      reader.fail(`shapes[${i}]`, 'objet attendu');
      continue;
    }
    const shape = readShape(reader, raw, path, categoryIds);
    if (shape && shapes.some((other) => other.id === shape.id)) reader.fail(`${path}id`, `« ${shape.id} » en double`);
    else if (shape) shapes.push(shape);
  }
  return shapes;
}

function readShape(
  reader: Reader,
  raw: Json,
  path: string,
  categoryIds: ReadonlySet<string>,
): LibraryShape | undefined {
  const before = reader.errors.length;
  const id = reader.id(raw, 'id', path);
  const category = reader.string(raw, 'category', path, true);
  if (category !== undefined && !categoryIds.has(category))
    reader.fail(`${path}category`, `« ${category} » n’est pas une catégorie de la bibliothèque`);
  const name = reader.string(raw, 'name', path, true);
  const description = reader.string(raw, 'description', path, false);
  const size = isObject(raw.size) ? raw.size : reader.fail(`${path}size`, 'objet { width, height } attendu');
  const positive = (value: number) => value > 0;
  const width = size && reader.number(size, 'width', `${path}size.`, positive, 'positif');
  const height = size && reader.number(size, 'height', `${path}size.`, positive, 'positif');
  if (size && (size.width === undefined || size.height === undefined))
    reader.fail(`${path}size`, 'width et height obligatoires');
  const icon = reader.strings(raw, 'icon', path);
  icon?.forEach((d, j) => {
    if (!PATH_DATA.test(d)) reader.fail(`${path}icon[${j}]`, 'données de tracé SVG attendues (commandes et nombres)');
  });
  const modes = reader.strings(raw, 'modes', path);
  modes?.forEach((mode, j) => {
    if (!PLUGIN_ID_PATTERN.test(mode)) reader.fail(`${path}modes[${j}]`, `« ${mode} » invalide`);
  });
  const render = readRender(reader, raw.render, `${path}render`);
  const style = reader.string(raw, 'style', path, false) ?? DEFAULT_STYLE;
  const value = reader.string(raw, 'value', path, false) ?? '';
  const keywords = reader.strings(raw, 'keywords', path) ?? [];
  const meta = reader.meta(raw, path);
  if (reader.errors.length > before) return undefined;
  return {
    id: id!,
    category: category!,
    name: name!,
    ...(description === undefined ? {} : { description }),
    keywords,
    width: width!,
    height: height!,
    style,
    value,
    ...(icon ? { icon } : {}),
    ...(modes ? { modes } : {}),
    meta,
    render: render!,
  };
}

function readRender(reader: Reader, raw: unknown, path: string): LibraryRender | undefined {
  if (!isObject(raw)) return reader.fail(path, 'objet attendu');
  const outline = reader.points(raw.outline, `${path}.outline`, 3);
  const depth = reader.number(raw, 'depth', `${path}.`, (value) => value >= 0, 'positif ou nul');
  const details: LibraryDetail[] = [];
  if (raw.details !== undefined && !Array.isArray(raw.details)) reader.fail(`${path}.details`, 'liste attendue');
  else
    for (const [i, detail] of ((raw.details as unknown[] | undefined) ?? []).entries()) {
      const at = `${path}.details[${i}]`;
      if (!isObject(detail)) {
        reader.fail(at, 'objet attendu');
        continue;
      }
      const points = reader.points(detail.path, `${at}.path`, 2);
      if (points) details.push({ path: points, closed: detail.closed === true, filled: detail.filled === true });
    }
  return outline && { outline, details, ...(depth === undefined ? {} : { depth }) };
}
