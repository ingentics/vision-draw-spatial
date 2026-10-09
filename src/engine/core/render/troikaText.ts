import { Color, DoubleSide, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { Object3D } from 'three';
import { Text } from 'troika-three-text';
import type { RichLine } from '../model/types';
import { isMonospace } from '../format/richText';
import {
  approximateMeasure,
  clipLayout,
  decorationLines,
  fitFontSize,
  layoutRichText,
  scaleRichLines,
} from './richLayout';
import type { FontSpec, MeasureText } from './richLayout';
import { followRenderOrder } from './renderOrder';
import { layoutOnPath } from './textPath';
import type { TextFactory, TextSpec } from './types';
import type { DeepReadonly } from '../model/readonly';

const BACKGROUND_PADDING = 1;
/** Couche des halos d'un texte en morceaux : sous les lettres (0), au-dessus du fond (−0,5). */
const HALO_ORDER_OFFSET = -0.25;
const LINE_HEIGHT = 1.2;
/** Glyphes SDF à 128 px (64 par défaut) : bords nets en petite taille comme en zoom, atlas 4× plus lourd. */
const SDF_GLYPH_SIZE = 128;

/** Rectangle de fond aux dimensions du texte mis en page (connues seulement après la synchro troika). */
function updateBackground(text: Text, color: Color, opacity: number): void {
  const info = (text as Text & { textRenderInfo?: { blockBounds: [number, number, number, number] } }).textRenderInfo;
  if (!info) return;
  const [minX, minY, maxX, maxY] = info.blockBounds;
  const previous = text.getObjectByName('label-background');
  if (previous) {
    text.remove(previous);
    (previous as Mesh).geometry.dispose();
    ((previous as Mesh).material as MeshBasicMaterial).dispose();
  }
  const mesh = new Mesh(
    new PlaneGeometry(maxX - minX + 2 * BACKGROUND_PADDING, maxY - minY + 2 * BACKGROUND_PADDING),
    new MeshBasicMaterial({ color, opacity, transparent: true, depthWrite: false, side: DoubleSide }),
  );
  mesh.name = 'label-background';
  mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, 0);
  followRenderOrder(mesh, text);
  text.add(mesh);
}

/** URLs de polices (.ttf, .otf ou .woff — pas de .woff2). Sans police, troika en charge une depuis un CDN. */
export interface FontSet {
  regular?: string;
  bold?: string;
  italic?: string;
  boldItalic?: string;
  /** Police à chasse fixe (code : `fontFamily=Courier New`, `<pre>`…). */
  mono?: string;
  monoBold?: string;
}

type FontKey = keyof FontSet;

/** Variante de police d'un texte : celle demandée, sinon la plus proche disponible. */
function pickFontKey(fonts: FontSet, bold: boolean, italic: boolean, family?: string): FontKey | undefined {
  const candidates: FontKey[] = [];
  if (isMonospace(family)) candidates.push(...(bold ? (['monoBold', 'mono'] as const) : (['mono'] as const)));
  if (italic) candidates.push(...(bold ? (['boldItalic', 'bold', 'italic'] as const) : (['italic'] as const)));
  else if (bold) candidates.push('bold');
  candidates.push('regular');
  return candidates.find((key) => fonts[key]);
}

export function pickFont(fonts: FontSet, bold: boolean, italic: boolean, family?: string): string | null {
  const key = pickFontKey(fonts, bold, italic, family);
  return key ? fonts[key]! : null;
}

/**
 * Texte SDF (SPEC §8.5) : net en vue de dessus quel que soit le zoom, et posé à plat sur le sol.
 * La mise en page se fait dans un worker ; `onReady` est appelé à chaque texte prêt, pour redessiner.
 * Un texte riche (mise en forme partielle), souligné, barré ou ajusté (`fit`) est mis en page ici
 * (`richLayout`) : un texte SDF par mot, des traits pour les soulignés et barrés.
 */
export function createTroikaTextFactory(
  fonts: FontSet,
  onReady: () => void,
): TextFactory & { dispose(): void; measured(): Promise<MeasureText> } {
  return new TroikaTextFactory(fonts, onReady);
}

