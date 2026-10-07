import type { Object3D } from 'three';
import type { ConnectSide } from '../edit/handleKinds';
import type { Point, Rect } from '../model/types';
// Modèle en lecture seule (sujet 303) : une forme dessine la forme reçue, sans la modifier.
import type { ReadonlyShapeModel as ShapeModel } from '../model/readonly';
import type { RenderContext } from '../render/types';

/**
 * Une forme peut avoir plusieurs rendus selon le contexte (SPEC §8.2) :
 * - `flat` : à plat sur le sol (vue de dessus) — **obligatoire**, c'est le repli de tous les autres ;
 * - `iso` : en vue isométrique (ex. éléments dressés face à la caméra) ;
 * - `volume` : en 3D (ex. extrusion, SPEC §17) ;
 * - `minimap` : dans la mini-carte (Canvas 2D).
 * Un niveau absent se rabat sur `flat` (scène) ou sur le contour de la forme (mini-carte).
 */
export type SceneLevel = 'flat' | 'iso' | 'volume';

/** Rendu Three.js d'une forme, en espace page (coordonnées draw.io absolues). */
export interface SceneRenderer {
  create(shape: ShapeModel, ctx: RenderContext): Object3D;
}

/**
 * Dessin intérieur d'une forme : un tracé (`ShapeDetailPath`) ou un texte (`ShapeDetailText`). En volume, sur le
 * dessus du bloc, ou au sol devant lui (`ground`, dessin hors du contour).
 */
export type ShapeDetail = ShapeDetailPath | ShapeDetailText;

/** Tracé avec la couleur, l'épaisseur et les pointillés de la bordure, rempli du fond si `filled`. */
export interface ShapeDetailPath {
  path: Point[];
  closed: boolean;
  filled?: boolean;
  ground?: boolean;
}

/**
 * Texte sur une ligne, centré sur `at`, écrit dans la direction `angle` (radians, repère page : 0 vers la droite,
 * −π/2 de bas en haut), de couleur fixe (#rrggbb). `fit` : place disponible (longueur, épaisseur), où la taille est
 * réduite si besoin.
 */
export interface ShapeDetailText {
  text: string;
  at: Point;
  angle: number;
  fontSize: number;
  color: string;
  bold?: boolean;
  fit?: { width: number; height: number };
  ground?: boolean;
}

/** Passage des coordonnées page aux coordonnées de la mini-carte. */
export interface MinimapMapping {
  toMinimap(point: Point): Point;
  /** Pixels mini-carte par pixel de page. */
  scale: number;
  /** Couleurs réglables (#rrggbb) : contour des formes, formes non supportées ; à défaut, celles du moteur. */
  colors?: { outline?: string; placeholder?: string };
}

/**
 * Pinceau restreint remis à une forme pour la mini-carte, en pixels de la mini-carte (`map.toMinimap`). Une forme ne
 * reçoit jamais le contexte 2D : par son canvas elle atteindrait le DOM (sujet 315).
 */
export interface MinimapBrush {
  /** Polygone fermé : rempli de `fill` (rien si absent), bordé de `stroke` (rien si absent), trait `lineWidth` (défaut 0,75). */
  polygon(points: readonly Point[], look: { fill?: string; stroke?: string; lineWidth?: number }): void;
  /** Polyligne ouverte, trait `stroke` d'épaisseur `lineWidth` (défaut 0,75). */
  polyline(points: readonly Point[], look: { stroke: string; lineWidth?: number }): void;
}

/** Dessin d'une forme dans la mini-carte. */
export type MinimapPainter = (brush: MinimapBrush, shape: ShapeModel, map: MinimapMapping) => void;

/** Catégorie de la palette : celles des formes (enregistrées par la racine de composition) ou d'un mode (`page.palette.categories`). */
export type PaletteCategoryId = string;

export interface PaletteCategory {
  id: PaletteCategoryId;
  name: string;
  /** Rang d'affichage (croissant, catégories de la palette et des modes confondues). */
  order: number;
}

