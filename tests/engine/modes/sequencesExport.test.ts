import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../src/engine/format/parse';
import type { EdgeModel, PageModel } from '../../../src/engine/model/types';
import { SEQUENCE_EXPORTERS, sequenceExporter } from '../../../src/engine/modes/sequences/export';
import { sequencePlantUml } from '../../../src/engine/modes/sequences/export/plantuml';
import { fixture } from '../../helpers';

const page = () => readDrawio(fixture('sequences.drawio')).document.pages[0]!;
const flowsPage = () => readDrawio(fixture('flows.drawio')).document.pages[0]!;

/**
 * Page de la fixture avec une forme « Cache » en plus et le flux f1 remplacé par les flèches données
 * (`[source, cible]`, `--` en tête de la source pour des pointillés), dans l'ordre des rangs.
 */
function flow(...arrows: Array<[string | undefined, string | undefined, string?]>): PageModel {
  const base = page();
  const client = base.shapes.find((shape) => shape.id === 'client')!;
  const model = base.edges.find((edge) => edge.id === 'login')!;
  const edges: EdgeModel[] = arrows.map(([source, target, label = ''], i) => {
    const dashed = source?.startsWith('--') ?? false;
    return {
      ...model,
      id: `e${i + 1}`,
      label,
      sourceId: source?.replace(/^--/, '') || undefined,
      targetId: target,
      style: { ...(dashed ? { dashed: '1' } : {}), 'spatial.flow': 'f1', 'spatial.step': String(i + 1) },
    };
  });
  return {
    ...base,
    shapes: [...base.shapes, { ...client, id: 'cache', label: 'Cache' }],
    edges,
  };
}

/** Lignes des messages (après la ligne vide qui suit les participants). */
const messages = (text: string) => text.split('\n').slice(text.split('\n').indexOf('') + 1, -2);

describe('export PlantUML des flux (sujets 90 à 94)', () => {
  it('est enregistré parmi les exporteurs de séquence', () => {
    expect(SEQUENCE_EXPORTERS.map((exporter) => exporter.id)).toContain('plantuml');
    expect(sequenceExporter('plantuml')?.name).toBe('PlantUML');
  });

  it('déclare les participants en tête, ordonnés et aliasés, puis active et referme chaque aller', () => {
    expect(sequencePlantUml(page(), 'f1')).toBe(
      [
        '@startuml',
        'title Connexion',
        'participant "Client" as P1 order 1',
        'participant "API" as P2 order 2',
        'database "Base" as P3 order 3',
        '',
        'P1 -> P2 ++ : login',
        'P2 -> P3 ++',
        'P3 --> P2 --',
        'P2 --> P1 --',
        '@enduml',
        '',
      ].join('\n'),
    );
  });

  it('garde le titre du flux tel quel et numérote les participants par flux', () => {
    const text = sequencePlantUml(page(), 'f2');
    expect(text).toContain('title Paiement « carte »');
    expect(text).toContain('database "Base" as P2 order 2');
    expect(text).toContain('P1 -> P2 ++ : payer');
  });

  it('écrit le flux « Inscription flow » de flows.drawio, appel à soi-même sans nouveau niveau', () => {
    expect(sequencePlantUml(flowsPage(), 'f1')).toBe(
      [
        '@startuml',
        'title Inscription flow',
        'actor "Actor" as P1 order 1',
        'participant "User" as P2 order 2',
        'participant "Notifications" as P3 order 3',
        'database "BUS" as P4 order 4',
        '',
        'P1 -> P2 ++ : send form',
        'P2 -> P2 : Create',
        'P2 -> P3 ++ : Notify',
        'P3 -> P4 ++ : Enqueue the email',
        'P4 --> P3 --',
        'P3 --> P2 --',
        'P2 --> P1 --',
        '@enduml',
        '',
      ].join('\n'),
    );
  });

  it('écrit le flux « Sending flow » de flows.drawio, terminé là où il a commencé', () => {
    expect(messages(sequencePlantUml(flowsPage(), 'f2'))).toEqual([
      'P1 -> P2 ++ : Read',
      'P2 -> P3 ++ : Send',
      'P3 --> P2 --',
      'P2 --> P1 --',
    ]);
  });

  it('remonte la pile avant un appel à soi-même, sans l’empiler', () => {
    expect(messages(sequencePlantUml(flow(['client', 'api'], ['api', 'db'], ['api', 'api', 'calcul']), 'f1'))).toEqual([
      'P1 -> P2 ++',
      'P2 -> P3 ++',
      'P3 --> P2 --',
      'P2 -> P2 : calcul',
      'P2 --> P1 --',
    ]);
  });

  it('écrit un flux vide sans participant', () => {
    expect(sequencePlantUml(page(), 'f3')).toBe('@startuml\ntitle Vide\n@enduml\n');
  });

  it('referme les allers ouverts quand le flux repart d’une cible plus ancienne', () => {
    const text = sequencePlantUml(flow(['client', 'api'], ['api', 'db'], ['api', 'cache']), 'f1');
    expect(text).toContain('participant "Cache" as P4 order 4');
    expect(messages(text)).toEqual([
      'P1 -> P2 ++',
      'P2 -> P3 ++',
      'P3 --> P2 --',
      'P2 -> P4 ++',
      'P4 --> P2 --',
      'P2 --> P1 --',
    ]);
  });

  it('fait partir du participant actif une flèche de l’initiateur, sans remonter la pile', () => {
    expect(messages(sequencePlantUml(flow(['client', 'api'], ['api', 'db'], ['client', 'cache']), 'f1'))).toEqual([
      'P1 -> P2 ++',
      'P2 -> P3 ++',
      'P3 -> P4 ++',
      'P4 --> P3 --',
      'P3 --> P2 --',
      'P2 --> P1 --',
    ]);
  });

  it('empile sans rien refermer un aller parti d’un participant absent de la pile', () => {
    expect(messages(sequencePlantUml(flow(['api', 'db'], ['client', 'api', 'login']), 'f1'))).toEqual([
      'P1 -> P2 ++',
      'P3 -> P1 ++ : login',
      'P1 --> P3 --',
      'P2 --> P1 --',
    ]);
  });

  it('prend une flèche en pointillés qui ferme un aller ouvert pour son retour, avec son texte', () => {
    const text = sequencePlantUml(
      flow(['client', 'api'], ['api', 'db'], ['db', 'cache'], ['--db', 'api', 'lignes'], ['--api', 'client', 'ok']),
      'f1',
    );
    expect(messages(text)).toEqual([
      'P1 -> P2 ++',
      'P2 -> P3 ++',
      'P3 -> P4 ++',
      'P4 --> P3 --',
      'P3 --> P2 -- : lignes',
      'P2 --> P1 -- : ok',
    ]);
  });

  it('fait d’une flèche pleine de retour un nouvel aller, et d’une flèche en pointillés sans aller un message', () => {
    expect(messages(sequencePlantUml(flow(['client', 'api'], ['api', 'client', 'rappel']), 'f1'))).toEqual([
      'P1 -> P2 ++',
      'P2 -> P1 ++ : rappel',
      'P1 --> P2 --',
      'P2 --> P1 --',
    ]);
    expect(messages(sequencePlantUml(flow(['--client', 'api', 'note']), 'f1'))).toEqual(['P1 --> P2 : note']);
  });

  it('entre et sort du diagramme par une extrémité sans forme', () => {
    expect(messages(sequencePlantUml(flow([undefined, 'api'], ['api', undefined]), 'f1'))).toEqual([
      '[-> P1 ++',
      'P1 ->]',
      '[<-- P1 --',
    ]);
  });
});
