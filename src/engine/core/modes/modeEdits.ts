import {
  canMoveCell,
  gridSizeOf,
  resizeCell,
  setCellLabel,
  setCellObjectAttribute,
  setCellStyleValue,
  setLabelPlacement,
  setPageAttribute,
} from '../format/cellEdits';
import { addEdgeLabelCell, removeCells } from '../format/create';
import { sendToBackInOrder } from '../format/order';
import type { PageTree } from '../format/xmlTree';
import type { PageModel, Rect } from '../model/types';
import { SPATIAL_PREFIX, spatialValue } from '../spatial';
import { END_TEXT_GAP, edgeTextLayout, endLabelOf } from '../edit/edgeLabels';
import { isLocked } from '../edit/moveSet';
import { modeKey } from './modeKeys';
import type { ModeKeyOwner } from './modeKeys';
import type { ModeEdit, ModeEditContext } from './types';

/** Clé du style draw.io écrite par un mode : ni `;`, ni `=`, ni espace (sujet 301). */
const STYLE_KEY_PATTERN = /^[A-Za-z][\w.:-]*$/;
/** Clés du style qu'un mode n'écrit pas : celles qui verrouillent l'élément (sujet 301). */
const LOCK_KEYS: ReadonlySet<string> = new Set(['locked', 'movable', 'resizable', 'editable', 'deletable']);

/** Contexte par défaut (tests, sans appli) : pas de couleurs proposées, textes de bout aux paramètres par défaut. */
export const DEFAULT_MODE_EDIT_CONTEXT: ModeEditContext = {
  palette: [],
  endText: { size: 9, color: '#808080', gap: END_TEXT_GAP },
};

/**
 * Applique les écritures d'une opération du mode `owner` à l'arbre de la page (sans annulation ni relecture du
 * modèle) ; renvoie vrai si quelque chose a changé. Les attributs du mode, désignés par leur nom court, sont écrits
 * sous `spatial.<espace de noms>.<nom>` (sujet 301) : sur `<diagram>` pour la page ; pour un élément, là où l'attribut
 * est déjà (objet), sinon dans le style ; les autres clés du style draw.io par `setElementStyle` (ni `spatial.*`, ni
 * clé de verrou), les bornes d'une forme par `setShapeBounds` (sujet 179), les labels enfants d'une flèche par
 * `setEdgeEndText` (sujet 265). Un élément verrouillé (`locked`, `movable=0`) ne change ni de style, ni de bornes, ni
 * de place dans l'ordre, ni de textes de bout. Une clé invalide lève une exception. Les valeurs sont suivies au fil des
 * écritures : une écriture identique à la valeur en place est ignorée. Les écritures sont rassemblées, puis appliquées
 * à l'arbre une fois l'opération terminée (sujet 288) : une opération qui lève une exception n'écrit rien.
 */
