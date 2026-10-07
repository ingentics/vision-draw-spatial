import { DEFAULT_MODE_PALETTE, isHexColor, jsonListValue, readJsonList, firstFreeName } from '../../../core/plugins';
import type { PageModel } from '../../../core/plugins';
import { keys } from './keys';

/** Flux de la page (attribut de `<diagram>`) : liste ordonnée en JSON `[{"id","title","color"}, …]`. */
export const FLOWS = 'flows';
/** Flux d'une flèche : `id` d'un flux de la page. */
export const FLOW = 'flow';
/** Rang d'une flèche dans son flux, à partir de 1. */
export const STEP = 'step';
/** Type d'une forme dans les séquences (sujet 97) : vide (selon la forme), `bus` ou `queue`. */
export const PARTICIPANT = 'participant';
/** Types de participant qui sont des points de départ d'événements : une première flèche vers eux part d'eux. */
export const EVENT_SOURCES = ['bus', 'queue'];

/** Nom d'un flux à l'écran : son titre, sinon son id. */
export const flowLabel = (flow: Pick<Flow, 'id' | 'title'>): string => flow.title || flow.id;

export interface Flow {
  /** Identifiant stable (`f1`, `f2`…) : renommer un flux ne touche pas ses flèches. */
  id: string;
  title: string;
  /** #rrggbb, choisie à la création puis enregistrée. */
  color: string;
}

/**
 * Couleurs des flux par défaut : les fonds des styles de forme par défaut, à partir de « Bleu »
 * (`DEFAULT_MODE_PALETTE`). L'appli passe ceux de ses paramètres aux opérations (`ModeEdit.palette`).
 */
export const FLOW_COLORS = DEFAULT_MODE_PALETTE;

/** Flux de la page, au mieux : entrées illisibles ignorées, doublons d'id écartés, couleur invalide remplacée. */
export function readFlows(page: PageModel): Flow[] {
  const flows: Flow[] = [];
  for (const entry of readJsonList(keys.pageValue(page, FLOWS)) ?? []) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, title, color } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || !id || flows.some((flow) => flow.id === id)) continue;
    flows.push({
      id,
      title: typeof title === 'string' ? title : '',
      color: typeof color === 'string' && isHexColor(color) ? color.toLowerCase() : nextFlowColor(flows),
    });
  }
  return flows;
}

export function writeFlows(flows: Flow[]): string | undefined {
  return jsonListValue(flows.map(({ id, title, color }) => ({ id, title, color })));
}

/** Couleur d'un nouveau flux : la première de la suite qui n'est pas prise, sinon la suite reprend. */
export function nextFlowColor(flows: Flow[], palette: readonly string[] = FLOW_COLORS): string {
  const colors = palette.length > 0 ? palette : FLOW_COLORS;
  const used = new Set(flows.map((flow) => flow.color));
  return colors.find((color) => !used.has(color)) ?? colors[flows.length % colors.length]!;
}

/** Identifiant d'un nouveau flux : `f` + le plus petit numéro libre. */
export function nextFlowId(flows: Flow[]): string {
  return firstFreeName(
    'f',
    flows.map((flow) => flow.id),
  );
}
