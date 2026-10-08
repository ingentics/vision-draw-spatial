import { describe, expect, it } from 'vitest';
import { setEdgeTerminal } from '../../../../../../../../src/engine/core/format/cellEdits';
import { addEdgeCell, removeCellsDeep } from '../../../../../../../../src/engine/core/format/create';
import { documentFromTree, readDrawio } from '../../../../../../../../src/engine/core/format/parse';
import { applyModeEdit } from '../../../../../../../../src/engine/core/modes/modeEdits';
import type { ModeEdit } from '../../../../../../../../src/engine/core/modes/types';
import { definition as rdd } from '../../../../../../../../src/engine/plugins/modes/rdd';
import { fieldParts } from '../../../../../../../../src/engine/plugins/modes/rdd/editing/fieldParts';
import { RELATION_PROPERTIES, forbiddenLinks } from '../../../../../../../../src/engine/plugins/modes/rdd/relations';
import { documentRelation } from '../../../../../../../../src/engine/plugins/modes/rdd/relations/kinds/document';
import { removeField, setField } from '../../../../../../../../src/engine/plugins/modes/rdd/tables/operations';
import { tableFields } from '../../../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import type { Field } from '../../../../../../../../src/engine/plugins/modes/rdd/tables/fieldModel';
import { RDD_KEYS } from '../../../../../../../../src/engine/plugins/modes/rdd/keys';
import { fixture } from '../../../../../../../helpers';

/**
 * Relation document → champ dynamique (sujet 269). Fixture : `settings` et `unnamed` (documents), `user` (entité :
 * `id`, `email`, `role`, x 40 à 200, y 160, 86 de haut), `role` (énumération), `address` (embedded), `orphan`.
 */
function setup() {
  const { tree } = readDrawio(fixture('rdd.drawio'));
  const pageTree = tree.pages[0]!;
  const page = () => documentFromTree(tree).pages[0]!;
  const run = (operation: (edit: ModeEdit) => void) => applyModeEdit(page(), pageTree, RDD_KEYS, operation);
  const shape = (id: string) => page().shapes.find((s) => s.id === id)!;
  const edge = (id: string) => page().edges.find((e) => e.id === id);
  const fields = (id: string) => tableFields(shape(id)) as Field[];
  /** Champ `index` de la table rendu « Dynamique ». */
  const dynamic = (table: string, index: number) =>
    run((edit) => setField(edit, shape(table), index, { type: 'dynamic' }));
  /** Flèche tirée d'un document vers la partie `part` d'une table (comme `ConnectDrags.commit`). */
  const connect = (source: string, target: string, part?: string) => {
    const id = addEdgeCell(pageTree, { source, target, style: '' });
    run((edit) => rdd.edges!.created!(edit, id, undefined, part));
    return id;
  };
  return { pageTree, page, run, shape, edge, fields, dynamic, connect };
}