export function applyModeEdit(
  page: PageModel,
  pageTree: PageTree,
  owner: ModeKeyOwner,
  edit: (edit: ModeEdit) => void,
  context: ModeEditContext = DEFAULT_MODE_EDIT_CONTEXT,
): boolean {
  const elements = new Map([...page.shapes, ...page.edges].map((element) => [element.id, element]));
  const written = new Map<string, string | undefined>();
  const resized = new Map<string, Rect>();
  /** Texte de bout d'une flèche par emplacement : sa cellule (connue à l'écriture s'il est créé), s'il existe. */
  const endTexts = new Map<string, { id: string | undefined; exists: boolean; replaced: boolean }>();
  /** Écritures dans l'arbre, dans l'ordre ; chacune dit si elle a changé quelque chose. */
  const writes: Array<() => boolean> = [];
  edit({
    page,
    palette: context.palette,
    gridSize: gridSizeOf(pageTree),
    setPageAttribute: (name, value) => {
      const key = modeKey(owner.namespace, name);
      const slot = `\n${key}`;
      const diagram = pageTree.diagram;
      const current = written.has(slot)
        ? written.get(slot)
        : diagram?.hasAttribute(key)
          ? diagram.getAttribute(key)
          : undefined;
      if (current === value) return;
      written.set(slot, value);
      writes.push(() => setPageAttribute(pageTree, key, value));
    },
    setElementAttribute: (elementId, name, value) => {
      const key = modeKey(owner.namespace, name);
      const element = elements.get(elementId);
      // `;` sépare les clés du style draw.io.
      const text = value?.replaceAll(';', '');
      const slot = `${elementId}\n${key}`;
      const current = written.has(slot) ? written.get(slot) : element && spatialValue(element, key);
      if (!element || current === text) return;
      written.set(slot, text);
      writes.push(() => {
        if (text === undefined) {
          if (element.attributes[key] !== undefined) setCellObjectAttribute(pageTree, elementId, key, undefined);
          setCellStyleValue(pageTree, elementId, key, undefined);
          return true;
        }
        const inObject = element.attributes[key] !== undefined && element.style[key] === undefined;
        if (!inObject || !setCellObjectAttribute(pageTree, elementId, key, text)) {
          setCellStyleValue(pageTree, elementId, key, text);
        }
        return true;
      });
    },
    setElementStyle: (elementId, key, value) => {
      if (!STYLE_KEY_PATTERN.test(key) || key.startsWith(SPATIAL_PREFIX) || LOCK_KEYS.has(key))
        throw new Error(`clé de style refusée à un mode : « ${key} »`);
      const element = elements.get(elementId);
      const text = value?.replaceAll(';', '');
      const slot = `${elementId}\n${key}`;
      const current = written.has(slot) ? written.get(slot) : element?.style[key];
      if (!element || isLocked(element) || current === text) return;
      written.set(slot, text);
      writes.push(() => {
        setCellStyleValue(pageTree, elementId, key, text);
        return true;
      });
    },
    setShapeBounds: (shapeId, bounds) => {
      const shape = page.shapes.find((s) => s.id === shapeId);
      if (!shape || isLocked(shape) || !canMoveCell(pageTree, shapeId)) return;
      const current = resized.get(shapeId) ?? shape.bounds;
      const delta = {
        x: bounds.x - current.x,
        y: bounds.y - current.y,
        width: bounds.width - current.width,
        height: bounds.height - current.height,
      };
      if (Object.values(delta).every((d) => d === 0)) return;
      resized.set(shapeId, bounds);
      writes.push(() => {
        resizeCell(pageTree, shapeId, delta);
        return true;
      });
    },
    setEdgeEndText: (edgeId, end, text, direction, margin = {}) => {
      const edge = page.edges.find((e) => e.id === edgeId);
      if (!edge || isLocked(edge)) return;
      const slot = `${edgeId}\ntext ${end}`;
      // Texte déjà là (fichier, ou écrit plus tôt dans l'opération) à ce bout.
      let cell = endTexts.get(slot);
      if (!cell) {
        const id = endLabelOf(edge, end)?.id;
        cell = { id, exists: id !== undefined, replaced: false };
        endTexts.set(slot, cell);
      }
      const target = cell;
      if (text === undefined) {
        if (!target.exists) return;
        target.exists = false;
        target.replaced = true;
        writes.push(() => {
          removeCells(pageTree, [target.id!]);
          target.id = undefined;
          return true;
        });
        return;
      }
      // Configuration d'un texte créé à ce bout (comme `EdgeTexts.setEdgeEndLabel`), sur une flèche réduite à sa
      // direction.
      // `direction` part du bout : la flèche réduite va donc du bout vers lui au début, de lui vers le bout à la fin.
      const origin = { x: 0, y: 0 };
      const route = end === 'start' ? [origin, direction] : [direction, origin];
      const { along, across } = context.endText.gap;
      const gap = { along: along + (margin.along ?? 0), across: across + (margin.across ?? 0) };
      const layout = edgeTextLayout(route, end, false, gap);
      const style: Record<string, string> = {
        fontSize: String(context.endText.size),
        fontColor: context.endText.color,
        align: layout.align,
        verticalAlign: layout.verticalAlign,
      };
      // Texte du fichier encore en place (ni retiré ni récrit dans l'opération) : on ne récrit pas le même.
      const current = target.replaced ? undefined : edge.labels.find((label) => label.id === target.id);
      const { placement } = layout;
      const same =
        current &&
        current.label === text &&
        current.placement.position === placement.position &&
        current.placement.distance === placement.distance &&
        current.placement.offset.x === placement.offset.x &&
        current.placement.offset.y === placement.offset.y &&
        Object.entries(style).every(([key, value]) => current.style[key] === value);
      if (same) return;
      target.exists = true;
      target.replaced = true;
      writes.push(() => {
        target.id ??= addEdgeLabelCell(pageTree, edgeId, { value: '', position: placement.position });
        setCellLabel(pageTree, target.id, text);
        setLabelPlacement(pageTree, target.id, placement);
        for (const [key, value] of Object.entries(style)) setCellStyleValue(pageTree, target.id, key, value);
        return true;
      });
    },
    sendToBack: (shapeIds) => {
      const locked = new Set(page.shapes.filter(isLocked).map((shape) => shape.id));
      const ids = shapeIds.filter((id) => !locked.has(id));
      writes.push(() => sendToBackInOrder(pageTree, ids));
    },
  });
  let changed = false;
  for (const write of writes) changed = write() || changed;
  return changed;
}
