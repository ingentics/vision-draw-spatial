import { describe, expect, it } from 'vitest';
import { sameComment, withPartComment } from '../../../../src/engine/core/edit/comment';

describe('commentaire d’une partie survolée (sujet 262)', () => {
  const part = { title: 'email', text: 'Adresse de contact' };

  it('celui de la forme, avec celui de la partie à part ; texte vide sans commentaire de la forme', () => {
    expect(withPartComment({ text: 'Utilisateurs' }, part)).toEqual({ text: 'Utilisateurs', part });
    expect(withPartComment({ text: 'Utilisateurs', html: '<b>Utilisateurs</b>' }, part)).toEqual({
      text: 'Utilisateurs',
      html: '<b>Utilisateurs</b>',
      part,
    });
    expect(withPartComment(undefined, part)).toEqual({ text: '', part });
  });

  it('même commentaire : la partie compte aussi (l’encart change en passant d’un champ à l’autre)', () => {
    expect(sameComment(withPartComment(undefined, part), withPartComment(undefined, { ...part }))).toBe(true);
    expect(sameComment(withPartComment(undefined, part), withPartComment(undefined, { ...part, title: 'role' }))).toBe(
      false,
    );
    expect(sameComment({ text: 'a' }, withPartComment({ text: 'a' }, part))).toBe(false);
  });
});
