import { describe, expect, it } from 'vitest';
import type { PageModel as PluginPage } from '../../../../src/engine/core/plugins';

describe('modèle en lecture seule pour les plugins (sujet 303)', () => {
  it('modèle en lecture seule pour les plugins : le modifier ne compile pas', () => {
    // Vérifié par le typage (`make check`) : chaque ligne marquée est refusée par TypeScript.
    const tryToWrite = (page: PluginPage) => {
      // @ts-expect-error : la liste des formes est en lecture seule.
      page.shapes.push(page.shapes[0]!);
      // @ts-expect-error : les attributs de la page sont en lecture seule.
      page.attributes['spatial.mode'] = 'autre';
      // @ts-expect-error : le style d'une forme est en lecture seule.
      page.shapes[0]!.style.fillColor = '#ff0000';
      // @ts-expect-error : les bornes d'une forme sont en lecture seule.
      page.shapes[0]!.bounds.x = 10;
    };
    expect(typeof tryToWrite).toBe('function');
  });
});