/**
 * Élément de la palette (SPEC §14.1) déclaré par une forme : la forme telle que la palette la crée, avec le style et
 * la taille par défaut de draw.io (même rendu à la réouverture dans draw.io).
 */
export interface PaletteEntry {
  /** Nom affiché (celui de l'interface). */
  name: string;
  /** Catégorie de la palette (celle de son dossier `shapes/<catégorie>/`, ou une catégorie du mode pour une forme de mode). */
  category: PaletteCategoryId;
  /** Rang dans la palette (croissant, toutes formes confondues). */
  order: number;
  /** Mots-clés de la recherche, en plus du nom et de la catégorie. */
  keywords: string[];
  style: string;
  value: string;
  width: number;
  height: number;
  /** Icône de la palette : contenu SVG d'un cadre `0 0 40 28`, sans couleurs (celles de la palette). */
  icon: string;
  /** Posée au fond de la pile, derrière les autres formes (ex. région du mode RDD, sujet 182). */
  atBack?: boolean;
}

/** Modèle de la palette : l'élément déclaré par une forme, identifié par l'`id` de la forme. */
export interface ShapeTemplate extends PaletteEntry {
  id: string;
}

/**
 * Section du panneau de la forme où se range un réglage propre à la forme : `shape`, la section de la forme
 * elle-même (titrée de son nom, sous « Texte » : paramètres de l'instance, ex. le mot de la tranche d'un process
 * étiqueté) ; `border` ou `volume` pour un réglage qui précise ces sections communes (coins arrondis, nœuds du cache).
 */
export type PropertySection = 'shape' | 'border' | 'volume';

/**
 * Réglage propre à une forme (ex. coins arrondis, nombre de nœuds), affiché par un champ générique du panneau et
 * écrit dans une clé du style draw.io (attribut spatial si la clé commence par `spatial.`).
 */
export type ShapeProperty =
  | {
      type: 'toggle';
      key: string;
      label: string;
      section: PropertySection;
      /** Cochée quand la clé est absente (décocher écrit `0`, recocher retire la clé). Défaut : décochée. */
      checkedByDefault?: boolean;
    }
  | {
      type: 'number';
      key: string;
      label: string;
      section: PropertySection;
      /** Aide au survol. */
      title?: string;
      /** Valeur affichée quand la clé est absente (la valeur par défaut). */
      placeholder?: string;
    }
  | {
      type: 'text';
      key: string;
      label: string;
      section: PropertySection;
      title?: string;
      placeholder?: string;
      /**
       * Réglé en direct (sujet 306, ex. étiquette d'un bâtiment) : chaque frappe est écrite, en une seule étape
       * d'annulation, et seule la forme est redessinée ; la clé ne touche que le dessin de sa forme.
       */
      live?: boolean;
    };

/**
 * Définition d'une forme (SPEC §8.2) : tout ce que le moteur et l'appli savent d'une forme passe par elle. Chaque
 * forme vit dans son dossier (`plugins/shapes/<catégorie>/<id>/index.ts`, qui exporte `definition`) ; seuls `id` et
 * `flat` sont obligatoires, tout le reste a un repli générique. Une forme en étend une autre en reprenant sa
 * définition (`{ ...rectangle, id: 'rounded-rectangle', … }`) ou une base de `shapes/generic/`.
 */
