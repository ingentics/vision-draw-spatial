import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Element, Node } from '@xmldom/xmldom';
import { describe, expect, it } from 'vitest';
import { decodeDiagram, isPlainXml } from '../../../src/engine/format/decode';
import { readDrawio } from '../../../src/engine/format/parse';
import { writeDrawio } from '../../../src/engine/format/write';
import { childElements, markPageDirty, parseXml } from '../../../src/engine/format/xmlTree';
import { fixture } from '../../helpers';

const FIXTURES = readdirSync(fileURLToPath(new URL('../../fixtures/', import.meta.url))).sort();

/**
 * Forme canonique d'un fichier draw.io, pour comparer « sémantiquement » : attributs triés,
 * blancs d'indentation et commentaires ignorés, pages compressées décompressées.
 */
function canonical(xml: string): unknown {
  return canonicalNode(parseXml(xml).documentElement!);
}

function canonicalNode(el: Element): unknown {
  const attributes: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes.item(i)!;
    attributes[attr.name] = attr.value;
  }
  const children: unknown[] = [];
  for (let node: Node | null = el.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === 1) children.push(canonicalNode(node as Element));
    else if ((node.nodeType === 3 || node.nodeType === 4) && node.nodeValue?.trim()) {
      children.push(canonicalText(el, node.nodeValue.trim()));
    }
  }
  return { tag: el.tagName, attributes: Object.fromEntries(Object.entries(attributes).sort()), children };
}

/** Le texte d'un `<diagram>` est une page compressée : on compare son contenu décodé. */
function canonicalText(parent: Element, text: string): unknown {
  if (parent.tagName !== 'diagram' || isPlainXml(text)) return text;
  try {
    return canonical(decodeDiagram(text));
  } catch {
    return text;
  }
}

describe('writeDrawio — aller-retour sans modification', () => {
  it.each(FIXTURES)('%s : XML sémantiquement identique, même modèle', (name) => {
    const xml = fixture(name);
    const { document, tree } = readDrawio(xml);
    const written = writeDrawio(tree);
    expect(canonical(written)).toEqual(canonical(xml));
    expect(readDrawio(written).document).toEqual(document);
  });

  it('recopie le texte des pages compressées et illisibles sans le réencoder', () => {
    for (const name of ['compressed.drawio', 'broken.drawio']) {
      const xml = fixture(name);
      const written = writeDrawio(readDrawio(xml).tree);
      const texts = (source: string) =>
        childElements(parseXml(source).documentElement!, 'diagram').map((d) => d.textContent?.trim());
      expect(texts(written)).toEqual(texts(xml));
    }
  });

  it('garde la déclaration XML, les attributs inconnus et les entités', () => {
    const written = writeDrawio(readDrawio(fixture('roundtrip.drawio')).tree);
    expect(written.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(written).toContain('spatial.custom="garder"');
    expect(written).toContain('spatial.camera="x=1;y=2"');
    expect(written).toContain('tooltip="Info&#10;sur deux lignes"');
    expect(written).toContain('<inconnu id="z1" attribut="libre"><enfant>texte</enfant></inconnu>');
  });
});

describe('readDrawio — correspondance id ↔ nœud', () => {
  it.each(FIXTURES)('%s : chaque élément du modèle a ses nœuds XML', (name) => {
    const { document, tree } = readDrawio(fixture(name));
    expect(tree.pages.map((p) => p.id)).toEqual(document.pages.map((p) => p.id));
    document.pages.forEach((page, index) => {
      const cells = tree.pages[index]!.cells;
      const ids = [
        ...page.layers.map((l) => l.id),
        ...page.shapes.map((s) => s.id),
        ...page.edges.flatMap((e) => [e.id, ...e.labels.map((l) => l.id)]),
      ];
      for (const id of ids) {
        const nodes = cells.get(id);
        expect(nodes, `${page.id}/${id}`).toBeDefined();
        if (!nodes!.generatedId) expect(nodes!.element.getAttribute('id')).toBe(id);
      }
    });
  });

  it('distingue enveloppe, cellule et géométrie', () => {
    const page = readDrawio(fixture('roundtrip.drawio')).tree.pages[0]!;
    const nodes = page.cells.get('u1')!;
    expect(nodes.wrapper?.tagName).toBe('UserObject');
    expect(nodes.cell?.tagName).toBe('mxCell');
    expect(nodes.geometry?.getAttribute('width')).toBe('160');
    expect(page.cells.get('z1')).toBeUndefined();
  });
});

describe('writeDrawio — modification en place', () => {
  it('page en clair : seul l’attribut modifié change', () => {
    const xml = fixture('simple.drawio');
    const { tree } = readDrawio(xml);
    const page = tree.pages[0]!;
    page.cells.get('r1')!.geometry!.setAttribute('x', '100');
    markPageDirty(page);
    const written = writeDrawio(tree);

    expect(written).toBe(
      xml
        .trimEnd()
        .replace('<mxGeometry x="40" y="40" width="120"', '<mxGeometry x="100" y="40" width="120"')
        .replace(/ \/>/g, '/>'),
    );
    const shape = readDrawio(written).document.pages[0]!.shapes.find((s) => s.id === 'r1')!;
    expect(shape.bounds.x).toBe(100);
  });

  it('page compressée : réécrite compressée, avec la modification', () => {
    const { tree } = readDrawio(fixture('compressed.drawio'));
    const page = tree.pages[0]!;
    page.cells.get('r1')!.geometry!.setAttribute('x', '100');
    markPageDirty(page);
    const written = writeDrawio(tree);

    const diagram = childElements(parseXml(written).documentElement!, 'diagram')[0]!;
    expect(childElements(diagram)).toHaveLength(0);
    expect(isPlainXml(diagram.textContent ?? '')).toBe(false);
    const shape = readDrawio(written).document.pages[0]!.shapes.find((s) => s.id === 'r1')!;
    expect(shape.bounds.x).toBe(100);
    expect(page.dirty).toBe(false);
  });

  it('refuse de marquer modifiée une page illisible', () => {
    const page = readDrawio(fixture('broken.drawio')).tree.pages[0]!;
    expect(page.encoding).toBe('unreadable');
    expect(() => markPageDirty(page)).toThrow();
  });
});
