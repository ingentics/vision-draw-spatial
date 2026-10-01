import { describe, expect, it } from 'vitest';
import { decodeEntities, htmlToText, resolvePlaceholders } from '../../../src/engine/format/label';

describe('htmlToText', () => {
  it('retire les balises et convertit <br> en saut de ligne', () => {
    expect(htmlToText('Service<br><b>B</b>')).toBe('Service\nB');
    expect(htmlToText('a<br/>b<BR />c')).toBe('a\nb\nc');
  });

  it('traite les blocs comme des lignes', () => {
    expect(htmlToText('Titre<div>Ligne 2</div><div>Ligne 3</div>')).toBe('Titre\nLigne 2\nLigne 3');
    expect(htmlToText('<p>un</p><p>deux</p>')).toBe('un\ndeux');
  });

  it('décode les entités et les espaces insécables', () => {
    expect(htmlToText('a&nbsp;&amp;&nbsp;b &lt;x&gt; &#233;&#x20AC;')).toBe('a & b <x> é€');
  });
});

describe('decodeEntities', () => {
  it('laisse les entités inconnues intactes', () => {
    expect(decodeEntities('&foo; &#xZZ;')).toBe('&foo; &#xZZ;');
  });
});

describe('resolvePlaceholders', () => {
  it('remplace les attributs connus, %% → %, inconnus laissés tels quels', () => {
    expect(resolvePlaceholders('%name% v%version% (100%%) %nope%', { name: 'Docs', version: '2' })).toBe(
      'Docs v2 (100%) %nope%',
    );
  });
});
