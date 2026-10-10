import { describe, expect, it } from 'vitest';
import { readWall } from '../../../../../src/engine/plugins/modes/eventstorming/export/wallRules';
import { STICKY_TYPES } from '../../../../../src/engine/plugins/modes/eventstorming/kinds';
import { sidesFor } from '../../../../../src/engine/plugins/modes/eventstorming/places/placesAround';
import { STICKY_RULES } from '../../../../../src/engine/plugins/modes/eventstorming/stickyRules';
import { setup, sticky, stormingXml } from './helpers';

/** Coin haut-gauche d'un post-it de 160 collé au côté `side` d'un post-it posé en (0, 0). */
const AT = { n: [0, -160], e: [160, 0], s: [0, 160], w: [-160, 0] } as const;

describe('mode Event storming : une seule grammaire pour les cases et la lecture du mur (sujet 520)', () => {
  it('chaque case proposée se lit (lien, empilement ou Hotspot), et aucun lien sans sa case', () => {
    for (const dragged of STICKY_TYPES) {
      for (const neighbor of STICKY_TYPES) {
        const offered = sidesFor(dragged, neighbor);
        for (const side of ['n', 'e', 's', 'w'] as const) {
          const [x, y] = AT[side];
          const { page } = setup(stormingXml(sticky('b', neighbor.key, 0, 0) + sticky('d', dragged.key, x, y)));
          const { links, warnings } = readWall(page());
          const read =
            links.length > 0 ||
            (dragged === neighbor && STICKY_RULES[dragged.key].stacks && (side === 'n' || side === 's')) ||
            // Intercalé : le lien traverse vers le post-it suivant, absent ici.
            (side === 'e' && STICKY_RULES[neighbor.key].through?.includes(dragged.key)) ||
            (side === 'w' && STICKY_RULES[dragged.key].through?.includes(neighbor.key));
          const pair = `${dragged.key} sur le côté ${side} de ${neighbor.key}`;
          expect(offered.includes(side) ? read : links.length === 0, pair).toBe(true);
          if (offered.includes(side))
            expect(
              warnings.map(({ code }) => code),
              pair,
            ).not.toContain('W1');
        }
      }
    }
  });
});