class TroikaTextFactory implements TextFactory {
  private readonly baseMaterial = new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide });
  private measuring: Promise<MeasureText> | undefined;

  constructor(
    private readonly fonts: FontSet,
    private readonly onReady: () => void,
  ) {}

  create(spec: TextSpec): Object3D {
    if (spec.along) return this.createOnPath(spec);
    // Ligne vide en fin : troika ne lui donne pas de hauteur (ligne sans glyphe), elle ne compterait ni dans la
    // hauteur ni dans le centrage ; la mise en page riche la compte, comme draw.io.
    if (spec.rich || spec.underline || spec.strike || spec.fit || spec.text.endsWith('\n'))
      return this.createRich(spec);
    const text = this.sdfText(
      spec.text,
      { size: spec.fontSize, bold: spec.bold, italic: spec.italic ?? false, family: spec.fontFamily },
      spec.color,
      spec.opacity,
      spec.halo,
    );
    text.anchorX = spec.anchorX;
    text.anchorY = spec.anchorY;
    text.textAlign = spec.align;
    if (spec.maxWidth !== undefined) {
      text.maxWidth = spec.maxWidth;
      // Comme draw.io : retour à la ligne entre les mots seulement, un mot trop long déborde.
      text.overflowWrap = 'normal';
    } else {
      text.whiteSpace = 'nowrap';
    }
    text.position.set(spec.x, spec.y, 0);
    const background = spec.background;
    text.sync(() => {
      if (background) updateBackground(text, background, spec.opacity);
      this.onReady();
    });
    return text;
  }

  dispose(): void {
    this.baseMaterial.dispose();
  }

  /** Mesure des textes avec les polices du texte SDF, une fois chargées. */
  measured(): Promise<MeasureText> {
    return (this.measuring ??= createMeasure(this.fonts));
  }

  private sdfText(content: string, font: FontSpec, color: Color, opacity: number, halo?: TextSpec['halo']): Text {
    const text = new Text();
    if (halo) {
      // Contour derrière le glyphe (troika le dessine sous le remplissage).
      text.outlineWidth = halo.width;
      text.outlineColor = halo.color;
      text.outlineOpacity = opacity;
      // Bord du halo adouci (flou au-delà de l'épaisseur).
      if (halo.blur) text.outlineBlur = halo.blur;
    }
    text.material = this.baseMaterial;
    text.text = content;
    text.font = pickFont(this.fonts, font.bold, font.italic, font.family);
    text.fontSize = font.size;
    text.sdfGlyphSize = SDF_GLYPH_SIZE;
    text.color = color;
    text.fillOpacity = opacity;
    text.lineHeight = LINE_HEIGHT;
    // L'espace page a y vers le bas ; le texte troika a y vers le haut.
    text.scale.set(1, -1, 1);
    return text;
  }

  /**
   * Morceau d'un texte dessiné en plusieurs textes SDF (lettre, mot) : avec un halo, deux couches, le halo seul
   * (remplissage transparent) sous toutes les lettres, puis la lettre seule, pour que le halo d'un morceau ne
   * passe jamais sur ses voisins. `place` pose chaque texte ; `offset` : rang dans l'ordre de dessin du groupe.
   */
  private layeredText(
    content: string,
    font: FontSpec,
    color: Color,
    opacity: number,
    halo: TextSpec['halo'],
    place: (text: Text) => void,
  ): Array<{ text: Text; offset: number }> {
    const fill = this.sdfText(content, font, color, opacity);
    place(fill);
    if (!halo) return [{ text: fill, offset: 0 }];
    const outline = this.sdfText(content, font, color, opacity, halo);
    outline.fillOpacity = 0;
    place(outline);
    return [
      { text: outline, offset: HALO_ORDER_OFFSET },
      { text: fill, offset: 0 },
    ];
  }

  /**
   * Ajoute au groupe les couches d'un morceau de texte (`layeredText`) ; `onReady` est appelé quand tous les morceaux
   * comptés par `pending` sont prêts.
   */
  private addPieces(group: Group, layers: Array<{ text: Text; offset: number }>, pending: { count: number }): void {
    for (const { text, offset } of layers) {
      followRenderOrder(text, group, offset);
      group.add(text);
      pending.count++;
      text.sync(() => {
        if (--pending.count === 0) this.onReady();
      });
    }
  }

  /** Texte le long d'un tracé : groupe vide tout de suite, une lettre par texte SDF une fois les polices prêtes. */
  private createOnPath(spec: TextSpec): Object3D {
    const group = new Group();
    const along = spec.along!;
    const lines: DeepReadonly<RichLine[]> = spec.rich ?? spec.text.split('\n').map((text) => [{ text }]);
    void this.measured().then((measureText) => {
      const base = {
        size: spec.fontSize,
        bold: spec.bold,
        italic: spec.italic ?? false,
        family: spec.fontFamily,
        underline: false,
        strike: false,
      };
      const layout = layoutRichText(lines, base, measureText, { align: spec.align });
      const anchorY = spec.anchorY === 'top' ? 'top' : spec.anchorY === 'middle' ? 'middle' : 'bottom';
      const glyphs = layoutOnPath(layout, along, { x: spec.anchorX, y: anchorY }, measureText);
      const pending = { count: 0 };
      for (const glyph of glyphs) {
        const color = glyph.color ? new Color(glyph.color) : spec.color;
        const layers = this.layeredText(glyph.text, glyph, color, spec.opacity, spec.halo, (text) => {
          text.anchorX = 'center';
          text.anchorY = 'top-baseline';
          text.whiteSpace = 'nowrap';
          text.position.set(glyph.x, glyph.y, 0);
          text.rotation.z = glyph.angle;
        });
        this.addPieces(group, layers, pending);
      }
      if (pending.count === 0) this.onReady();
    });
    return group;
  }

  /** Texte riche : groupe vide tout de suite, rempli une fois les polices prêtes (mesure des mots). */
  private createRich(spec: TextSpec): Object3D {
    const group = new Group();
    void this.measured().then((measureText) => {
      const layout = richLayoutOf(spec, measureText);
      const left =
        spec.anchorX === 'left' ? spec.x : spec.anchorX === 'right' ? spec.x - layout.width : spec.x - layout.width / 2;
      const top =
        spec.anchorY === 'top'
          ? spec.y
          : spec.anchorY === 'middle'
            ? spec.y - layout.height / 2
            : spec.y - layout.height;
      const add = (object: Object3D, offset = 0) => {
        followRenderOrder(object, group, offset);
        group.add(object);
      };
      if (spec.background) {
        const mesh = plane(
          layout.width + 2 * BACKGROUND_PADDING,
          layout.height + 2 * BACKGROUND_PADDING,
          spec.background,
          spec.opacity,
        );
        mesh.name = 'label-background';
        mesh.position.set(left + layout.width / 2, top + layout.height / 2, 0);
        add(mesh, -0.5);
      }
      const pending = { count: 0 };
      for (const run of layout.runs) {
        const color = run.color ? new Color(run.color) : spec.color;
        for (const { y, thickness } of decorationLines(run)) {
          const line = plane(run.width, thickness, color, spec.opacity);
          line.position.set(left + run.x + run.width / 2, top + y, 0);
          add(line);
        }
        if (run.text.trim() === '') continue;
        const layers = this.layeredText(run.text, run, color, spec.opacity, spec.halo, (text) => {
          text.anchorX = 'left';
          // Ligne de base au point donné : tous les segments d'une ligne s'alignent.
          text.anchorY = 'top-baseline';
          text.whiteSpace = 'nowrap';
          text.position.set(left + run.x, top + run.baseline, 0);
        });
        this.addPieces(group, layers, pending);
      }
      if (pending.count === 0) this.onReady();
    });
    return group;
  }
}