export interface ShapeDefinition {
  /** Nom de la forme, celui de l'interface en anglais (ex. `database`) : nom de son dossier, accepté par `spatial.kind`. */
  id: string;
  /** Formes draw.io gérées (`ShapeModel.kind`, ex. `cylinder3`). Défaut : `[id]`. */
  kinds?: string[];
  /**
   * Condition en plus du nom draw.io (ex. `rounded=1` pour le rectangle arrondi). Une définition dont la condition est
   * vérifiée l'emporte sur une définition du même nom draw.io sans condition.
   */
  matches?(shape: ShapeModel): boolean;
  /**
   * Contour au sol, en coordonnées page (polygone fermé). Géométrie de référence de la forme :
   * utilisée par le rendu à plat et par les replis (mini-carte…). Absent = rectangle des bornes.
   */
  outline?(shape: ShapeModel): Point[];
  /**
   * Dessin intérieur, en coordonnées page (barres du process, avant-plan d'un stencil…), tracé par le rendu par-dessus
   * le fond ; sert aussi à le comparer à draw.io. Absent = aucun.
   */
  details?(shape: ShapeModel): ShapeDetail[];
  /** Rendu à plat, obligatoire : repli de tous les autres niveaux. */
  /**
   * Le point (coordonnées page, déjà dans les bornes) est-il dans la forme ? Sert à la sélection au clic.
   * Absent = dans le contour s'il y en a un, sinon dans les bornes.
   */
  contains?(shape: ShapeModel, point: Point): boolean;
  /**
   * Emprise prise au clic, si la forme dessine hors de ses bornes (ex. onglet d'une région RDD, sujet 227) ; le point y
   * est d'abord testé, puis passé à `contains`. Le cadre de sélection l'entoure (sujet 315). Absent = les bornes.
   */
  hitBounds?(shape: ShapeModel): Rect;
  flat: SceneRenderer;
  iso?: SceneRenderer;
  volume?: SceneRenderer;
  /**
   * Hauteur du volume en iso / 3D, si la forme en a une par défaut qui lui est propre (ex. demi-cylindre
   * couché : hauteur = rayon). Absent = `blockHeight` (`spatial.height`, sinon le réglage).
   * Sert à l'empilement et à la sélection : le rendu iso doit l'utiliser aussi.
   */
  volumeHeight?(shape: ShapeModel, ctx: RenderContext): number;
  /**
   * Zone du texte, en coordonnées page, pour le rendu de ce niveau (`level` : un niveau que la forme
   * dessine elle-même, sinon `flat`). Le label y est placé (marges `spacing*` comprises) et l'éditeur en
   * place s'y ouvre : affichage et édition coïncident. Absent = les bornes de la forme.
   */
  textZone?(shape: ShapeModel, level: SceneLevel): Rect;
  /**
   * Style de l'éditeur en place, quand le label dessiné ne suit pas le style draw.io (ex. nom d'une région RDD sur son
   * onglet, sujet 228) : alignements et marges du texte dessiné dans `textZone`, qui s'applique alors même à un label
   * hors de la forme pour draw.io (`verticalLabelPosition`…). Absent = le style de la forme.
   */
  editStyle?(style: Record<string, string>): Record<string, string>;
  /** Dessin en mini-carte ; `null` = rien (ex. texte, groupe) ; absent = contour rempli. */
  minimap?: MinimapPainter | null;
  /** Poignées de redimensionnement (défaut : oui). */
  resizable?: boolean;
  /** On peut y accrocher une flèche (défaut : oui). */
  connectable?: boolean;
  /** Texte brut : édité sans mise en forme ni panneau de format (ex. tables RDD, sujet 258 ; défaut : non). */
  plainText?: boolean;
  /** Côtés qui ont une poignée de connexion (défaut : les quatre ; ex. table RDD : gauche et droite, sujet 250). */
  connectSides?: readonly ConnectSide[];
  /**
   * Prise au clic et au rectangle de sélection : `always` (défaut) ou seulement si elle porte un lien
   * (`withLink`, ex. groupe invisible : on prend ses formes).
   */
  pickable?: 'always' | 'withLink';
  /** Saisir une forme qu'elle contient la déplace elle, d'un bloc avec ses enfants (ex. groupe ; défaut : non). */
  movesAsBlock?: boolean;
  /** Élément de la palette qui crée cette forme ; absent = forme absente de la palette. */
  palette?: PaletteEntry;
  /** Réglages propres à la forme, affichés dans le panneau. */
  properties?: ShapeProperty[];
  /**
   * Aperçu de la forme dans les styles du panneau : contenu SVG d'un cadre `0 0 40 28`, sans couleurs (celles du
   * style essayé), sous le texte « Aa ». Absent = rectangle, arrondi si `rounded=1`.
   */
  swatch?(style: Record<string, string>): string;
}
