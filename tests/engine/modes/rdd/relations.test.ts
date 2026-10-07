import { describe, expect, it } from 'vitest';
import { setEdgeTerminal } from '../../../../src/engine/format/cellEdits';
import { addEdgeCell, removeCellsDeep } from '../../../../src/engine/format/create';
import { documentFromTree, readDrawio } from '../../../../src/engine/format/parse';
import { applyModeEdit } from '../../../../src/engine/modes/modeEdits';
import { definition as rdd } from '../../../../src/engine/modes/rdd';
import { fieldParts } from '../../../../src/engine/modes/rdd/fieldParts';
import { removeField, setField } from '../../../../src/engine/modes/rdd/operations';
import { forbiddenLinks, linksTables } from '../../../../src/engine/modes/rdd/relations';
import { tableFields } from '../../../../src/engine/modes/rdd/tables';
import type { Field } from '../../../../src/engine/modes/rdd/tables';
import type { ModeEdit } from '../../../../src/engine/modes/types';
import { createDefaultRegistry } from '../../../../src/engine/shapes/registry';
import { fixture } from '../../../helpers';

/**
 * Fixture RDD (sans flèche) : `user`, `orphan` (entités), `role` (énumération), `address` (embedded « Address »),
 * `settings` (document), `active` (vue), `accounts` (région), `model` (modèle abstrait).
 */
function setup() {
  const { tree } = readDrawio(fixture('rdd.drawio'));
  const pageTree = tree.pages[0]!;
  const page = () => documentFromTree(tree).pages[0]!;
  const run = (operation: (edit: ModeEdit) => void) => applyModeEdit(page(), pageTree, operation);
  /** Flèche tirée d'une table à une autre, et le mode qui la reçoit (comme `ConnectDrags.commit`). */
  const connect = (source: string, target: string) => {
    const id = addEdgeCell(pageTree, { source, target, style: '' });
    run((edit) => rdd.edgeCreated!(edit, id, undefined));
    return id;
  };
  const shape = (id: string) => page().shapes.find((s) => s.id === id)!;
  const fields = (id: string) => tableFields(shape(id)) as Field[];
  const relations = (id: string) => fields(id).filter((field) => field.edge !== undefined);
  return { tree, pageTree, page, run, connect, shape, fields, relations };
}

describe('mode RDD : liaisons permises (sujet 265)', () => {
  const { page, shape } = setup();
  const shapes = createDefaultRegistry();

  it('entité et énumération se lient entre elles ; un embedded seulement au départ', () => {
    const allowed = (source: string, target: string) => rdd.connects!(page(), shape(source), shape(target));
    expect(allowed('user', 'role')).toBe(true);
    expect(allowed('role', 'user')).toBe(true);
    expect(allowed('user', 'user')).toBe(true);
    expect(allowed('address', 'user')).toBe(true);
    expect(allowed('address', 'role')).toBe(true);
    expect(allowed('user', 'address')).toBe(false);
    expect(allowed('address', 'address')).toBe(false);
  });

  it('vue, document, région et modèle abstrait : ni poignée de connexion ni cible', () => {
    for (const id of ['active', 'settings', 'accounts', 'model']) {
      expect(shapes.isConnectable(shape(id))).toBe(false);
      expect(shapes.connectSides(shape(id))).toEqual([]);
      expect(linksTables(shape('user'), shape(id))).toBe(false);
    }
    expect(shapes.connectSides(shape('address'))).toEqual(['e', 'w']);
    expect(shapes.isConnectable(shape('user'))).toBe(true);
  });

  it('une flèche du fichier entre formes qui ne se lient pas est signalée', () => {
    const { pageTree, page: fresh } = setup();
    const id = addEdgeCell(pageTree, { source: 'user', target: 'active', style: '' });
    addEdgeCell(pageTree, { source: 'user', target: 'role', style: '' });
    expect(forbiddenLinks(fresh()).map((link) => link.edgeId)).toEqual([id]);
    expect(rdd.check!(fresh()).some((issue) => issue.cellId === id)).toBe(true);
  });
});

