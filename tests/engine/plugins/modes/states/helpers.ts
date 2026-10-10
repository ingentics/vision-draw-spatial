import { documentFromTree, readDrawio } from '../../../../../src/engine/core/format/parse';
import { applyModeEdit } from '../../../../../src/engine/core/modes/modeEditWriter';
import type { ModeEdit } from '../../../../../src/engine/core/modes/modeEdit';
import { STATES_KEYS } from '../../../../../src/engine/plugins/modes/states/keys';
import { fixture } from '../../../../helpers';

/** Aides communes des tests du mode Machine à états. */

/** Page d'une machine à états : la fixture, ou ces cellules (dans `<root>`, après les calques). */
export function statesXml(cells: string): string {
  return `<mxfile><diagram id="p" name="P" spatial.mode="states"><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />${cells}</root></mxGraphModel></diagram></mxfile>`;
}

/** Cellule d'une forme du mode (`kind` sans le préfixe `states-`, ou une autre forme par son style). */
export function vertex(id: string, kind: string, x: number, y: number, w: number, h: number, value = '', extra = '') {
  const style = kind.includes('=') ? kind : `spatial.kind=states-${kind};`;
  return `<mxCell id="${id}" value="${value}" style="${style}${extra}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry" /></mxCell>`;
}

/** Cellule d'une flèche ; `source` ou `target` vide : bout libre. */
export function edge(id: string, source: string, target: string, value = '') {
  const ends = `${source ? ` source="${source}"` : ''}${target ? ` target="${target}"` : ''}`;
  return `<mxCell id="${id}" value="${value}" style="endArrow=classic;html=1;" edge="1" parent="1"${ends}><mxGeometry relative="1" as="geometry"><mxPoint x="0" y="0" as="sourcePoint" /><mxPoint x="10" y="10" as="targetPoint" /></mxGeometry></mxCell>`;
}

/** Page (la fixture par défaut), et une fonction qui applique une opération du mode puis relit la page. */
export function setup(xml = fixture('states.drawio')) {
  const { document, tree } = readDrawio(xml);
  let page = document.pages[0]!;
  const run = (operation: (edit: ModeEdit) => void): boolean => {
    page = documentFromTree(tree).pages[0]!;
    const changed = applyModeEdit(page, tree.pages[0]!, STATES_KEYS, operation);
    page = documentFromTree(tree).pages[0]!;
    return changed;
  };
  const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
  return { run, page: () => page, shape, tree };
}