/**
 * Mise en page d'un texte riche ; « Ajuster » : taille réduite pour tenir dans la zone, tailles partielles à
 * proportion ; « Remplir » : taille qui remplit la zone, et texte coupé par « … » s'il dépasse encore au minimum.
 */
function richLayoutOf(spec: TextSpec, measureText: MeasureText) {
  const given: DeepReadonly<RichLine[]> = spec.rich ?? spec.text.split('\n').map((text) => [{ text }]);
  const base = {
    size: spec.fontSize,
    bold: spec.bold,
    italic: spec.italic ?? false,
    family: spec.fontFamily,
    underline: spec.underline ?? false,
    strike: spec.strike ?? false,
  };
  const size = spec.fit
    ? fitFontSize(given, base, measureText, { ...spec.fit, wrap: spec.maxWidth !== undefined, align: spec.align })
    : spec.fontSize;
  const lines = size === spec.fontSize ? given : scaleRichLines(given, size / spec.fontSize);
  const layout = layoutRichText(lines, { ...base, size }, measureText, { maxWidth: spec.maxWidth, align: spec.align });
  return spec.fit?.fill ? clipLayout(layout, spec.fit, measureText, spec.align) : layout;
}

function plane(width: number, height: number, color: Color, opacity: number): Mesh {
  return new Mesh(
    new PlaneGeometry(Math.max(width, 0.01), Math.max(height, 0.01)),
    new MeshBasicMaterial({ color, opacity, transparent: true, depthWrite: false, side: DoubleSide }),
  );
}

/**
 * Mesure des mots avec les polices du texte SDF (chargées sous des noms propres au moteur, pour que
 * la mise en page corresponde au dessin) ; sans DOM, une approximation.
 */
async function createMeasure(fonts: FontSet): Promise<MeasureText> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return approximateMeasure;
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return approximateMeasure;
  const loaded = new Set<FontKey>();
  await Promise.all(
    (Object.keys(fonts) as FontKey[]).map(async (key) => {
      const url = fonts[key];
      if (!url) return;
      try {
        const face = new FontFace(`drawio-spatial-${key}`, `url(${JSON.stringify(url)})`);
        document.fonts.add(await face.load());
        loaded.add(key);
      } catch {
        // Police illisible : mesure approchée pour cette variante.
      }
    }),
  );
  // Mesure à 100 px puis mise à l'échelle : pas d'arrondi des petites tailles.
  const SIZE = 100;
  return (text, font) => {
    const key = pickFontKey(fonts, font.bold, font.italic, font.family);
    if (!key || !loaded.has(key)) return approximateMeasure(text, font);
    context.font = `${SIZE}px "drawio-spatial-${key}"`;
    return (context.measureText(text).width * font.size) / SIZE;
  };
}
