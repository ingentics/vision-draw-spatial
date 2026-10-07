import {
  canMoveCell,
  gridSizeOf,
  resizeCell,
  setCellLabel,
  setCellObjectAttribute,
  setCellStyleValue,
  setLabelPlacement,
  setPageAttribute,
} from '../core/format/cellEdits';
import { addEdgeLabelCell, removeCells } from '../core/format/create';
import { sendToBackInOrder } from '../core/format/order';
import type { PageTree } from '../core/format/xmlTree';
import type { PageModel, Rect } from '../core/model/types';
import { SPATIAL_PREFIX, spatialValue } from '../core/spatial';
import { END_TEXT_GAP, edgeTextLayout, endLabelOf } from '../core/edit/edgeLabels';
import type { ModeEdit, ModeEditContext } from './types';

/** Contexte par défaut (tests, sans appli) : pas de couleurs proposées, textes de bout aux paramètres par défaut. */
export const DEFAULT_MODE_EDIT_CONTEXT: ModeEditContext = {
  palette: [],
  endText: { size: 9, color: '#808080', gap: END_TEXT_GAP },
};

/**
 * Applique les écritures d'une opération de mode à l'arbre de la page (sans annulation ni relecture du modèle) ;
 * renvoie vrai si quelque chose a changé. Seuls les attributs `spatial.*` sont écrits : sur `<diagram>` pour la page ;
 * pour un élément, là où l'attribut est déjà (objet), sinon dans le style ; les autres clés du style draw.io par
 * `setElementStyle`, les bornes d'une forme par `setShapeBounds` (sujet 179), les labels enfants d'une flèche par
 * `setEdgeEndText` (sujet 265). Les valeurs sont suivies au fil des
 * écritures : une écriture identique à la valeur en place est ignorée.
 */
export function applyModeEdit(
  page: PageModel,
  pageTree: PageTree,
  edit: (edit: ModeEdit) => void,
  context: ModeEditContext = DEFAULT_MODE_EDIT_CONTEXT,
): boolean {
  let changed = false;
  const elements = new Map([...page.shapes, ...page.edges].map((element) => [element.id, element]));
  const written = new Map<string, string | undefined>();
  const resized = new Map<string, Rect>();
  edit({
    page,
    palette: context.palette,
    gridSize: gridSizeOf(pageTree),
    setPageAttribute: (key, value) => {
      const diagram = pageTree.diagram;
      const current = diagram?.hasAttribute(key) ? diagram.getAttribute(key) : undefined;
      if (!key.startsWith(SPATIAL_PREFIX) || current === value) return;
      changed = setPageAttribute(pageTree, key, value) || changed;
    },
    setElementAttribute: (elementId, key, value) => {
      const element = elements.get(elementId);
      // `;` sépare les clés du style draw.io.
      const text = value?.replaceAll(';', '');
      const slot = `${elementId}\n${key}`;
      const current = written.has(slot) ? written.get(slot) : element && spatialValue(element, key);
      if (!element || !key.startsWith(SPATIAL_PREFIX) || current === text) return;
      written.set(slot, text);
      changed = true;
      if (text === undefined) {
        if (element.attributes[key] !== undefined) setCellObjectAttribute(pageTree, elementId, key, undefined);
        setCellStyleValue(pageTree, elementId, key, undefined);
        return;
      }
      const inObject = element.attributes[key] !== undefined && element.style[key] === undefined;
      if (!inObject || !setCellObjectAttribute(pageTree, elementId, key, text)) {
        setCellStyleValue(pageTree, elementId, key, text);
      }
    },
    setElementStyle: (elementId, key, value) => {
      const element = elements.get(elementId);
      const text = value?.replaceAll(';', '');
      const slot = `${elementId}\n${key}`;
      const current = written.has(slot) ? written.get(slot) : element?.style[key];
      if (!element || key.startsWith(SPATIAL_PREFIX) || current === text) return;
      written.set(slot, text);
      changed = true;
      setCellStyleValue(pageTree, elementId, key, text);
    },
    setShapeBounds: (shapeId, bounds) => {
      const shape = page.shapes.find((s) => s.id === shapeId);
      if (!shape || !canMoveCell(pageTree, shapeId)) return;
      const current = resized.get(shapeId) ?? shape.bounds;
      const delta = {
        x: bounds.x - current.x,
        y: bounds.y - current.y,
        width: bounds.width - current.width,
        height: bounds.height - current.height,
      };
      if (Object.values(delta).every((d) => d === 0)) return;
      resized.set(shapeId, bounds);
      changed = true;
      resizeCell(pageTree, shapeId, delta);
    },
    setEdgeEndText: (edgeId, end, text, direction, margin = {}) => {
      const edge = page.edges.find((e) => e.id === edgeId);
      if (!edge) return;
      const slot = `${edgeId}\ntext ${end}`;
      // Texte déjà là (fichier, ou écrit plus tôt dans l'opération) à ce bout.
      const id = written.has(slot) ? written.get(slot) : endLabelOf(edge, end)?.id;
      if (text === undefined) {
        if (id === undefined) return;
        removeCells(pageTree, [id]);
        written.set(slot, undefined);
        changed = true;
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
      const current = edge.labels.find((label) => label.id === id);
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
      const cell = id ?? addEdgeLabelCell(pageTree, edgeId, { value: '', position: placement.position });
      written.set(slot, cell);
      setCellLabel(pageTree, cell, text);
      setLabelPlacement(pageTree, cell, placement);
      for (const [key, value] of Object.entries(style)) setCellStyleValue(pageTree, cell, key, value);
      changed = true;
    },
    sendToBack: (shapeIds) => {
      changed = sendToBackInOrder(pageTree, shapeIds) || changed;
    },
  });
  return changed;
}
