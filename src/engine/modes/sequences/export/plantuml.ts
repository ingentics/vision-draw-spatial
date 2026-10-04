import type { EdgeModel, PageModel, ShapeModel } from '../../../model/types';
import { sequenceState } from '../steps';
import type { SequenceExporter } from './index';

/**
 * Flux en diagramme de séquence PlantUML (sujet 90) : participants dans l'ordre de première apparition, un message
 * par flèche dans l'ordre des rangs. Une forme `umlActor` est un `actor`, un cylindre une `database`. Une flèche en
 * pointillés est une réponse (`-->`) ; une extrémité sans forme entre ou sort du diagramme (`[->`, `->]`).
 */
export const plantUml: SequenceExporter = {
  id: 'plantuml',
  name: 'PlantUML',
  export: sequencePlantUml,
};

export function sequencePlantUml(page: PageModel, flowId: string): string {
  const state = sequenceState(page);
  const flow = state.flows.find((f) => f.id === flowId);
  const shapes = new Map(page.shapes.map((shape) => [shape.id, shape]));
  const edges = new Map(page.edges.map((edge) => [edge.id, edge]));
  const order = (state.members.get(flowId) ?? []).map((id) => edges.get(id)!);

  const aliases = new Map<string, string>();
  const participants: string[] = [];
  const alias = (id: string | undefined) => {
    const shape = id === undefined ? undefined : shapes.get(id);
    if (!shape) return undefined;
    let name = aliases.get(shape.id);
    if (!name) {
      name = `P${aliases.size + 1}`;
      aliases.set(shape.id, name);
      participants.push(`${participantKind(shape)} ${quote(shape.label || shape.id)} as ${name}`);
    }
    return name;
  };
  const messages = order.map((edge) => {
    const from = alias(edge.sourceId);
    const to = alias(edge.targetId);
    const arrow = edge.style.dashed === '1' ? '-->' : '->';
    const text = messageText(edge);
    return `${from ?? '['}${arrow}${to ?? ']'}${text ? ` : ${text}` : ''}`;
  });

  return [
    '@startuml',
    ...(flow?.title ? [`title ${oneLine(flow.title)}`] : []),
    ...participants,
    ...(participants.length > 0 && messages.length > 0 ? [''] : []),
    ...messages,
    '@enduml',
    '',
  ].join('\n');
}

function participantKind(shape: ShapeModel): string {
  if (shape.kind === 'umlActor') return 'actor';
  if (shape.kind.startsWith('cylinder')) return 'database';
  return 'participant';
}

/** Nom entre guillemets (un guillemet du label devient une apostrophe : PlantUML ne les échappe pas). */
function quote(text: string): string {
  return `"${oneLine(text).replaceAll('"', "'")}"`;
}

/** Retours à la ligne en `\n` de PlantUML. */
function oneLine(text: string): string {
  return text.trim().replace(/\r?\n/g, '\\n');
}

function messageText(edge: EdgeModel): string {
  return oneLine(edge.label || edge.labels.map((label) => label.label).find((label) => label.trim()) || '');
}
