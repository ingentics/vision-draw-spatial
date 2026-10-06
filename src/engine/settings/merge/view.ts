import type {
  BackgroundSettings,
  CameraSettings,
  CommentSettings,
  GraphSettings,
  MinimapSettings,
  SelectionSettings,
  SettingsPatch,
  ViewSettings,
} from '../types';
import { bool, color, num, oneOf } from '../validate';

/** Fusion des réglages d'affichage : vues, caméra, fond, mini-carte, commentaire, sélection, vue graphe. */

const VIEW_MODES = ['top', 'iso', '3d'] as const;
const SELECTION_STYLES = ['veil', 'outline'] as const;

export function mergeView(base: ViewSettings, patch: SettingsPatch['view']): ViewSettings {
  const p = patch ?? {};
  return {
    defaultMode: oneOf(VIEW_MODES, p.defaultMode, base.defaultMode),
    isoAngleDeg: num('view.isoAngleDeg', p.isoAngleDeg, base.isoAngleDeg),
    isoAzimuthDeg: num('view.isoAzimuthDeg', p.isoAzimuthDeg, base.isoAzimuthDeg),
    switchDurationMs: num('view.switchDurationMs', p.switchDurationMs, base.switchDurationMs),
    isoVolume: bool(p.isoVolume, base.isoVolume),
    isoDepth: num('view.isoDepth', p.isoDepth, base.isoDepth),
    shadeLight: num('view.shadeLight', p.shadeLight, base.shadeLight),
    shadeDark: num('view.shadeDark', p.shadeDark, base.shadeDark),
    facadeTags: bool(p.facadeTags, base.facadeTags),
  };
}

/**
 * Caméra : bornes cohérentes (le minimum ne dépasse pas le maximum, même s'ils arrivent dans le
 * désordre d'un stockage ancien).
 */
export function mergeCamera(base: CameraSettings, patch: SettingsPatch['camera']): CameraSettings {
  const p = patch ?? {};
  const value = (key: keyof CameraSettings) => num(`camera.${key}`, p[key], base[key]);
  const minZoom = value('minZoom');
  const minZoom3d = value('minZoom3d');
  return {
    minZoom,
    maxZoom: Math.max(minZoom, value('maxZoom')),
    minZoom3d,
    maxZoom3d: Math.max(minZoom3d, value('maxZoom3d')),
    maxTilt3dDeg: value('maxTilt3dDeg'),
    fovDeg: value('fovDeg'),
    animationMs: value('animationMs'),
    focusMaxZoom: value('focusMaxZoom'),
    focusPadding: value('focusPadding'),
  };
}

export function mergeBackground(base: BackgroundSettings, patch: SettingsPatch['background']): BackgroundSettings {
  const p = patch ?? {};
  return {
    color: color(p.color, base.color),
    grid: bool(p.grid, base.grid),
    gridFromPage: bool(p.gridFromPage, base.gridFromPage),
    gridSize: num('background.gridSize', p.gridSize, base.gridSize),
    majorEvery: Math.round(num('background.majorEvery', p.majorEvery, base.majorEvery)),
    gridColor: color(p.gridColor, base.gridColor),
    minorStrength: num('background.minorStrength', p.minorStrength, base.minorStrength),
  };
}

export function mergeMinimap(base: MinimapSettings, patch: SettingsPatch['minimap']): MinimapSettings {
  const p = patch ?? {};
  return {
    visible: bool(p.visible, base.visible),
    size: num('minimap.size', p.size, base.size),
    edgeColor: color(p.edgeColor, base.edgeColor),
    outlineColor: color(p.outlineColor, base.outlineColor),
  };
}

export function mergeComment(base: CommentSettings, patch: SettingsPatch['comment']): CommentSettings {
  const p = patch ?? {};
  return {
    veilColor: color(p.veilColor, base.veilColor),
    opacityCorner: num('comment.opacityCorner', p.opacityCorner, base.opacityCorner),
    opacityEdge: num('comment.opacityEdge', p.opacityEdge, base.opacityEdge),
    marginTop: num('comment.marginTop', p.marginTop, base.marginTop),
    marginRight: num('comment.marginRight', p.marginRight, base.marginRight),
    curveRadius: num('comment.curveRadius', p.curveRadius, base.curveRadius),
    fadeLength: num('comment.fadeLength', p.fadeLength, base.fadeLength),
    padding: num('comment.padding', p.padding, base.padding),
    textColor: color(p.textColor, base.textColor),
    textSize: num('comment.textSize', p.textSize, base.textSize),
    textMaxWidth: num('comment.textMaxWidth', p.textMaxWidth, base.textMaxWidth),
    fadeInMs: num('comment.fadeInMs', p.fadeInMs, base.fadeInMs),
    fadeOutMs: num('comment.fadeOutMs', p.fadeOutMs, base.fadeOutMs),
  };
}

export function mergeSelection(base: SelectionSettings, patch: SettingsPatch['selection']): SelectionSettings {
  const p = patch ?? {};
  return {
    style: oneOf(SELECTION_STYLES, p.style, base.style),
    veilOpacity: num('selection.veilOpacity', p.veilOpacity, base.veilOpacity),
    animated: bool(p.animated, base.animated),
    speed: num('selection.speed', p.speed, base.speed),
    veilColor: color(p.veilColor, base.veilColor),
    veilPadding: num('selection.veilPadding', p.veilPadding, base.veilPadding),
    accentColor: color(p.accentColor, base.accentColor),
  };
}

export function mergeGraph(base: GraphSettings, patch: SettingsPatch['graph']): GraphSettings {
  const p = patch ?? {};
  return {
    cardWidth: num('graph.cardWidth', p.cardWidth, base.cardWidth),
    columnGap: num('graph.columnGap', p.columnGap, base.columnGap),
    rowGap: num('graph.rowGap', p.rowGap, base.rowGap),
    pairOffset: num('graph.pairOffset', p.pairOffset, base.pairOffset),
    cardColor: color(p.cardColor, base.cardColor),
    orphanColor: color(p.orphanColor, base.orphanColor),
    unreachableColor: color(p.unreachableColor, base.unreachableColor),
    arcColor: color(p.arcColor, base.arcColor),
    titleColor: color(p.titleColor, base.titleColor),
  };
}
