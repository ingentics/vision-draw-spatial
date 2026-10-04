import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../src/engine/format/parse';
import { SEQUENCE_EXPORTERS, sequenceExporter } from '../../../src/engine/modes/sequences/export';
import { sequencePlantUml } from '../../../src/engine/modes/sequences/export/plantuml';
import { fixture } from '../../helpers';

const page = () => readDrawio(fixture('sequences.drawio')).document.pages[0]!;

describe('export PlantUML des flux (sujet 90)', () => {
  it('est enregistré parmi les exporteurs de séquence', () => {
    expect(SEQUENCE_EXPORTERS.map((exporter) => exporter.id)).toContain('plantuml');
    expect(sequenceExporter('plantuml')?.name).toBe('PlantUML');
  });

  it('écrit les participants dans l’ordre d’apparition et un message par flèche, par rang', () => {
    expect(sequencePlantUml(page(), 'f1')).toBe(
      [
        '@startuml',
        'title Connexion',
        'participant "Client" as P1',
        'participant "API" as P2',
        'database "Base" as P3',
        '',
        'P1->P2 : login',
        'P2->P3',
        '@enduml',
        '',
      ].join('\n'),
    );
  });

  it('garde le titre du flux tel quel et numérote les participants par flux', () => {
    const text = sequencePlantUml(page(), 'f2');
    expect(text).toContain('title Paiement « carte »');
    expect(text).toContain('P1->P2 : payer');
    expect(text).toContain('database "Base" as P2');
  });

  it('écrit un flux vide sans participant', () => {
    expect(sequencePlantUml(page(), 'f3')).toBe('@startuml\ntitle Vide\n@enduml\n');
  });

  it('écrit une flèche en pointillés en réponse et une extrémité libre hors du diagramme', () => {
    const base = page();
    const [login, lecture] = base.edges;
    const edges = base.edges.map((edge) =>
      edge === login
        ? { ...edge, sourceId: undefined }
        : edge === lecture
          ? { ...edge, targetId: undefined, style: { ...edge.style, dashed: '1' } }
          : edge,
    );
    const text = sequencePlantUml({ ...base, edges }, 'f1');
    expect(text).toContain('[->P1 : login');
    expect(text).toContain('P1-->]');
  });
});
