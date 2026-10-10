import {
  PLANTUML_FORMAT,
  byId,
  edgesById,
  elementName,
  plantUmlLine,
  plantUmlQuoted,
  shapesById,
} from '../../../../core/plugins';
import type { EdgeModel, PageModel, ShapeModel } from '../../../../core/plugins';
import { isReturnEdge } from '../direction';
import { EVENT_SOURCES, PARTICIPANT, flowLabel } from '../flows';
import { keys } from '../keys';
import { sequenceState } from '../steps';
import type { SequenceExporter } from './index';

/**
 * Flux en diagramme de séquence PlantUML (sujets 90 à 94, 96 pour tous les flux). Participants déclarés en tête dans l'ordre de première
 * apparition (alias `P1`, `P2`… et `order`), seuls les alias servant ensuite ; une forme `umlActor` (ou le droid) est un `actor`, un
 * cylindre une `database`. Une extrémité sans forme entre ou sort du diagramme (`[->`, `->]`).
 *
 * Messages en pile d'appels, dans l'ordre des rangs : une flèche pleine est un aller qui active sa cible (`++`), sauf
 * vers soi-même ou vers l'extérieur (message simple, sans nouveau niveau) ; une
 * flèche, pleine ou en pointillés, qui ferme un aller encore ouvert est son retour (`--`, sujet 266), les allers ouverts
 * au-dessus étant refermés d'abord ; une flèche pleine sans aller à fermer est un nouvel aller. Dans un flux qui a au moins
 * une flèche en pointillés, seules celles-ci ferment un aller : une flèche pleine y est toujours un aller (rappel,
 * sujet 426). Un aller qui part de la cible d'un aller ouvert remonte jusqu'à elle en refermant les allers
 * au-dessus ; parti d'un participant absent de la pile, il s'empile par-dessus. Une séquence se termine là où elle a
 * commencé : tant qu'elle est ouverte, un aller qui part de son initiateur (source du premier aller) part du
 * participant actif, et l'aller de l'initiateur n'est refermé qu'à la fin, avec tous ceux encore ouverts. Ces retours
 * générés sont sans texte.
 *
 * Une forme de type `bus` ou `queue` (`spatial.seq.participant`, sujet 97) est une `queue` ; si la première flèche d'un
 * flux va vers elle, elle est lue dans l'autre sens : le flux part du bus.
 */
export const plantUml: SequenceExporter = { ...PLANTUML_FORMAT, export: sequencePlantUml };

/** Aller encore ouvert : alias de sa source (undefined = extérieur) et de sa cible activée. */
interface Call {
  caller: string | undefined;
  callee: string;
}

/** Un flux (`flowId`), ou tous les flux de la page (undefined) : titre de la page, un `== Titre ==` par flux. */
export function sequencePlantUml(page: PageModel, flowId?: string): string {
  const state = sequenceState(page);
  const shapes = shapesById(page);
  const edges = edgesById(page);

  const aliases = new Map<string, string>();
  const participants: string[] = [];
  const alias = (id: string | undefined) => {
    const shape = id === undefined ? undefined : shapes.get(id);
    if (!shape) return undefined;
    let name = aliases.get(shape.id);
    if (!name) {
      const rank = aliases.size + 1;
      name = `P${rank}`;
      aliases.set(shape.id, name);
      participants.push(`${participantKind(shape)} ${plantUmlQuoted(elementName(shape))} as ${name} order ${rank}`);
    }
    return name;
  };
  const flowMessages = (id: string) => {
    const order = (state.members.get(id) ?? []).map((edgeId) => edges.get(edgeId)!);
    // Première flèche vers un bus ou une queue : le flux part de lui (consommateur d'événement).
    const first = order[0];
    const target = first?.targetId === undefined ? undefined : shapes.get(first.targetId);
    if (first && target && eventSource(target)) order[0] = { ...first, sourceId: target.id, targetId: first.sourceId };
    return messages(order, alias);
  };

  let title: string | undefined;
  let body: string[];
  if (flowId === undefined) {
    title = page.name;
    // Un flux par section, séparées d'une ligne vide.
    body = state.flows.flatMap((flow, i) => [
      ...(i > 0 ? [''] : []),
      `== ${plantUmlLine(flowLabel(flow))} ==`,
      ...flowMessages(flow.id),
    ]);
  } else {
    title = byId(state.flows, flowId)?.title;
    body = flowMessages(flowId);
  }

  return [
    '@startuml',
    ...(title ? [`title ${plantUmlLine(title)}`] : []),
    ...participants,
    ...(participants.length > 0 && body.length > 0 ? [''] : []),
    ...body,
    '@enduml',
    '',
  ].join('\n');
}