describe('mode RDD : relation document → champ dynamique (sujet 269)', () => {
  it('permise vers la ligne d’un champ « Dynamique » d’une entité, d’un embedded ou d’une énumération, seulement', () => {
    const { page, shape, dynamic } = setup();
    const connects = (source: string, target: string, part?: string) =>
      rdd.edges!.connects!(page(), shape(source), shape(target), part);
    expect(connects('settings', 'user', '1')).toBe(false);
    dynamic('user', 1);
    dynamic('role', 2);
    dynamic('address', 0);
    expect(connects('settings', 'user', '1')).toBe(true);
    expect(connects('settings', 'role', '2')).toBe(true);
    expect(connects('settings', 'address', '0')).toBe(true);
    // L'entête, un autre champ, une table sans champ dynamique, ou dans l'autre sens : non.
    expect(connects('settings', 'user')).toBe(false);
    expect(connects('settings', 'user', '2')).toBe(false);
    expect(connects('settings', 'active', '0')).toBe(false);
    expect(connects('user', 'settings')).toBe(false);
    expect(connects('settings', 'unnamed')).toBe(false);
  });

  it('tirée : retenue par le champ, aucun champ créé ; tirets sans pointe ni texte ; arrive au milieu de la ligne', () => {
    const { shape, edge, fields, dynamic, connect } = setup();
    dynamic('user', 1);
    const id = connect('settings', 'user', '1');
    expect(fields('user').map((f) => f.label)).toEqual(['id', 'email', 'role']);
    expect(fields('user')[1]!.incoming).toEqual([id]);
    expect(edge(id)!.style).toMatchObject({ dashed: '1', startArrow: 'none', endArrow: 'none' });
    expect(edge(id)!.labels).toEqual([]);
    // Document à droite de User : côté droit, ligne `email` (206 à 226), au milieu : (216 - 160) / 86.
    expect(edge(id)!.style).toMatchObject({ entryX: '1', entryY: String(Math.round((56 / 86) * 1000) / 1000) });
    expect(edge(id)!.style.entryPerimeter).toBe('0');
    expect(shape('settings').style['spatial.rdd.fields']).toBeDefined();
  });

  it('son point d’arrivée est placé par le mode, pas réparti en ancrage automatique (sujet 338)', () => {
    const { page, dynamic, connect } = setup();
    dynamic('user', 1);
    const id = connect('settings', 'user', '1');
    expect(rdd.edges!.placedEntries!(page())).toEqual([id]);
  });

  it('pas de section « Relation » au panneau ; gérée par le mode', () => {
    const { page, edge, dynamic, connect } = setup();
    dynamic('user', 1);
    const id = connect('settings', 'user', '1');
    expect(RELATION_PROPERTIES.filter((p) => !p.hidden!(page(), edge(id)!))).toEqual([]);
    expect(rdd.edges!.manages!(page(), edge(id)!)).toBe(true);
    expect(documentRelation.properties).toBeUndefined();
  });

  it('plusieurs documents sur un même champ ; le champ déplacé, la flèche le suit', () => {
    const { run, shape, edge, fields, dynamic, connect } = setup();
    dynamic('user', 1);
    const first = connect('settings', 'user', '1');
    const second = connect('unnamed', 'user', '1');
    expect(fields('user')[1]!.incoming).toEqual([first, second]);
    run((edit) => fieldParts.move!(edit, shape('user'), '1', '3'));
    expect(fields('user')[2]!.incoming).toEqual([first, second]);
    // Ligne `email` maintenant 226 à 246 : milieu à 236.
    expect(edge(first)!.style.entryY).toBe(String(Math.round((76 / 86) * 1000) / 1000));
  });

  it('le champ cesse d’être « Dynamique » ou est supprimé : ses flèches sont supprimées', () => {
    const { run, shape, edge, fields, dynamic, connect } = setup();
    dynamic('user', 1);
    dynamic('user', 2);
    const typed = connect('settings', 'user', '1');
    const removed = connect('settings', 'user', '2');
    // Un autre réglage du champ garde la flèche.
    run((edit) => setField(edit, shape('user'), 1, { comment: 'x' }));
    expect(edge(typed)).toBeDefined();
    run((edit) => setField(edit, shape('user'), 1, { type: 'string' }));
    expect(edge(typed)).toBeUndefined();
    expect(fields('user')[1]!.incoming).toBeUndefined();
    run((edit) => removeField(edit, shape('user'), 2));
    expect(edge(removed)).toBeUndefined();
  });

  it('rebranchée vers un autre champ : il la retient ; flèche supprimée : son champ l’oublie', () => {
    const { pageTree, run, fields, dynamic, connect } = setup();
    dynamic('user', 1);
    dynamic('role', 2);
    const id = connect('settings', 'user', '1');
    setEdgeTerminal(pageTree, id, 'target', { cellId: 'role' });
    run((edit) => rdd.edges!.reconnected!(edit, id, '2'));
    expect(fields('user')[1]!.incoming).toBeUndefined();
    expect(fields('role')[2]!.incoming).toEqual([id]);
    removeCellsDeep(pageTree, [id]);
    run((edit) => rdd.lifecycle!.removed!(edit));
    expect(fields('role')[2]!.incoming).toBeUndefined();
  });

  it('une flèche d’un document qui n’arrive pas sur un champ dynamique n’est pas une relation : signalée', () => {
    const { pageTree, page } = setup();
    const id = addEdgeCell(pageTree, { source: 'settings', target: 'user', style: '' });
    expect(forbiddenLinks(page()).map((link) => link.edgeId)).toEqual([id]);
    expect(rdd.edges!.manages!(page(), page().edges[0]!)).toBe(false);
  });
});

describe('mode RDD : fixture des documents (sujet 269)', () => {
  it('à l’ouverture : la flèche reste sur `settings`, le document à clés prend un corps ; YAML invalide signalé', () => {
    const { tree } = readDrawio(fixture('rdd-document.drawio'));
    const page = () => documentFromTree(tree).pages[0]!;
    applyModeEdit(page(), tree.pages[0]!, RDD_KEYS, (edit) => rdd.lifecycle!.opened!(edit));
    const edge = page().edges.find((e) => e.id === 'prefs-profile')!;
    expect(edge.style).toMatchObject({ entryX: '0', entryY: '0.651', entryPerimeter: '0', dashed: '1' });
    expect(forbiddenLinks(page())).toEqual([]);
    const legacy = page().shapes.find((s) => s.id === 'legacy')!;
    expect(legacy.style['spatial.rdd.body']).toBe('"color:\\nsize:"');
    expect(rdd.lifecycle!.check!(page()).map((issue) => issue.cellId)).toEqual(['broken']);
  });
});
