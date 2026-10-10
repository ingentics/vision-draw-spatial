import { describe, expect, it } from 'vitest';
import { definition } from '../../../../../../src/engine/plugins/modes/eventstorming';
import { labelZone } from '../../../../../../src/engine/plugins/modes/eventstorming/shapes/common/stickyLayout';
import {
  STICKY_BADGE,
  stickyBadge,
  stickyBadgeRect,
} from '../../../../../../src/engine/plugins/modes/eventstorming/warnings/stickyBadge';
import {
  BADGE,
  BADGE_PART,
  badgeMessage,
  badgeOf,
  VALIDATION_PROPERTY,
} from '../../../../../../src/engine/plugins/modes/eventstorming/warnings/stickyWarnings';
import { setup, sticky, stormingXml } from '../helpers';

/** Page faite de ces post-it, et la pastille de chacun. */
function wall(cells: string) {
  const { page, shape } = setup(stormingXml(cells));
  return { page: page(), shape, badge: (id: string) => badgeOf(page(), shape(id)) };
}

describe('mode Event storming : pastilles des post-it (sujet 519)', () => {
  it('un post-it isolé porte la pastille « ! », qui disparaît une fois collé à sa suite', () => {
    expect(wall(sticky('c', 'command', 0, 0, 'Payer')).badge('c')).toBe('warning');
    const glued = wall(sticky('a', 'actor', 0, 0, 'Client') + sticky('c', 'command', 160, 0, 'Payer'));
    expect([glued.badge('a'), glued.badge('c')]).toEqual([undefined, undefined]);
  });

  it('message : le message court, ce qui est attendu et un exemple selon le type', () => {
    const { page, shape } = wall(sticky('c', 'command', 0, 0, 'Payer'));
    const message = badgeMessage(page, shape('c'))!;
    // Command isolée : W6 (sans déclencheur) et W7 (isolé).
    expect(message.title).toBe('2 avertissements');
    expect(message.text).toContain('• Commande sans déclencheur\n');
    expect(message.text).toContain('colle à sa gauche un Actor, une Policy ou un Domain Event');
    expect(message.text).toContain('Ex. : Actor «\u00a0Client\u00a0» → Command «\u00a0Payer\u00a0» → Domain Event');
  });

  it('un seul avertissement : son titre, cite l’autre post-it pour un contact sans règle (W1)', () => {
    // Actor collé à un System : aucune règle, W1 sur les deux (et rien d'autre sur l'Actor).
    const { page, shape } = wall(sticky('a', 'actor', 0, 0, 'Client') + sticky('s', 'system', 160, 0, 'ERP'));
    expect(badgeMessage(page, shape('a'))).toEqual({
      title: 'Contact sans règle avec System «\u00a0ERP\u00a0»',
      text: expect.stringContaining('Ex. : Actor «\u00a0Client\u00a0» → Command «\u00a0Passer commande\u00a0»'),
    });
  });

  it('exemple adapté au type du post-it : isolé (W7), contact sans règle (W1) ou chevauchement (W8)', () => {
    const types = ['event', 'command', 'constraint', 'system', 'policy', 'query', 'actor'];
    const examples = types.map((type) => {
      const { page, shape } = wall(sticky('p', type, 0, 0));
      const hint = badgeMessage(page, shape('p'))!
        .text.split('\n\n')
        .find((text) => text.includes('Post-it isolé'));
      return (hint ?? badgeMessage(page, shape('p'))!.text).split('Ex. : ')[1]!;
    });
    expect(new Set(examples).size).toBe(types.length);
    // Chaque exemple montre un post-it du type concerné.
    expect(
      examples.map((example, i) =>
        example.includes(
          `${['Domain Event', 'Command', 'Constraint', 'System', 'Policy', 'Query Model', 'Actor'][i]} «`,
        ),
      ),
    ).toEqual(types.map(() => true));
    const { page, shape } = wall(sticky('a', 'actor', 0, 0, 'Client') + sticky('s', 'system', 160, 0, 'ERP'));
    expect(badgeMessage(page, shape('a'))!.text).toContain('Un Actor se colle à gauche de la Command');
    expect(badgeMessage(page, shape('s'))!.text).toContain('Un System se colle');
    const hotspot = wall(sticky('h', 'hotspot', 0, 0) + sticky('c', 'command', 40, 40));
    expect(badgeMessage(hotspot.page, hotspot.shape('h'))!.text).toContain('Hotspot «\u00a0Règle floue\u00a0»');
  });

  it('pivot « Je ne sais pas » : pastille « ? » à la place de l’avertissement, message du pivot', () => {
    const { page, shape, badge } = wall(
      sticky('e', 'event', 0, 0, 'Commande annulée', 160, 160, 'spatial.es.pivot=unknown;spatial.es.pivotWho=unknown;'),
    );
    expect(badge('e')).toBe('question');
    const message = badgeMessage(page, shape('e'))!;
    expect(message.title).toBe('Pivot à décider');
    expect(message.text).toContain('Qui réagit à «\u00a0Commande annulée\u00a0» ?');
    expect(message.text).toContain('section « Pivot » du panneau');
  });

  it('« Activer la validation » : coché par défaut ; décoché, plus de « ! », le « ? » du pivot reste', () => {
    const cells =
      sticky('c', 'command', 0, 0, 'Payer') + sticky('e', 'event', 400, 0, '', 160, 160, 'spatial.es.pivot=unknown;');
    const { run, page, shape } = setup(stormingXml(cells));
    expect(VALIDATION_PROPERTY.value!(page(), page())).toBe('1');
    expect(badgeOf(page(), shape('c'))).toBe('warning');
    run((edit) => VALIDATION_PROPERTY.write!(edit, edit.page, undefined));
    expect(page().attributes['spatial.es.validation']).toBe('0');
    expect(VALIDATION_PROPERTY.value!(page(), page())).toBeUndefined();
    expect([badgeOf(page(), shape('c')), badgeOf(page(), shape('e'))]).toEqual([undefined, 'question']);
    run((edit) => VALIDATION_PROPERTY.write!(edit, edit.page, '1'));
    expect(page().attributes['spatial.es.validation']).toBeUndefined();
    expect(badgeOf(page(), shape('c'))).toBe('warning');
  });

  it('le mode habille le post-it de sa pastille, la survole et en donne le message', () => {
    const { page, shape } = wall(sticky('c', 'command', 100, 50, 'Payer'));
    const c = shape('c');
    expect(definition.dressing!(page, {}).shapeStyle!(c)).toEqual({ [BADGE]: 'warning' });
    const parts = definition.parts!;
    expect(parts.at(page, c, { x: 117, y: 67 })).toBe(BADGE_PART);
    expect(parts.at(page, c, { x: 180, y: 130 })).toBeUndefined();
    expect(parts.bounds(page, c, BADGE_PART)).toEqual({ x: 107, y: 57, width: 20, height: 20 });
    expect(parts.comment!(c, BADGE_PART, page)?.title).toBe('2 avertissements');
  });

  it('dessin : 20 × 20 à 7 des bords haut et gauche, le label commence après elle', () => {
    const bounds = { x: 100, y: 50, width: 160, height: 160 };
    expect(stickyBadgeRect(bounds)).toEqual({ x: 107, y: 57, width: 20, height: 20 });
    const zone = labelZone(bounds, undefined, 107 + STICKY_BADGE.size + STICKY_BADGE.gap);
    expect([zone.x, zone.x + zone.width]).toEqual([130, 252]);
    for (const kind of ['warning', 'question'] as const) {
      const badge = stickyBadge(kind, bounds);
      expect(badge.name).toBe(`sticky-badge:${kind}`);
      expect(badge.children.length).toBeGreaterThan(1);
    }
  });
});
