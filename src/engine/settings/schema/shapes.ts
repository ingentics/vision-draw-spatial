import { ANCHORINGS } from '../../edit/anchoring/mode';
import { DRAWIO_STYLES, PASTEL_STYLES, TEXT_STYLES } from '../../edit/stylePresets';
import { color, custom, flag, number, oneOf, presets, textPresets } from '../fields';
import type { Spec } from '../fields';
import type { ShapeSettings, StyleSettings } from '../types';

/** Schéma des réglages des formes, des flèches et des styles proposés. */

const LABEL_BACKDROPS = ['halo', 'solid', 'none'] as const;
const EDGE_LINES = ['straight', 'sharp', 'rounded', 'curved'] as const;
const EDGE_JUMPS = ['none', 'arc', 'gap', 'sharp', 'line'] as const;

export const SHAPES = {
  edgeFontColor: color('#000000'),
  textSize: number(12, { min: 4, max: 72, step: 1 }, { integer: true }),
  edgeEndTextSize: number(9, { min: 4, max: 72, step: 1 }, { integer: true }),
  edgeEndTextColor: color('#808080'),
  edgeEndTextGapAlong: number(6, { min: 0, max: 40, step: 1 }),
  edgeEndTextGapAcross: number(4, { min: 0, max: 40, step: 1 }),
  edgeLineStyle: oneOf(EDGE_LINES, 'rounded'),
  edgeJumpStyle: oneOf(EDGE_JUMPS, 'none'),
  edgeJumpSize: number(6, { min: 2, max: 40, step: 1 }, { integer: true }),
  edgeAnchoring: oneOf(ANCHORINGS, 'manual'),
  edgeAutoRoute: flag(true),
  edgeShapeClearance: number(10, { min: 0, max: 40, step: 1 }),
  edgeSpacing: number(10, { min: 2, max: 40, step: 1 }),
  edgePortStub: number(20, { min: 5, max: 60, step: 1 }),
  edgeCrossingDetour: number(500, { min: 0, max: 2000, step: 50 }),
  edgePcbAutoRoute: flag(true),
  edgePcbShapeClearance: number(10, { min: 0, max: 40, step: 1 }),
  edgePcbSpacing: number(10, { min: 5, max: 40, step: 1 }),
  edgePcbPortStub: number(20, { min: 5, max: 60, step: 1 }),
  edgePcbCrossingDetour: number(500, { min: 0, max: 2000, step: 50 }),
  edgePcbBend45: number(15, { min: 0, max: 200, step: 5 }),
  edgePcbBend90: number(30, { min: 0, max: 200, step: 5 }),
  edgeLoopMargin: number(20, { min: 5, max: 100, step: 1 }),
  edgeLabelBackdrop: oneOf(LABEL_BACKDROPS, 'halo'),
  edgeLabelHaloWidth: number(1.5, { min: 0.5, max: 6, step: 0.25 }),
  edgeLabelHaloBlur: number(1, { min: 0, max: 4, step: 0.25 }),
  edgeSplitLength: number(40, { min: 10, max: 200, step: 1 }),
  edgeSplitFade: number(20, { min: 0, max: 100, step: 1 }),
  edgeSplitLabelPadding: number(4, { min: 0, max: 16, step: 1 }),
  edgeSplitLabelSize: number(7, { min: 4, max: 24, step: 1 }),
  placeholderFill: color('#eeeeee'),
  placeholderStroke: color('#9e9e9e'),
} satisfies Spec<ShapeSettings>;

export const STYLES = {
  base: custom(DRAWIO_STYLES, presets),
  extended: custom(PASTEL_STYLES, presets),
  text: custom(TEXT_STYLES, textPresets),
} satisfies Spec<StyleSettings>;
