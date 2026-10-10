import { describe, expect, it } from 'vitest';
import { EdgeArrangement } from '../../../../../../src/engine/core/domains/edit/edges/arrangement';
import type { EngineCore } from '../../../../../../src/engine/core/domains/EngineCore';
import { edgeLinesOf, edgeLinesOfEdge } from '../../../../../../src/engine/core/edit/anchoring/mode';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import { writeDrawio } from '../../../../../../src/engine/core/format/write';
import type { PageModel } from '../../../../../../src/engine/core/model/types';
import { liveCore } from '../commands/liveCore';

const XML = `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
</root></mxGraphModel></diagram></mxfile>`;

const shapes = { edgeLineStyle: 'rounded', edgeAnchoring: 'manual' };
const arrangement = new EdgeArrangement({ settings: { shapes } } as unknown as EngineCore);
const page = (attributes: Record<string, string>) => ({ attributes }) as unknown as PageModel;

describe('tracé des flèches par page (sujet 441)', () => {
  it('tracés permis par ancrage : tous en manuel et en automatique (sujet 456), la droite seule en Typon', () => {
    expect(edgeLinesOf('manual')).toEqual(['straight', 'sharp', 'rounded', 'curved']);
    expect(edgeLinesOf('auto')).toEqual(['rounded', 'sharp', 'curved', 'straight']);
    expect(edgeLinesOf('pcb')).toEqual(['straight']);
  });

  it('le tracé d’une flèche seule ne se choisit qu’en manuel (sujet 456)', () => {
    expect(edgeLinesOfEdge('manual')).toEqual(edgeLinesOf('manual'));
    expect(edgeLinesOfEdge('auto')).toEqual([]);
    expect(edgeLinesOfEdge('pcb')).toEqual([]);
  });

  it('tracé de la page, sinon celui de l’appli ; une valeur inconnue suit l’appli', () => {
    expect(arrangement.edgeLineOf(page({}))).toBe('rounded');
    expect(arrangement.edgeLineOf(page({ 'spatial.edgeLine': 'curved' }))).toBe('curved');
    expect(arrangement.edgeLineOf(page({ 'spatial.edgeLine': 'zigzag' }))).toBe('rounded');
  });

  it('en automatique, le tracé de la page, sinon celui de l’appli (sujet 456)', () => {
    expect(arrangement.edgeLineOf(page({ 'spatial.anchoring': 'auto', 'spatial.edgeLine': 'curved' }))).toBe('curved');
    expect(arrangement.edgeLineOf(page({ 'spatial.anchoring': 'auto', 'spatial.edgeLine': 'straight' }))).toBe(
      'straight',
    );
    expect(arrangement.edgeLineOf(page({ 'spatial.anchoring': 'auto' }))).toBe('rounded');
  });

  it('en Typon, le tracé voulu non permis cède la place à la droite', () => {
    expect(arrangement.edgeLineOf(page({ 'spatial.anchoring': 'pcb', 'spatial.edgeLine': 'curved' }))).toBe('straight');
    expect(arrangement.edgeLineOf(page({ 'spatial.anchoring': 'pcb' }))).toBe('straight');
  });

  it('écrit puis retire l’attribut de la page, une étape d’annulation par changement', () => {
    const { core, reread, undoSteps } = liveCore(XML);
    // Modèle relu du fichier sans le reste de `documentChanged` (sélection, ancrage), absent de ce cœur réduit.
    const changed: string[][] = [];
    core.file.documentChanged = (pageIds) => {
      changed.push(pageIds);
      const { document, tree } = readDrawio(writeDrawio(core.file.xmlTree!));
      core.file.replaceDocument(document, tree);
    };
    Object.assign(core, {
      settings: { shapes },
      targets: {
        editablePageById: () => ({
          page: core.file.document!.pages[0]!,
          pageTree: core.file.xmlTree!.pages[0]!,
          xmlTree: core.file.xmlTree!,
        }),
      },
    });
    const edges = new EdgeArrangement(core);
    edges.setPageEdgeLine('p', 'sharp');
    expect(reread().attributes['spatial.edgeLine']).toBe('sharp');
    edges.setPageEdgeLine('p', undefined);
    expect(reread().attributes['spatial.edgeLine']).toBeUndefined();
    expect(changed).toEqual([['p'], ['p']]);
    expect(undoSteps()).toHaveLength(2);
  });
});
