import { describe, expect, it } from 'vitest';
import type { EngineCore } from '../../../../../src/engine/core/domains/EngineCore';
import { Selections } from '../../../../../src/engine/core/domains/selection/selection';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import type { PickedElement } from '../../../../../src/engine/core/interaction/pick';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="g" value="" style="group" vertex="1" parent="1"><mxGeometry x="0" y="0" width="200" height="100" as="geometry"/></mxCell>
<mxCell id="c" value="C" vertex="1" parent="g"><mxGeometry x="10" y="10" width="50" height="30" as="geometry"/></mxCell>
<mxCell id="a" value="A" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="b" value="B" vertex="1" parent="1"><mxGeometry x="320" y="20" width="40" height="20" as="geometry"/></mxCell>
<mxCell id="x" value="X" vertex="1" parent="1"><mxGeometry x="600" y="0" width="100" height="60" as="geometry"/></mxCell>
<mxCell id="ab" edge="1" source="a" target="b" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
<mxCell id="ax" edge="1" source="a" target="x" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

/** Contenu de la sélection `ids` ; le mode de la page emporte `b` avec `a` (comme le contenu d'une région RDD). */
function content(ids: string[], modeCarries: boolean) {
  const page = readDrawio(XML).document.pages[0]!;
  const core = {
    pageModes: {
      carried: (_page: unknown, roots: string[]) => (modeCarries && roots.includes('a') ? ['b'] : []),
      hasCarries: () => modeCarries,
    },
  } as unknown as EngineCore;
  const items: PickedElement[] = ids.map((id) => {
    const shape = page.shapes.find((s) => s.id === id);
    return shape ? { type: 'shape', element: shape } : { type: 'edge', element: page.edges.find((e) => e.id === id)! };
  });
  return [...new Selections(core).withContent(page, items)].sort();
}

describe('éléments sélectionnés avec leur contenu (sujet 431)', () => {
  it('un groupe emporte ses enfants ; une flèche sélectionnée est gardée', () => {
    expect(content(['g', 'ax'], false)).toEqual(['ax', 'c', 'g']);
  });

  it('formes emportées par le mode, et les flèches entre elles seulement', () => {
    expect(content(['a'], true)).toEqual(['a', 'ab', 'b']);
  });

  it('sans mode qui emporte : la forme seule', () => {
    expect(content(['a'], false)).toEqual(['a']);
  });
});
