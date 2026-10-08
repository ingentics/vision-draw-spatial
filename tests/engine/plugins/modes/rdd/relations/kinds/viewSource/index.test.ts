import { describe, expect, it } from 'vitest';
import { addEdgeCell } from '../../../../../../../../src/engine/core/format/create';
import { documentFromTree, readDrawio } from '../../../../../../../../src/engine/core/format/parse';
import { applyModeEdit } from '../../../../../../../../src/engine/core/modes/modeEditWriter';
import type { ModeEdit } from '../../../../../../../../src/engine/core/modes/modeEdit';
import { definition as rdd } from '../../../../../../../../src/engine/plugins/modes/rdd';
import { RELATION_PROPERTIES, forbiddenLinks } from '../../../../../../../../src/engine/plugins/modes/rdd/relations';
import { viewSourceRelation } from '../../../../../../../../src/engine/plugins/modes/rdd/relations/kinds/viewSource';
import { tableFields } from '../../../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import { RDD_KEYS } from '../../../../../../../../src/engine/plugins/modes/rdd/keys';
import { fixture } from '../../../../../../../helpers';

/** Relation source → vue (sujet 272). Fixture : `user` (entité), `role` (énumération), `settings` (document), `active` (vue). */
function setup() {
  const { tree } = readDrawio(fixture('rdd.drawio'));
  const pageTree = tree.pages[0]!;
  const page = () => documentFromTree(tree).pages[0]!;
  const run = (operation: (edit: ModeEdit) => void) => applyModeEdit(page(), pageTree, RDD_KEYS, operation);
  const shape = (id: string) => page().shapes.find((s) => s.id === id)!;
  const connect = (source: string, target: string) => {
    const id = addEdgeCell(pageTree, { source, target, style: '' });
    run((edit) => rdd.edges!.created!(edit, id, undefined));
    return id;
  };
  return { page, shape, connect };
}

describe('mode RDD : relation source → vue (sujet 272)', () => {
  it('permise d’une entité ou d’une vue vers une vue, jamais d’une vue vers elle-même ni vers autre chose', () => {
    const { page, shape } = setup();
    const connects = (source: string, target: string) => rdd.edges!.connects!(page(), shape(source), shape(target));
    expect(connects('user', 'active')).toBe(true);
    expect(connects('active', 'active')).toBe(false);
    expect(connects('active', 'user')).toBe(false);
    expect(connects('active', 'role')).toBe(false);
    expect(connects('settings', 'active')).toBe(false);
  });

  it('tirée : aucun champ créé, tirets, pointe simple côté vue, sans texte ni section « Relation »', () => {
    const { page, shape, connect } = setup();
    const before = tableFields(shape('active'));
    const id = connect('user', 'active');
    const edge = page().edges.find((e) => e.id === id)!;
    expect(tableFields(shape('active'))).toEqual(before);
    expect(edge.style).toMatchObject({ dashed: '1', startArrow: 'none', endArrow: 'open' });
    expect(edge.labels).toEqual([]);
    expect(rdd.edges!.manages!(page(), edge)).toBe(true);
    expect(RELATION_PROPERTIES.filter((p) => !p.hidden!(page(), edge))).toEqual([]);
    expect(viewSourceRelation.properties).toBeUndefined();
    expect(forbiddenLinks(page())).toEqual([]);
  });

  it('une flèche d’une vue vers une entité (fichier modifié) est signalée', () => {
    const { page, connect } = setup();
    const id = connect('active', 'user');
    expect(forbiddenLinks(page()).map((link) => link.edgeId)).toEqual([id]);
  });
});