describe('mode RDD : champ de relation (sujet 265)', () => {
  it('flèche entre entités : champ fk `relation1` dans la cible, sans type, optionnel, en fin de liste', () => {
    const { connect, fields, relations } = setup();
    const before = fields('role').length;
    const edge = connect('user', 'role');
    expect(fields('role')).toHaveLength(before + 1);
    expect(fields('role').at(-1)).toEqual({ kind: 'fk', label: 'relation1', type: '', nullable: true, edge });
    expect(relations('user')).toEqual([]);
    connect('orphan', 'role');
    expect(relations('role').map((field) => field.label)).toEqual(['relation1', 'relation2']);
  });

  it('depuis un embedded : le nom de l’embedded, puis numéroté', () => {
    const { connect, relations } = setup();
    connect('address', 'user');
    connect('address', 'user');
    connect('address', 'user');
    expect(relations('user').map((field) => field.label)).toEqual(['Address', 'Address1', 'Address2']);
  });

  it('la table d’arrivée grandit d’une ligne', () => {
    const { connect, shape } = setup();
    const height = shape('role').bounds.height;
    connect('user', 'role');
    expect(shape('role').bounds.height).toBeCloseTo(height + 20);
  });

  it('flèche supprimée : son champ est retiré (remise en ordre après suppression)', () => {
    const { connect, pageTree, run, relations } = setup();
    const first = connect('user', 'role');
    const second = connect('orphan', 'role');
    removeCellsDeep(pageTree, [first]);
    run(rdd.repair!);
    expect(relations('role').map((field) => field.edge)).toEqual([second]);
  });

  it('table de départ supprimée : le champ part aussi', () => {
    const { connect, pageTree, run, relations } = setup();
    connect('user', 'role');
    removeCellsDeep(pageTree, ['user']);
    run(rdd.repair!);
    expect(relations('role')).toEqual([]);
  });

  it('bout d’arrivée rebranché : le champ passe dans la nouvelle table avec son nom et ses propriétés', () => {
    const { connect, pageTree, run, shape, fields, relations } = setup();
    const edge = connect('user', 'role');
    const index = fields('role').findIndex((field) => field.edge === edge);
    run((edit) => setField(edit, shape('role'), index, { label: 'owner', comment: 'Propriétaire' }));
    expect(relations('role')[0]).toMatchObject({ label: 'owner', comment: 'Propriétaire' });
    setEdgeTerminal(pageTree, edge, 'target', { cellId: 'orphan' });
    run((edit) => rdd.edgeReconnected!(edit, edge));
    expect(relations('role')).toEqual([]);
    expect(relations('orphan')).toEqual([
      { kind: 'fk', label: 'owner', type: '', nullable: true, edge, comment: 'Propriétaire' },
    ]);
  });

  it('rebranché sur une table qui ne peut pas être cible : le champ est retiré', () => {
    const { connect, pageTree, run, relations } = setup();
    const edge = connect('user', 'role');
    setEdgeTerminal(pageTree, edge, 'target', { cellId: 'address' });
    run((edit) => rdd.edgeReconnected!(edit, edge));
    expect(relations('role')).toEqual([]);
    expect(relations('address')).toEqual([]);
  });

  it('kind et type imposés, Suppr refusé ; nom et optionnel modifiables', () => {
    const { connect, run, shape, fields, relations } = setup();
    connect('user', 'role');
    const index = fields('role').findIndex((field) => field.edge !== undefined);
    run((edit) => setField(edit, shape('role'), index, { kind: 'property', type: 'string', label: 'owner' }));
    run((edit) => setField(edit, shape('role'), index, { nullable: false }));
    expect(relations('role')[0]).toMatchObject({ kind: 'fk', type: '', label: 'owner', nullable: false });
    expect(run((edit) => removeField(edit, shape('role'), index))).toBe(false);
    expect(run((edit) => fieldParts.remove!(edit, shape('role'), String(index)))).toBe(false);
    expect(relations('role')).toHaveLength(1);
  });

  it('pas de choix de type dans le panneau pour un champ de relation', () => {
    const { connect, page, shape, fields } = setup();
    connect('user', 'role');
    const index = fields('role').findIndex((field) => field.edge !== undefined);
    const type = rdd.shapeProperties!.find((property) => property.key === 'rdd.field.type')!;
    expect(type.hidden!(page(), shape('role'), String(index))).toBe(true);
    expect(type.hidden!(page(), shape('role'), '1')).toBe(false);
  });

  it('cardinalités imposées sur les bouts, d’après « Optionnel » du champ', () => {
    const { connect, run, page, shape, fields } = setup();
    const edge = connect('user', 'role');
    const style = () => page().edges.find((e) => e.id === edge)!.style;
    expect([style().startArrow, style().endArrow]).toEqual(['ERzeroToMany', 'ERzeroToOne']);
    const index = fields('role').findIndex((field) => field.edge === edge);
    run((edit) => setField(edit, shape('role'), index, { nullable: false }));
    expect([style().startArrow, style().endArrow]).toEqual(['ERzeroToMany', 'ERmandOne']);
    // Bouts changés hors du mode (fichier) : remis à la remise en ordre suivante.
    run((edit) => edit.setElementStyle(edge, 'startArrow', 'classic'));
    run(rdd.opened!);
    expect(style().startArrow).toBe('ERzeroToMany');
    const edgeModel = page().edges.find((e) => e.id === edge)!;
    expect(rdd.managesEdge!(page(), edgeModel)).toBe(true);
  });

  it('textes des bouts dans le style de base des textes de début / fin : « 0,n » au début, « 0,1 » ou « 1,1 » à la fin', () => {
    const { connect, run, page, shape, fields } = setup();
    const edge = connect('user', 'role');
    const labels = () => page().edges.find((e) => e.id === edge)!.labels;
    const texts = () =>
      labels()
        .map((label) => [label.label, label.placement.position, label.placement.offset, label.style.align] as const)
        .sort((a, b) => a[1] - b[1]);
    // `user` est à gauche de `role` : la flèche part vers la droite et arrive par la gauche ; chaque texte s'éloigne
    // de sa table (écarts par défaut 6 le long et 4 de côté, plus la marge de 4 des pointes ER ; début au-dessus, fin
    // en dessous).
    expect(shape('user').bounds.x).toBeLessThan(shape('role').bounds.x);
    expect(texts()).toEqual([
      ['0,n', -1, { x: 10, y: -8 }, 'left'],
      ['0,1', 1, { x: -10, y: 8 }, 'right'],
    ]);
    for (const label of labels()) expect([label.style.fontSize, label.style.fontColor]).toEqual(['9', '#808080']);
    const index = fields('role').findIndex((field) => field.edge === edge);
    run((edit) => setField(edit, shape('role'), index, { nullable: false }));
    expect(texts().map(([text]) => text)).toEqual(['0,n', '1,1']);
    // Rien de plus à une nouvelle remise en ordre : pas de texte en double
    // (la première ajuste aussi la taille des tables de la fixture, sujet 255).
    run(rdd.opened!);
    expect(run(rdd.opened!)).toBe(false);
    expect(texts()).toHaveLength(2);
  });

  it('flèche arrivée par le haut de la table : le texte longe le trait, hors de la table', () => {
    const { pageTree, run, page } = setup();
    // Arrivée fixée au milieu du haut de `orphan`.
    const edge = addEdgeCell(pageTree, { source: 'user', target: 'orphan', style: 'entryX=0.5;entryY=0;' });
    run((edit) => rdd.edgeCreated!(edit, edge, undefined));
    const end = page()
      .edges.find((e) => e.id === edge)!
      .labels.find((label) => label.placement.position === 1)!;
    // Vers le bas en arrivant : le texte est au-dessus du bout (décalé vers le haut), à côté du trait.
    expect(end.placement.offset.y).toBeLessThan(0);
    expect(end.placement.offset.x).not.toBe(0);
  });

  it('« Afficher les cardinalités » décoché sur la page : les pointes sans les textes (sujet 266) ; recoché : de retour', () => {
    const { connect, run, page } = setup();
    const edge = connect('user', 'role');
    const toggle = rdd.pageProperties!.find((property) => property.key === 'spatial.cardinalities')!;
    const ends = () => {
      const e = page().edges.find((x) => x.id === edge)!;
      return [e.style.startArrow, e.style.endArrow, e.labels.map((label) => label.label).sort()];
    };
    expect(toggle.section).toBe('RDD');
    expect(toggle.value!(page(), page())).toBe('1');
    run((edit) => toggle.write!(edit, page(), undefined));
    expect(page().attributes['spatial.cardinalities']).toBe('0');
    expect(toggle.value!(page(), page())).toBeUndefined();
    expect(ends()).toEqual(['ERzeroToMany', 'ERzeroToOne', []]);
    // Une remise en ordre (ex. table déplacée) ne les fait pas revenir.
    run((edit) => rdd.placed!(edit, ['user']));
    expect(ends()).toEqual(['ERzeroToMany', 'ERzeroToOne', []]);
    run((edit) => toggle.write!(edit, page(), '1'));
    expect(page().attributes['spatial.cardinalities']).toBeUndefined();
    expect(ends()).toEqual(['ERzeroToMany', 'ERzeroToOne', ['0,1', '0,n']]);
  });

  it('à l’ouverture, les champs suivent les flèches du fichier', () => {
    const { pageTree, run, relations } = setup();
    const edge = addEdgeCell(pageTree, { source: 'user', target: 'role', style: '' });
    run(rdd.opened!);
    expect(relations('role').map((field) => field.edge)).toEqual([edge]);
  });
});
