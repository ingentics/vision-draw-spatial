import { describe, expect, it } from 'vitest';
import {
  EDGE_LINE_STYLES,
  edgeLinePatch,
  pageAnchoring,
  pageEdgeLine,
  withEdgeLine,
} from '../../../../../src/engine/core/edit/anchoring/mode';
import type { PageModel } from '../../../../../src/engine/core/model/types';

const page = (attributes: Record<string, string>) => ({ attributes }) as unknown as PageModel;

describe('tracé d’une flèche en un seul endroit (sujet 447)', () => {
  it('flèche créée : clés du tracé ajoutées à la fin, la droite sans routeur', () => {
    const base = 'orthogonalLoop=1;html=1;';
    expect(withEdgeLine(base, 'straight')).toBe(base);
    expect(withEdgeLine(base, 'sharp')).toBe(`${base}edgeStyle=orthogonalEdgeStyle;rounded=0;`);
    expect(withEdgeLine(base, 'rounded')).toBe(`${base}edgeStyle=orthogonalEdgeStyle;rounded=1;`);
    expect(withEdgeLine(base, 'curved')).toBe(`${base}edgeStyle=orthogonalEdgeStyle;rounded=0;curved=1;`);
  });

  it('flèche existante : une flèche à coudes garde son routeur, une droite prend l’orthogonal', () => {
    expect(edgeLinePatch('curved', false)).toEqual({ rounded: '0', curved: '1' });
    expect(edgeLinePatch('curved', true)).toEqual(EDGE_LINE_STYLES.curved);
    expect(edgeLinePatch('straight', false)).toEqual(EDGE_LINE_STYLES.straight);
  });

  it('ancrage et tracé de la page : les siens, sinon ceux de l’appli, le tracé borné par l’ancrage', () => {
    expect(pageAnchoring(page({ 'spatial.anchoring': 'pcb' }), 'manual')).toBe('pcb');
    expect(pageAnchoring(page({ 'spatial.anchoring': 'x' }), 'auto')).toBe('auto');
    expect(pageEdgeLine(page({ 'spatial.edgeLine': 'curved' }), 'manual', 'rounded')).toBe('curved');
    expect(pageEdgeLine(page({}), 'manual', 'sharp')).toBe('sharp');
    expect(pageEdgeLine(page({ 'spatial.edgeLine': 'curved' }), 'pcb', 'sharp')).toBe('straight');
  });
});
