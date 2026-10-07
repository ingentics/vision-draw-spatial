import { describe, expect, it } from 'vitest';
import { DecodeError, decodeDiagram, encodeDiagram } from '../../../../src/engine/core/format/decode';

// Produit par zlib (Python) : deflate raw de encodeURIComponent('<mxGraphModel><root/></mxGraphModel>').
const KNOWN = 'UzV2zq1wL0osyPDNT0nNUTV2VTV2LsrPL1E1coNwgAw0FQA=';

describe('decodeDiagram', () => {
  it('décode un contenu compressé par une autre implémentation', () => {
    expect(decodeDiagram(KNOWN)).toBe('<mxGraphModel><root/></mxGraphModel>');
  });

  it('renvoie le XML en clair tel quel', () => {
    expect(decodeDiagram('  <mxGraphModel/>\n')).toBe('<mxGraphModel/>');
  });

  it('chaîne vide → vide', () => {
    expect(decodeDiagram('   ')).toBe('');
  });

  it('aller-retour avec encodeDiagram, y compris unicode', () => {
    const xml = '<mxGraphModel><root><mxCell id="é€🚀" value="a &amp; b %20"/></root></mxGraphModel>';
    expect(decodeDiagram(encodeDiagram(xml))).toBe(xml);
  });

  it('ignore les blancs dans le base64', () => {
    const wrapped = KNOWN.replace(/(.{10})/g, '$1\n  ');
    expect(decodeDiagram(wrapped)).toBe('<mxGraphModel><root/></mxGraphModel>');
  });

  it('lève DecodeError sur un contenu invalide', () => {
    expect(() => decodeDiagram('pas du base64 !!!')).toThrow(DecodeError);
    expect(() => decodeDiagram(KNOWN.slice(0, 12))).toThrow(DecodeError);
  });
});
