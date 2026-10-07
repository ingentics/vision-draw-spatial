import { ANCHORINGS } from '../../edit/anchoring/mode';
import type { SettingsPatch, ShapeSettings, StyleSettings } from '../types';
import { bool, color, num, oneOf, presets, textPresets } from '../validate';

/** Fusion des réglages des formes, des flèches et des styles proposés. */

const LABEL_BACKDROPS = ['halo', 'solid', 'none'] as const;
const EDGE_LINES = ['straight', 'sharp', 'rounded', 'curved'] as const;
const EDGE_JUMPS = ['none', 'arc', 'gap', 'sharp', 'line'] as const;

export function mergeShapes(base: ShapeSettings, patch: SettingsPatch['shapes']): ShapeSettings {
  const p = patch ?? {};
  return {
    edgeFontColor: color(p.edgeFontColor, base.edgeFontColor),
    textSize: Math.round(num('shapes.textSize', p.textSize, base.textSize)),
    edgeEndTextColor: color(p.edgeEndTextColor, base.edgeEndTextColor),
    edgeEndTextGapAlong: num('shapes.edgeEndTextGapAlong', p.edgeEndTextGapAlong, base.edgeEndTextGapAlong),
    edgeEndTextGapAcross: num('shapes.edgeEndTextGapAcross', p.edgeEndTextGapAcross, base.edgeEndTextGapAcross),
    edgeLineStyle: oneOf(EDGE_LINES, p.edgeLineStyle, base.edgeLineStyle),
    edgeJumpStyle: oneOf(EDGE_JUMPS, p.edgeJumpStyle, base.edgeJumpStyle),
    edgeJumpSize: Math.round(num('shapes.edgeJumpSize', p.edgeJumpSize, base.edgeJumpSize)),
    edgeAnchoring: oneOf(ANCHORINGS, p.edgeAnchoring, base.edgeAnchoring),
    edgeAutoRoute: bool(p.edgeAutoRoute, base.edgeAutoRoute),
    edgeShapeClearance: num('shapes.edgeShapeClearance', p.edgeShapeClearance, base.edgeShapeClearance),
    edgeSpacing: num('shapes.edgeSpacing', p.edgeSpacing, base.edgeSpacing),
    edgePortStub: num('shapes.edgePortStub', p.edgePortStub, base.edgePortStub),
    edgeCrossingDetour: num('shapes.edgeCrossingDetour', p.edgeCrossingDetour, base.edgeCrossingDetour),
    edgePcbAutoRoute: bool(p.edgePcbAutoRoute, base.edgePcbAutoRoute),
    edgePcbShapeClearance: num('shapes.edgePcbShapeClearance', p.edgePcbShapeClearance, base.edgePcbShapeClearance),
    edgePcbSpacing: num('shapes.edgePcbSpacing', p.edgePcbSpacing, base.edgePcbSpacing),
    edgePcbPortStub: num('shapes.edgePcbPortStub', p.edgePcbPortStub, base.edgePcbPortStub),
    edgePcbCrossingDetour: num('shapes.edgePcbCrossingDetour', p.edgePcbCrossingDetour, base.edgePcbCrossingDetour),
    edgePcbBend45: num('shapes.edgePcbBend45', p.edgePcbBend45, base.edgePcbBend45),
    edgePcbBend90: num('shapes.edgePcbBend90', p.edgePcbBend90, base.edgePcbBend90),
    edgeLoopMargin: num('shapes.edgeLoopMargin', p.edgeLoopMargin, base.edgeLoopMargin),
    edgeEndTextSize: Math.round(num('shapes.edgeEndTextSize', p.edgeEndTextSize, base.edgeEndTextSize)),
    edgeLabelBackdrop: oneOf(LABEL_BACKDROPS, p.edgeLabelBackdrop, base.edgeLabelBackdrop),
    edgeLabelHaloWidth: num('shapes.edgeLabelHaloWidth', p.edgeLabelHaloWidth, base.edgeLabelHaloWidth),
    edgeLabelHaloBlur: num('shapes.edgeLabelHaloBlur', p.edgeLabelHaloBlur, base.edgeLabelHaloBlur),
    edgeSplitLength: num('shapes.edgeSplitLength', p.edgeSplitLength, base.edgeSplitLength),
    edgeSplitFade: num('shapes.edgeSplitFade', p.edgeSplitFade, base.edgeSplitFade),
    edgeSplitLabelPadding: num('shapes.edgeSplitLabelPadding', p.edgeSplitLabelPadding, base.edgeSplitLabelPadding),
    edgeSplitLabelSize: num('shapes.edgeSplitLabelSize', p.edgeSplitLabelSize, base.edgeSplitLabelSize),
    edgeBadgeRadius: num('shapes.edgeBadgeRadius', p.edgeBadgeRadius, base.edgeBadgeRadius),
    edgeBadgeTextSize: num('shapes.edgeBadgeTextSize', p.edgeBadgeTextSize, base.edgeBadgeTextSize),
    edgeBadgeSmallRadius: num('shapes.edgeBadgeSmallRadius', p.edgeBadgeSmallRadius, base.edgeBadgeSmallRadius),
    edgeBadgeSmallTextSize: num('shapes.edgeBadgeSmallTextSize', p.edgeBadgeSmallTextSize, base.edgeBadgeSmallTextSize),
    edgeBadgeBorderColor: color(p.edgeBadgeBorderColor, base.edgeBadgeBorderColor),
    edgeBadgeBorderWidth: num('shapes.edgeBadgeBorderWidth', p.edgeBadgeBorderWidth, base.edgeBadgeBorderWidth),
    edgeBadgeTextColor: color(p.edgeBadgeTextColor, base.edgeBadgeTextColor),
    edgeBadgeBold: bool(p.edgeBadgeBold, base.edgeBadgeBold),
    edgeBadgeGap: num('shapes.edgeBadgeGap', p.edgeBadgeGap, base.edgeBadgeGap),
    edgeBadgeFaceCamera: bool(p.edgeBadgeFaceCamera, base.edgeBadgeFaceCamera),
    edgeBadgeLabelFaceCamera: bool(p.edgeBadgeLabelFaceCamera, base.edgeBadgeLabelFaceCamera),
    edgeDressingDarken: num('shapes.edgeDressingDarken', p.edgeDressingDarken, base.edgeDressingDarken),
    modeObstacleGap: num('shapes.modeObstacleGap', p.modeObstacleGap, base.modeObstacleGap),
    modeDimOpacity: num('shapes.modeDimOpacity', p.modeDimOpacity, base.modeDimOpacity),
    modeBarSlideDuration: num('shapes.modeBarSlideDuration', p.modeBarSlideDuration, base.modeBarSlideDuration),
    placeholderFill: color(p.placeholderFill, base.placeholderFill),
    placeholderStroke: color(p.placeholderStroke, base.placeholderStroke),
  };
}

export function mergeStyles(base: StyleSettings, patch: SettingsPatch['styles']): StyleSettings {
  const p = patch ?? {};
  return {
    base: presets(p.base, base.base),
    extended: presets(p.extended, base.extended),
    text: textPresets(p.text, base.text),
  };
}
