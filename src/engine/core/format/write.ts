import { XMLSerializer } from '@xmldom/xmldom';
import { encodeDiagram } from './decode';
import type { DrawioTree } from './xmlTree';

/**
 * Écriture in situ (SPEC §14.2) : on resérialise l'arbre XML d'origine, jamais le modèle neutre.
 *
 * Une page compressée garde sa forme : intacte, son texte d'origine est recopié tel quel ;
 * modifiée (`dirty`), son `<mxGraphModel>` est recompressé comme le fait draw.io. Les pages
 * illisibles sont recopiées sans y toucher.
 */
export function writeDrawio(tree: DrawioTree): string {
  const serializer = new XMLSerializer();
  for (const page of tree.pages) {
    if (page.dirty && page.encoding === 'compressed' && page.diagram && page.model) {
      const diagram = page.diagram;
      while (diagram.firstChild) diagram.removeChild(diagram.firstChild);
      diagram.appendChild(tree.xml.createTextNode(encodeDiagram(serializer.serializeToString(page.model))));
    }
    page.dirty = false;
  }
  return serializer.serializeToString(tree.xml);
}
