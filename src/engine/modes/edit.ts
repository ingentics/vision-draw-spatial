import { setCellObjectAttribute, setCellStyleValue, setPageAttribute } from '../format/edit';
import type { PageTree } from '../format/xmlTree';
import type { PageModel } from '../model/types';
import { SPATIAL_PREFIX, spatialValue } from '../spatial';
import type { ModeEdit } from './types';

/**
 * Applique les écritures d'une opération de mode à l'arbre de la page (sans annulation ni relecture du modèle) ;
 * renvoie vrai si quelque chose a changé. Seuls les attributs `spatial.*` sont écrits : sur `<diagram>` pour la page ;
 * pour un élément, là où l'attribut est déjà (objet), sinon dans le style. Les valeurs sont suivies au fil des
 * écritures : une écriture identique à la valeur en place est ignorée.
 */
export function applyModeEdit(
  page: PageModel,
  pageTree: PageTree,
  edit: (edit: ModeEdit) => void,
  palette: readonly string[] = [],
): boolean {
  let changed = false;
  const elements = new Map([...page.shapes, ...page.edges].map((element) => [element.id, element]));
  const written = new Map<string, string | undefined>();
  edit({
    page,
    palette,
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
  });
  return changed;
}
