import { Color, SRGBColorSpace } from 'three';
import { DRAWIO_STYLES, PASTEL_STYLES } from '../../edit/styles';
import type { PageModel } from '../../model/types';

/** Flux de la page (attribut de `<diagram>`) : liste ordonnée en JSON `[{"id","title","color"}, …]`. */
export const FLOWS = 'spatial.flows';
/** Flux d'une flèche : `id` d'un flux de la page. */
export const FLOW = 'spatial.flow';
/** Rang d'une flèche dans son flux, à partir de 1. */
export const STEP = 'spatial.step';

export interface Flow {
  /** Identifiant stable (`f1`, `f2`…) : renommer un flux ne touche pas ses flèches. */
  id: string;
  title: string;
  /** #rrggbb, choisie à la création puis enregistrée. */
  color: string;
}

/**
 * Suite des couleurs des flux : les fonds des styles de forme (panneau « Forme »), palette partagée, à partir de
 * « Bleu » (sans le blanc ni le gris du début). Un nouveau flux prend la première libre.
 */
export const FLOW_COLORS = [...DRAWIO_STYLES, ...PASTEL_STYLES].slice(2).map((preset) => preset.fillColor);

const HEX = /^#[0-9a-f]{6}$/i;

/** Flux de la page, au mieux : entrées illisibles ignorées, doublons d'id écartés, couleur invalide remplacée. */
export function readFlows(page: PageModel): Flow[] {
  let raw: unknown;
  try {
    raw = JSON.parse(page.attributes[FLOWS] ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const flows: Flow[] = [];
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object') continue;
    const { id, title, color } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || !id || flows.some((flow) => flow.id === id)) continue;
    flows.push({
      id,
      title: typeof title === 'string' ? title : '',
      color: typeof color === 'string' && HEX.test(color) ? color.toLowerCase() : nextFlowColor(flows),
    });
  }
  return flows;
}

export function writeFlows(flows: Flow[]): string | undefined {
  return flows.length === 0 ? undefined : JSON.stringify(flows.map(({ id, title, color }) => ({ id, title, color })));
}

/** Couleur d'un nouveau flux : la première de la suite qui n'est pas prise, sinon la suite reprend. */
export function nextFlowColor(flows: Flow[]): string {
  const used = new Set(flows.map((flow) => flow.color));
  return FLOW_COLORS.find((color) => !used.has(color)) ?? FLOW_COLORS[flows.length % FLOW_COLORS.length]!;
}

/** Identifiant d'un nouveau flux : `f` + le plus petit numéro libre. */
export function nextFlowId(flows: Flow[]): string {
  const ids = new Set(flows.map((flow) => flow.id));
  let n = 1;
  while (ids.has(`f${n}`)) n++;
  return `f${n}`;
}

/** Couleur du trait d'une flèche d'un flux : celle du flux assombrie (luminosité −25 %). */
export function flowStrokeColor(color: string): string {
  const hsl = { h: 0, s: 0, l: 0 };
  new Color(color).getHSL(hsl, SRGBColorSpace);
  return `#${new Color().setHSL(hsl.h, hsl.s, hsl.l * 0.75, SRGBColorSpace).getHexString()}`;
}
