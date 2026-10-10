import { documentFromTree, readDrawio } from '../../../../../src/engine/core/format/parse';
import { applyModeEdit } from '../../../../../src/engine/core/modes/modeEditWriter';
import type { ModeEdit } from '../../../../../src/engine/core/modes/modeEdit';
import { EVENT_STORMING_KEYS } from '../../../../../src/engine/plugins/modes/eventstorming/keys';
import { fixture } from '../../../../helpers';

/** Aides communes des tests du mode Event storming. */

/** Page du mode : ces cellules (dans `<root>`, après les calques). */
export function stormingXml(cells: string, pageAttributes = ''): string {
  return `<mxfile><diagram id="p" name="P" spatial.mode="eventstorming"${pageAttributes}><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />${cells}</root></mxGraphModel></diagram></mxfile>`;
}

/** Cellule d'un post-it du mode (`type` sans le préfixe `eventstorming-`), 160 × 160 par défaut, fond blanc. */
export function sticky(id: string, type: string, x: number, y: number, value = '', w = 160, h = 160, extra = '') {
  return `<mxCell id="${id}" value="${value}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=none;spacing=8;fitText=fill;spatial.kind=eventstorming-${type};${extra}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" /></mxCell>`;
}

/** Page (la fixture par défaut), et une fonction qui applique une opération du mode puis relit la page. */
export function setup(xml = fixture('eventstorming.drawio')) {
  const { document, tree } = readDrawio(xml);
  let page = document.pages[0]!;
  const run = (operation: (edit: ModeEdit) => void): boolean => {
    page = documentFromTree(tree).pages[0]!;
    const changed = applyModeEdit(page, tree.pages[0]!, EVENT_STORMING_KEYS, operation);
    page = documentFromTree(tree).pages[0]!;
    return changed;
  };
  const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
  return { run, page: () => page, shape, tree };
}
