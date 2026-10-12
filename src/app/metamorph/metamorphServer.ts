import { SHAPE_LIBRARY_FORMAT, SHAPE_LIBRARY_FORMAT_VERSION } from '../../engine';
import type { MetamorphRequest } from '../../engine';

/**
 * Serveur des formes Metamorph (sujet 538) : il génère les propositions d'une Metamorph et garde, au fur et à mesure,
 * les formes acceptées, rendues comme une bibliothèque de formes (format `drawio-spatial/shapes`, sujet 529). Ici
 * mocké dans l'appli ; un vrai client de serveur prendra la même interface.
 */
export interface MetamorphServer {
  /** Bibliothèque des formes acceptées jusqu'ici ; undefined tant qu'il n'y en a aucune. */
  library(): Promise<unknown>;
  /** Propositions pour une demande : un JSON de bibliothèque, une proposition par forme. */
  generate(request: MetamorphRequest): Promise<unknown>;
  /** Proposition acceptée, gardée par le serveur : la bibliothèque des formes acceptées, à jour. */
  accept(candidateId: string): Promise<unknown>;
}

/** Bibliothèque des formes acceptées : ses modèles de palette sont `metamorph:<id de la proposition>`. */
export const METAMORPH_LIBRARY = 'metamorph';

type Json = Record<string, unknown>;

/** Clé du stockage local où le mock garde les formes acceptées. */
const STORAGE_KEY = 'drawio-spatial:metamorph-library';
/** Délai de génération simulé. */
const GENERATION_DELAY = 2000;
/** Nombres de propositions possibles. */
const COUNTS = [1, 2, 4];
/** Catégorie d'une partie des propositions du mock ; les autres n'en ont pas (catégorie « Autres »). */
const CATEGORY = { id: 'generated', name: 'Générées', order: 900 };

/** Contours de base des propositions (fractions des bornes). */
const OUTLINES: { name: string; outline: number[][] }[] = [
  {
    name: 'rectangle',
    outline: [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  },
  {
    name: 'ellipse',
    outline: Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * 2 * Math.PI;
      return [round(0.5 + 0.5 * Math.cos(a)), round(0.5 + 0.5 * Math.sin(a))];
    }),
  },
  {
    name: 'losange',
    outline: [
      [0.5, 0],
      [1, 0.5],
      [0.5, 1],
      [0, 0.5],
    ],
  },
  {
    name: 'hexagone',
    outline: [
      [0.25, 0],
      [0.75, 0],
      [1, 0.5],
      [0.75, 1],
      [0.25, 1],
      [0, 0.5],
    ],
  },
  {
    name: 'parallélogramme',
    outline: [
      [0.2, 0],
      [1, 0],
      [0.8, 1],
      [0, 1],
    ],
  },
  {
    name: 'étiquette',
    outline: [
      [0, 0],
      [0.8, 0],
      [1, 0.5],
      [0.8, 1],
      [0, 1],
    ],
  },
];

/** Couleurs des styles prédéfinis (fond, bordure). */
const COLORS: { name: string; fill: string; stroke: string }[] = [
  { name: 'bleu', fill: '#dae8fc', stroke: '#6c8ebf' },
  { name: 'vert', fill: '#d5e8d4', stroke: '#82b366' },
  { name: 'orange', fill: '#ffe6cc', stroke: '#d79b00' },
  { name: 'jaune', fill: '#fff2cc', stroke: '#d6b656' },
  { name: 'rouge', fill: '#f8cecc', stroke: '#b85450' },
  { name: 'violet', fill: '#e1d5e7', stroke: '#9673a6' },
];

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

/** `n` éléments distincts de la liste, au hasard. */
function pickDistinct<T>(list: readonly T[], n: number): T[] {
  return [...list].sort(() => Math.random() - 0.5).slice(0, n);
}

function libraryJson(id: string, name: string, shapes: Json[]): Json {
  const categories = shapes.some((shape) => shape.category === CATEGORY.id) ? [CATEGORY] : [];
  return {
    format: SHAPE_LIBRARY_FORMAT,
    formatVersion: SHAPE_LIBRARY_FORMAT_VERSION,
    library: { id, name, description: 'Formes générées par Metamorph' },
    categories,
    shapes,
  };
}

/** Mots de la description, mots-clés de recherche des propositions. */
function keywordsOf(request: MetamorphRequest): string[] {
  const words =
    `${request.text} ${request.comment} ${request.instructions}`.toLowerCase().match(/[\p{L}\p{N}-]{3,}/gu) ?? [];
  return [...new Set(words)].slice(0, 12);
}

/** Mock : propositions tirées au sort parmi des contours et couleurs fixes, formes acceptées dans le stockage local. */
export function createMockMetamorphServer(): MetamorphServer {
  /** Propositions envoyées, par id, en attendant qu'une soit acceptée. */
  const sent = new Map<string, Json>();
  let next = 0;

  const load = (): Json[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const shapes: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(shapes) ? (shapes as Json[]) : [];
    } catch {
      return [];
    }
  };
  const save = (shapes: Json[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes));
    } catch {
      // Stockage indisponible : la forme ne vaut que pour la session.
    }
  };
  let accepted = load();
  const library = () =>
    accepted.length > 0 ? libraryJson(METAMORPH_LIBRARY, 'Formes Metamorph', accepted) : undefined;

  return {
    library: () => Promise.resolve(library()),
    generate: (request) =>
      new Promise((resolve) => {
        setTimeout(() => {
          const count = pick(COUNTS);
          const outlines = pickDistinct(OUTLINES, count);
          const base = request.text.trim().split('\n')[0]!.slice(0, 40) || 'Forme générée';
          const shapes = outlines.map((outline) => {
            const color = pick(COLORS);
            const id = `m${Date.now().toString(36)}${(next++).toString(36)}`;
            const shape: Json = {
              id,
              ...(Math.random() < 0.5 ? { category: CATEGORY.id } : {}),
              name: `${base} (${outline.name} ${color.name})`,
              description: request.instructions.trim().slice(0, 120) || undefined,
              keywords: keywordsOf(request),
              size: { width: request.width, height: request.height },
              style: `fillColor=${color.fill};strokeColor=${color.stroke};whiteSpace=wrap;html=1;`,
              render: { outline: outline.outline },
            };
            sent.set(id, shape);
            return shape;
          });
          resolve(libraryJson('metamorph-candidates', 'Propositions Metamorph', shapes));
        }, GENERATION_DELAY);
      }),
    accept: (candidateId) => {
      const shape = sent.get(candidateId);
      if (shape && !accepted.some((other) => other.id === candidateId)) {
        accepted = [...accepted, shape];
        save(accepted);
      }
      return Promise.resolve(library());
    },
  };
}
