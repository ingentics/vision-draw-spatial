import { describe, expect, it } from 'vitest';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import { writeDrawio } from '../../../../../src/engine/core/format/write';
import { setup } from './modesCore';

/** Mode de test : en courant « b », le texte de la forme est tenu par la partie « titre » ; les textes notent le courant. */
const LAYERED: PageModeDefinition = {
  id: 'boom',
  namespace: 'boom',
  name: 'Boom',
  parts: {
    at: () => undefined,
    bounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    labelPart: (_page, _shape, current) => (current === 'b' ? 'titre' : undefined),
    text: (_page, _shape, part, current) => ({
      text: `${part}@${current}`,
      zone: { x: 0, y: 0, width: 1, height: 1 },
      fontSize: 1,
    }),
    setText: (edit, _shape, part, text, current) => edit.setPageAttribute('seen', `${part}:${text}@${current}`),
  },
};

function parts(current: string | undefined) {
  const set = setup(LAYERED);
  Object.assign(set.core, {
    modeCurrents: { getModeCurrent: () => current },
    pages: { ...set.core.pages, getCurrentPage: () => set.page },
  });
  return { ...set, parts: set.core.shapeParts };
}

describe('textes des parties et courant du mode (sujet 414)', () => {
  it('le texte de la forme est tenu par une partie selon le courant', () => {
    expect(parts('b').parts.labelPart(parts('b').page, parts('b').page.shapes[0]!)).toBe('titre');
    const { parts: other, page } = parts('a');
    expect(other.labelPart(page, page.shapes[0]!)).toBeUndefined();
  });

  it('texte, saisie validée : le courant est remis au mode', () => {
    const { parts: shapeParts, tree } = parts('b');
    expect(shapeParts.text('a', 'titre')?.text).toBe('titre@b');
    shapeParts.setText('a', 'titre', 'Nom');
    expect(writeDrawio(tree)).toContain('spatial.boom.seen="titre:Nom@b"');
  });
});
