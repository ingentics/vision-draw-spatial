import { describe, expect, it } from 'vitest';
import { PageModeRegistry } from '../../../../../src/engine/core/modes/registry';
import { MODE_SHAPE_DEFINITIONS } from '../../../../../src/engine/plugins';
import { definition as states } from '../../../../../src/engine/plugins/modes/states';
import { edge, setup, statesXml, vertex } from './helpers';

describe('mode Machine à états (sujet 433)', () => {
  it('s’enregistre avec ses quatre formes, préfixées par l’id du mode', () => {
    const shapes = MODE_SHAPE_DEFINITIONS.get('states')!;
    expect(shapes.map((shape) => shape.id).sort()).toEqual([
      'states-composite',
      'states-final',
      'states-initial',
      'states-state',
    ]);
    expect(() => new PageModeRegistry().register(states, shapes)).not.toThrow();
  });

  it('page en 2D seulement ; palette : formes du mode, Texte, Titre et Post-it', () => {
    expect(states.page!.viewModes).toEqual(['top']);
    expect(states.page!.palette!.shapes).toEqual([
      'states-state',
      'states-composite',
      'states-initial',
      'states-final',
      'text',
      'title',
      'post-it',
    ]);
    expect(states.page!.palette!.categories).toEqual([{ id: 'states', name: 'États', order: 5 }]);
  });

  it('points d’entrée et de sortie à taille fixe ; un état redimensionnable', () => {
    const shapes = new Map(MODE_SHAPE_DEFINITIONS.get('states')!.map((shape) => [shape.id, shape]));
    expect(shapes.get('states-initial')!.resizable).toBe(false);
    expect(shapes.get('states-final')!.resizable).toBe(false);
    expect(shapes.get('states-state')!.resizable).toBeUndefined();
    expect(shapes.get('states-initial')!.palette).toMatchObject({ width: 20, height: 20 });
    expect(shapes.get('states-final')!.palette).toMatchObject({ width: 24, height: 24 });
    expect(shapes.get('states-state')!.palette).toMatchObject({ width: 140, height: 60 });
  });

  it('à l’ouverture, chaque état prend la hauteur de son titre et de son contenu', () => {
    const { run, shape } = setup(
      statesXml(vertex('a', 'state', 0, 0, 140, 200, 'A') + vertex('b', 'state', 0, 300, 140, 10, 'B')),
    );
    run((edit) => states.lifecycle!.opened!(edit));
    expect(shape('a').bounds.height).toBe(60);
    expect(shape('b').bounds.height).toBe(60);
  });

  it('titre changé ou état redimensionné : la hauteur suit', () => {
    const { run, shape } = setup(statesXml(vertex('a', 'state', 0, 0, 140, 60, 'A')));
    run((edit) => edit.setShapeBounds('a', { x: 0, y: 0, width: 200, height: 300 }));
    run((edit) => states.gestures!.placed!(edit, ['a']));
    expect(shape('a').bounds).toEqual({ x: 0, y: 0, width: 200, height: 60 });
    run((edit) => edit.setShapeBounds('a', { x: 0, y: 0, width: 200, height: 10 }));
    run((edit) => states.gestures!.relabeled!(edit, 'a'));
    expect(shape('a').bounds.height).toBe(60);
  });
});

describe('mode Machine à états : transitions (sujet 434)', () => {
  const { page, shape } = setup(
    statesXml(
      vertex('a', 'state', 0, 0, 140, 60, 'A') +
        vertex('b', 'state', 300, 0, 140, 60, 'B') +
        vertex('c', 'composite', 0, 200, 300, 200, 'C') +
        vertex('i', 'initial', 0, 100, 20, 20) +
        vertex('f', 'final', 300, 100, 24, 24) +
        vertex('note', 'rounded=0;spatial.kind=post-it;', 500, 0, 100, 60) +
        edge('ab', 'a', 'b', 'go') +
        edge('free', 'a', '') +
        edge('back', 'f', 'a') +
        edge('postit', 'a', 'note'),
    ),
  );
  const connects = (source: string, target: string) => states.edges!.connects!(page(), shape(source), shape(target));

  it('entre états et ensembles, dans les deux sens, et boucle sur un état ou un ensemble', () => {
    expect(connects('a', 'b')).toBe(true);
    expect(connects('a', 'c')).toBe(true);
    expect(connects('c', 'a')).toBe(true);
    expect(connects('a', 'a')).toBe(true);
    expect(connects('c', 'c')).toBe(true);
  });

  it('point d’entrée : départ seulement ; point de sortie : arrivée seulement ; pas de boucle sur eux', () => {
    expect(connects('i', 'a')).toBe(true);
    expect(connects('a', 'f')).toBe(true);
    expect(connects('a', 'i')).toBe(false);
    expect(connects('f', 'a')).toBe(false);
    expect(connects('i', 'i')).toBe(false);
    expect(connects('f', 'f')).toBe(false);
  });

  it('Texte, Titre et Post-it ne portent pas de transition', () => {
    expect(connects('a', 'note')).toBe(false);
    expect(connects('note', 'a')).toBe(false);
  });

  it('aucun bout libre ; toute flèche est une transition gérée par le mode', () => {
    expect(states.edges!.attachedEnds!(page())).toBe(true);
    expect(states.edges!.manages!(page(), page().edges[0]!)).toBe(true);
  });

  it('Diagnostics : bout libre et liaisons refusées, non exportées', () => {
    expect(states.lifecycle!.check!(page())).toEqual([
      { cellId: 'free', message: "Transition : bout libre, elle n'est pas exportée" },
      {
        cellId: 'back',
        message: "Transition de point de sortie vers « A » : liaison refusée, elle n'est pas exportée",
      },
      { cellId: 'postit', message: "Transition de « A » vers « note » : liaison refusée, elle n'est pas exportée" },
    ]);
  });

  it('section « Transition » du panneau : ses deux bouts', () => {
    const [ends] = states.edges!.properties!;
    expect(ends!.section).toBe('Transition');
    expect(ends!.value!(page(), page().edges[0]!)).toBe('« A » → « B »');
  });

  it('transition tirée : pointe classique, trait plein', () => {
    const { run, page: current } = setup(
      statesXml(
        vertex('a', 'state', 0, 0, 140, 60, 'A') +
          vertex('b', 'state', 300, 0, 140, 60, 'B') +
          '<mxCell id="t" style="endArrow=none;dashed=1;" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry" /></mxCell>',
      ),
    );
    run((edit) => states.edges!.created!(edit, 't', undefined));
    expect(current().edges[0]!.style).toMatchObject({ endArrow: 'classic' });
    expect(current().edges[0]!.style.dashed).toBeUndefined();
  });
});
