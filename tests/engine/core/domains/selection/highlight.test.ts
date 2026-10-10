import { describe, expect, it } from 'vitest';
import { SelectionHighlight } from '../../../../../src/engine/core/domains/selection/highlight';
import type { PickedElement } from '../../../../../src/engine/core/interaction/pick';
import type { PageModeDefinition } from '../../../../../src/engine/core/modes/types';
import type { SelectionStyle } from '../../../../../src/engine/core/settings/types';
import { fail, setup } from '../modes/modesCore';

/**
 * Style de mise en valeur d'un élément de la page « boom » (sujet 427) : le mode y répond par `edges.selectionStyle`,
 * le paramètre `selection.style` vaut `veil` ; `size` : nombre d'éléments sélectionnés.
 */
function styleOf(edges: PageModeDefinition['edges'], picked: 'e' | 'a', size = 1) {
  const { core, page, guard } = setup({ id: 'boom', namespace: 'boom', name: 'Boom', edges });
  const item: PickedElement =
    picked === 'e' ? { type: 'edge', element: page.edges[0]! } : { type: 'shape', element: page.shapes[0]! };
  Object.assign(core, {
    pages: { getCurrentPage: () => page },
    selection: { current: { pageId: page.id, items: Array.from({ length: size }, () => item) } },
    registry: { selectionStyle: () => undefined },
    settings: { ...core.settings, selection: { ...core.settings.selection, style: 'veil' } },
  });
  const highlight = new SelectionHighlight(core) as unknown as { itemStyle(item: PickedElement): SelectionStyle };
  return { style: highlight.itemStyle(item), warnings: guard.warnings().map((w) => w.message) };
}

describe('mise en valeur d’une flèche imposée par le mode (sujet 427)', () => {
  it('le mode impose le contour d’une flèche, selon la taille de la sélection', () => {
    const edges = {
      selectionStyle: (_p: unknown, _e: unknown, size: number) => (size > 1 ? 'veil' : 'outline'),
    } as const;
    expect(styleOf(edges, 'e').style).toBe('outline');
    expect(styleOf(edges, 'e', 2).style).toBe('veil');
  });

  it('sans réponse, sans le point d’entrée ou pour une forme : le paramètre', () => {
    expect(styleOf({ selectionStyle: () => undefined }, 'e').style).toBe('veil');
    expect(styleOf({}, 'e').style).toBe('veil');
    expect(styleOf({ selectionStyle: () => 'outline' }, 'a').style).toBe('veil');
  });

  it('mode en panne : le paramètre, panne signalée', () => {
    const { style, warnings } = styleOf({ selectionStyle: fail }, 'e');
    expect(style).toBe('veil');
    expect(warnings).toEqual(['Mode boom : erreur dans edges.selectionStyle (panne)']);
  });
});
