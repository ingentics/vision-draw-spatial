import { describe, expect, it } from 'vitest';
import { DocumentFile } from '../../../../../src/engine/core/domains/document/file';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import type { PageModel } from '../../../../../src/engine/core/model/types';
import { createDefaultRegistry } from '../../../../../src/engine/plugins';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram>
<diagram id="q" name="Q"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>`;

/** Document chargé sur un cœur réduit ; `rebound` : pages sur lesquelles la sélection a été reprise. */
function setup() {
  const rebound: PageModel[] = [];
  const core = {
    registry: createDefaultRegistry(),
    pageModes: { withModeWarnings: (document: unknown) => document },
    selection: { rebind: (page: PageModel) => rebound.push(page) },
  } as unknown as EngineCore;
  const file = new DocumentFile(core);
  const { document, tree } = readDrawio(XML);
  file.replaceDocument(document, tree);
  const page = (id = 'p') => file.document!.pages.find((p) => p.id === id)!;
  return { file, page, rebound };
}

describe('copie de travail d’un geste (sujet 312)', () => {
  it('pages du document gelées en dev et en test : on ne les modifie pas en place', () => {
    const { page } = setup();
    expect(Object.isFrozen(page())).toBe(true);
    expect(() => {
      (page().shapes[0]!.bounds as { x: number }).x = 10;
    }).toThrow(TypeError);
  });

  it('pendant un geste, la page est une copie modifiable ; à la fin, elle devient la page du document, gelée', () => {
    const { file, page, rebound } = setup();
    const original = page();
    const owner = {};
    const live = file.livePage('p', owner)!;
    expect(live).not.toBe(original);
    expect(page()).toBe(live);
    expect(rebound).toEqual([live]);
    live.shapes[0]!.bounds = { ...live.shapes[0]!.bounds, x: 30 };
    // Même copie tant que le geste dure ; l'original n'a pas bougé.
    expect(file.livePage('p', owner)).toBe(live);
    expect(original.shapes[0]!.bounds.x).toBe(0);
    file.settleLivePage(owner);
    expect(page()).toBe(live);
    expect(Object.isFrozen(live)).toBe(true);
    expect(page().shapes[0]!.bounds.x).toBe(30);
  });

  it('copie partagée par deux détenteurs : close quand le dernier la rend', () => {
    const { file, page } = setup();
    const [drag, text] = [{}, {}];
    const live = file.livePage('p', text)!;
    expect(file.livePage('p', drag)).toBe(live);
    file.settleLivePage(drag);
    expect(Object.isFrozen(page())).toBe(false);
    file.settleLivePage(text);
    expect(Object.isFrozen(page())).toBe(true);
  });

  it('copie d’une autre page : la première est d’abord close ; une relecture abandonne la copie', () => {
    const { file, page } = setup();
    const owner = {};
    const first = file.livePage('p', owner)!;
    file.livePage('q', owner);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(page('q'))).toBe(false);
    const { document, tree } = readDrawio(XML);
    file.replaceDocument(document, tree);
    expect(Object.isFrozen(page('q'))).toBe(true);
    expect(file.livePage('inconnue', owner)).toBeUndefined();
  });
});
