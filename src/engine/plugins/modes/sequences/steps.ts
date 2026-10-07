import type { EdgeModel, PageModel } from '../../../core/model/types';
import { spatialValue } from '../../../core/spatial';
import type { ModeEdit, ModeIssue } from '../../../core/modes/types';
import { FLOW, FLOWS, STEP, nextFlowColor, nextFlowId, readFlows, writeFlows } from './flows';
import type { Flow } from './flows';

/**
 * État des séquences d'une page, remis en ordre au mieux : chaque flux a ses flèches aux rangs 1…n. Un fichier
 * modifié dans draw.io peut avoir des trous, des doublons ou un flux disparu : les flèches sont triées par rang
 * écrit (rang absent ou illisible à la fin), puis par ordre de dessin, et renumérotées ; une flèche d'un flux
 * inconnu est sans flux. Rien n'est réécrit ici : la remise en ordre est écrite à la prochaine modification du flux.
 */
export interface SequenceState {
  flows: Flow[];
  /** Flèches de chaque flux, par rang (indice + 1). */
  members: Map<string, string[]>;
  /** Flux et rang de chaque flèche d'un flux. */
  placement: Map<string, { flowId: string; step: number }>;
  issues: ModeIssue[];
}

const states = new WeakMap<PageModel, SequenceState>();

export function sequenceState(page: PageModel): SequenceState {
  let state = states.get(page);
  if (!state) {
    state = computeState(page);
    states.set(page, state);
  }
  return state;
}

function computeState(page: PageModel): SequenceState {
  const flows = readFlows(page);
  const issues: ModeIssue[] = [];
  const raw = new Map<string, Array<{ edge: EdgeModel; step: number | undefined }>>(flows.map((f) => [f.id, []]));
  for (const edge of page.edges) {
    const flowId = spatialValue(edge, FLOW)?.trim();
    if (!flowId) continue;
    const entries = raw.get(flowId);
    if (!entries) {
      issues.push({ cellId: edge.id, message: `Flèche d'un flux inconnu (${flowId}) : sans flux` });
      continue;
    }
    const step = Number(spatialValue(edge, STEP));
    entries.push({ edge, step: Number.isInteger(step) && step >= 1 ? step : undefined });
  }

  const members = new Map<string, string[]>();
  const placement = new Map<string, { flowId: string; step: number }>();
  for (const flow of flows) {
    const entries = raw.get(flow.id)!;
    entries.sort((a, b) => (a.step ?? Infinity) - (b.step ?? Infinity) || a.edge.z - b.edge.z);
    const ids = entries.map((entry) => entry.edge.id);
    members.set(flow.id, ids);
    ids.forEach((id, i) => placement.set(id, { flowId: flow.id, step: i + 1 }));
    if (entries.some((entry, i) => entry.step !== i + 1)) {
      issues.push({
        message: `Rangs du flux « ${flow.title || flow.id} » remis en ordre (trous, doublons ou absents)`,
      });
    }
  }
  return { flows, members, placement, issues };
}

// ---------------------------------------------------------------------------
// Opérations (une étape d'annulation chacune, via `ModeEdit`)

/** Ajoute un flux à la fin de la liste ; renvoie son id. */
export function addFlow(edit: ModeEdit, title: string): string {
  const { flows } = sequenceState(edit.page);
  const flow: Flow = { id: nextFlowId(flows), title: title.trim(), color: nextFlowColor(flows, edit.palette) };
  edit.setPageAttribute(FLOWS, writeFlows([...flows, flow]));
  return flow.id;
}

export function renameFlow(edit: ModeEdit, flowId: string, title: string): void {
  const { flows } = sequenceState(edit.page);
  edit.setPageAttribute(
    FLOWS,
    writeFlows(flows.map((flow) => (flow.id === flowId ? { ...flow, title: title.trim() } : flow))),
  );
}

/** Supprime un flux : ses flèches perdent leur flux et leur rang. */
export function removeFlow(edit: ModeEdit, flowId: string): void {
  const { flows, members } = sequenceState(edit.page);
  edit.setPageAttribute(FLOWS, writeFlows(flows.filter((flow) => flow.id !== flowId)));
  for (const edgeId of members.get(flowId) ?? []) clearEdge(edit, edgeId);
}

/** Déplace un flux à la position `index` (0 = premier) de la liste. */
export function moveFlow(edit: ModeEdit, flowId: string, index: number): void {
  const flows = [...sequenceState(edit.page).flows];
  const from = flows.findIndex((flow) => flow.id === flowId);
  if (from < 0) return;
  const [flow] = flows.splice(from, 1);
  flows.splice(Math.max(0, Math.min(index, flows.length)), 0, flow!);
  edit.setPageAttribute(FLOWS, writeFlows(flows));
}

/**
 * Flux d'une flèche (undefined = aucun) : elle quitte son flux, dont les rangs suivants se resserrent, et se met à
 * la fin du nouveau.
 */
export function setEdgeFlow(edit: ModeEdit, edgeId: string, flowId: string | undefined): void {
  const state = sequenceState(edit.page);
  const current = state.placement.get(edgeId)?.flowId;
  const known = flowId !== undefined && state.members.has(flowId);
  if (current === flowId || (flowId !== undefined && !known)) return;
  if (current !== undefined)
    writeOrder(
      edit,
      current,
      state.members.get(current)!.filter((id) => id !== edgeId),
    );
  if (known) writeOrder(edit, flowId, [...state.members.get(flowId)!, edgeId]);
  else clearEdge(edit, edgeId);
}

/** Rang d'une flèche dans son flux (borné à 1…n) : elle échange sa place avec la flèche qui l'occupait. */
export function setEdgeStep(edit: ModeEdit, edgeId: string, step: number): void {
  const state = sequenceState(edit.page);
  const placed = state.placement.get(edgeId);
  if (!placed || !Number.isFinite(step)) return;
  const order = [...state.members.get(placed.flowId)!];
  const to = Math.max(1, Math.min(Math.round(step), order.length)) - 1;
  const from = placed.step - 1;
  [order[from], order[to]] = [order[to]!, order[from]!];
  writeOrder(edit, placed.flowId, order);
}

/**
 * Écrit l'état remis en ordre (après une suppression, ou un fichier modifié dans draw.io) : rangs consécutifs,
 * flux inconnus retirés des flèches.
 */
export function repairSequences(edit: ModeEdit): void {
  const state = sequenceState(edit.page);
  for (const [flowId, order] of state.members) writeOrder(edit, flowId, order);
  for (const edge of edit.page.edges) {
    if (spatialValue(edge, FLOW) !== undefined && !state.placement.has(edge.id)) clearEdge(edit, edge.id);
  }
}

/** Écrit le flux et le rang (1…n dans l'ordre donné) des flèches d'un flux ; seules les valeurs qui changent. */
function writeOrder(edit: ModeEdit, flowId: string, order: string[]): void {
  order.forEach((edgeId, i) => {
    edit.setElementAttribute(edgeId, FLOW, flowId);
    edit.setElementAttribute(edgeId, STEP, String(i + 1));
  });
}

function clearEdge(edit: ModeEdit, edgeId: string): void {
  edit.setElementAttribute(edgeId, FLOW, undefined);
  edit.setElementAttribute(edgeId, STEP, undefined);
}