/** Messages d'un flux (flèches dans l'ordre des rangs), sur une pile d'appels refermée à la fin. */
function messages(order: EdgeModel[], alias: (id: string | undefined) => string | undefined): string[] {
  const lines: string[] = [];
  const stack: Call[] = [];
  // Un rappel B → A pendant l'aller A → B ne se distingue d'un retour que si le flux dessine ses retours en pointillés.
  const dashedReturns = order.some(isReturnEdge);
  const close = () => {
    const { caller, callee } = stack.pop()!;
    lines.push(`${message(callee, '-->', caller, true)} --`);
  };
  for (const edge of order) {
    let from = alias(edge.sourceId);
    const to = alias(edge.targetId);
    const text = messageText(edge);
    const label = text ? ` : ${text}` : '';
    // Pleine (si le flux n'a pas de pointillés) ou en pointillés, une flèche qui ferme un aller ouvert est son retour :
    // seuls les retours absents sont générés. Une flèche pleine vers l'extérieur reste une sortie du diagramme (`->]`).
    const dashed = isReturnEdge(edge);
    const closes = from !== undefined && (dashed || (!dashedReturns && to !== undefined));
    const opened = closes ? lastIndex(stack, (call) => call.callee === from && call.caller === to) : -1;
    if (opened >= 0) {
      while (stack.length > opened + 1) close();
      stack.pop();
      lines.push(`${message(from, '-->', to, true)} --${label}`);
      continue;
    }
    if (dashed) {
      lines.push(`${message(from, '-->', to)}${label}`);
      continue;
    }
    // On ne remonte que vers la cible d'un aller ouvert ; l'initiateur (source du premier) n'est rejoint qu'à la fin :
    // une flèche qui part de lui part du participant actif (ex. consommateur d'un événement).
    const source = from === undefined ? -1 : lastIndex(stack, (call) => call.callee === from);
    if (source >= 0) while (stack.length > source + 1) close();
    else if (stack.length > 0 && stack[0]!.caller === from && to !== from) from = stack.at(-1)!.callee;
    // Vers l'extérieur ou vers soi-même : message simple, sans nouveau niveau.
    const opens = to !== undefined && to !== from;
    lines.push(`${message(from, '->', to)}${opens ? ' ++' : ''}${label}`);
    if (opens) stack.push({ caller: from, callee: to });
  }
  while (stack.length > 0) close();
  return lines;
}

/**
 * Flèche entre deux alias ; undefined = extérieur, à gauche (`[->`) pour une source, à droite (`->]`) pour une cible,
 * sauf un retour vers l'extérieur d'un aller entré par la gauche, que l'on écrit vers la gauche (`[<--`).
 */
function message(from: string | undefined, arrow: '->' | '-->', to: string | undefined, back = false): string {
  if (from === undefined) return `[${arrow} ${to ?? ']'}`;
  if (to === undefined) return back ? `[<${arrow.slice(0, -1)} ${from}` : `${from} ${arrow}]`;
  return `${from} ${arrow} ${to}`;
}

function lastIndex<T>(items: T[], test: (item: T) => boolean): number {
  for (let i = items.length - 1; i >= 0; i--) if (test(items[i]!)) return i;
  return -1;
}

function eventSource(shape: ShapeModel): boolean {
  return EVENT_SOURCES.includes(keys.value(shape, PARTICIPANT) ?? '');
}

function participantKind(shape: ShapeModel): string {
  if (eventSource(shape)) return 'queue';
  if (shape.kind === 'umlActor' || shape.kind === 'stencil:actor-droid') return 'actor';
  if (shape.kind.startsWith('cylinder')) return 'database';
  return 'participant';
}

function messageText(edge: EdgeModel): string {
  return plantUmlLine(edge.label || edge.labels.map((label) => label.label).find((label) => label.trim()) || '');
}
