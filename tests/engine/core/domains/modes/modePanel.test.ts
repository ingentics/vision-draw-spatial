import { describe, expect, it } from 'vitest';
import { setup } from './modesCore';

describe('hôte des appels aux modes (sujet 288)', () => {
  it('réglages déclarés évalués pour le panneau (sujet 294) : un point d’entrée en panne est traité comme absent', () => {
    const { panel, guard, page } = setup();
    const edge = page.edges[0]!;
    const views = panel.propertyViews(page, 'edge', edge);
    expect(views.map((view) => [view.property.key, view.value, view.readOnly, view.options])).toEqual([
      ['ok', 'calculé', true, []],
      // Valeur de l'attribut, modifiable, sans choix.
      ['broken', 'x', false, []],
      ['hiddenBroken', undefined, false, []],
    ]);
    expect(guard.warnings().map((w) => w.message)).toEqual([
      'Mode boom : erreur dans réglage « broken » : value (panne)',
      'Mode boom : erreur dans réglage « broken » : readOnly (panne)',
      'Mode boom : erreur dans réglage « broken » : options (panne)',
      'Mode boom : erreur dans réglage « hiddenBroken » : hidden (panne)',
    ]);
  });
});
