import { describe, expect, it } from 'vitest';
import { definition as storming } from '../../../../../../src/engine/plugins/modes/eventstorming';
import {
  GROUP_PART,
  GROUP_PARTS as parts,
  GROUP_PROPERTY as property,
  groupTitleStyle,
  setGroupLabel,
  TITLE_LEFT,
  TITLE_TEXT,
} from '../../../../../../src/engine/plugins/modes/eventstorming/groups/groupLabels';
import { setup, sticky, stormingXml } from '../helpers';

const label = (name: string) => `spatial.es.group=${name};`;

describe('mode Event storming : libellé des groupes (sujet 514)', () => {
  it('écrit sur tous les post-it du groupe, même verrouillés ; « Group label » ou vide le retire', () => {
    const { run, shape } = setup(
      stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'command', 160, 0, '', 160, 160, 'locked=1;')),
    );
    run((edit) => setGroupLabel(edit, 'a', ' Paiement '));
    expect(shape('a').style['spatial.es.group']).toBe('Paiement');
    expect(shape('b').style['spatial.es.group']).toBe('Paiement');
    run((edit) => setGroupLabel(edit, 'b', 'Group label'));
    expect(shape('a').style['spatial.es.group']).toBeUndefined();
    run((edit) => setGroupLabel(edit, 'a', 'X'));
    run((edit) => setGroupLabel(edit, 'a', ''));
    expect(shape('b').style['spatial.es.group']).toBeUndefined();
  });

  it('post-it posé contre un groupe : il en prend le libellé', () => {
    const { run, shape } = setup(
      stormingXml(
        sticky('a', 'event', 0, 0, '', 160, 160, label('Paiement')) +
          sticky('b', 'command', 160, 0, '', 160, 160, label('Paiement')) +
          sticky('new', 'policy', -160, 0),
      ),
    );
    run((edit) => storming.gestures!.placed!(edit, ['new']));
    expect(shape('new').style['spatial.es.group']).toBe('Paiement');
  });

  it('fusion : le groupe sur lequel on pose garde son libellé, le groupe apporté le prend', () => {
    const { run, shape } = setup(
      stormingXml(
        sticky('a', 'event', 0, 0, '', 160, 160, label('Arrivée')) +
          sticky('b', 'command', 160, 0, '', 160, 160, label('Arrivée')) +
          sticky('c', 'policy', 0, 160, '', 160, 160, label('Apporté')) +
          sticky('d', 'query', 160, 160, '', 160, 160, label('Apporté')),
      ),
    );
    run((edit) => storming.gestures!.placed!(edit, ['c', 'd']));
    expect(['a', 'b', 'c', 'd'].map((id) => shape(id).style['spatial.es.group'])).toEqual([
      'Arrivée',
      'Arrivée',
      'Arrivée',
      'Arrivée',
    ]);
  });

  it('groupe sans libellé rejoint par un post-it nommé : il garde le nom apporté', () => {
    const { run, shape } = setup(
      stormingXml(sticky('a', 'event', 0, 0) + sticky('new', 'command', 160, 0, '', 160, 160, label('Relance'))),
    );
    run((edit) => storming.gestures!.placed!(edit, ['new']));
    expect(shape('a').style['spatial.es.group']).toBe('Relance');
  });

  it('groupe coupé, post-it isolé : les libellés restent', () => {
    const { run, shape } = setup(
      stormingXml(
        sticky('a', 'event', 0, 0, '', 160, 160, label('Paiement')) +
          sticky('alone', 'command', 400, 0, '', 160, 160, label('Paiement')),
      ),
    );
    run((edit) => storming.gestures!.placed!(edit, ['alone']));
    expect(shape('a').style['spatial.es.group']).toBe('Paiement');
    expect(shape('alone').style['spatial.es.group']).toBe('Paiement');
  });

  it('habillage : seul le premier post-it du groupe reçoit le titre et le bord gauche', () => {
    const { page, shape } = setup(
      stormingXml(
        sticky('low', 'event', -40, 100) + sticky('high', 'command', 120, 0) + sticky('alone', 'actor', 600, 0),
      ),
    );
    const style = groupTitleStyle(page());
    expect(style(shape('high'))).toEqual({ [TITLE_TEXT]: 'Group label', [TITLE_LEFT]: '-40' });
    expect(style(shape('low'))).toBeUndefined();
    expect(style(shape('alone'))).toBeUndefined();
  });

  it('double-clic sur le titre : partie du premier post-it, son texte s’écrit sur le groupe', () => {
    const { run, page, shape } = setup(stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'command', 160, 0)));
    expect(parts.outsideTextAt!(page(), { x: 300, y: -20 })).toEqual({ shapeId: 'a', part: GROUP_PART });
    expect(parts.outsideTextAt!(page(), { x: 300, y: -60 })).toBeUndefined();
    expect(parts.text!(page(), shape('a'), GROUP_PART)?.text).toBe('Group label');
    expect(parts.text!(page(), shape('b'), GROUP_PART)).toBeUndefined();
    run((edit) => parts.setText!(edit, shape('a'), GROUP_PART, 'Paiement'));
    expect(shape('b').style['spatial.es.group']).toBe('Paiement');
  });

  it('champ « Groupe » : montré pour un post-it d’un groupe seulement', () => {
    const { page, shape } = setup(
      stormingXml(sticky('a', 'event', 0, 0) + sticky('b', 'command', 160, 0) + sticky('alone', 'actor', 600, 0)),
    );
    expect(property.hidden!(page(), shape('a'))).toBe(false);
    expect(property.hidden!(page(), shape('alone'))).toBe(true);
    expect(property.value!(page(), shape('b'))).toBe('Group label');
  });
});
