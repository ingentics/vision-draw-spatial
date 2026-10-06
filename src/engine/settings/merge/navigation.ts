import type { ControlSettings } from '../../interaction/controls';
import { FOLLOW_LINK_GESTURES, FOLLOW_LINK_KEYS, MULTI_SELECT_KEYS } from '../../interaction/selection';
import type { AccessibilitySettings, PreloadSettings, SettingsPatch, TransitionSettings } from '../types';
import { bool, code, num, oneOf } from '../validate';

/** Fusion des réglages de navigation : transitions, préchargement, contrôles, accessibilité. */

const EASINGS = ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const;
const MOVE_KEYS = ['letters', 'arrows', 'all'] as const;
const REDUCED_MOTION = ['system', 'always', 'never'] as const;

export function mergeTransition(base: TransitionSettings, patch: SettingsPatch['transition']): TransitionSettings {
  const p = patch ?? {};
  return {
    enabled: bool(p.enabled, base.enabled),
    durationMs: num('transition.durationMs', p.durationMs, base.durationMs),
    easing: oneOf(EASINGS, p.easing, base.easing),
    fadeStart: num('transition.fadeStart', p.fadeStart, base.fadeStart),
    fadeEnd: num('transition.fadeEnd', p.fadeEnd, base.fadeEnd),
  };
}

export function mergePreload(base: PreloadSettings, patch: SettingsPatch['preload']): PreloadSettings {
  const p = patch ?? {};
  return {
    onClick: bool(p.onClick, base.onClick),
    onHover: bool(p.onHover, base.onHover),
    hoverDelayMs: num('preload.hoverDelayMs', p.hoverDelayMs, base.hoverDelayMs),
    maxCachedPages: Math.round(num('preload.maxCachedPages', p.maxCachedPages, base.maxCachedPages)),
  };
}

export function mergeControls(base: ControlSettings, patch: SettingsPatch['controls']): ControlSettings {
  const p = patch ?? {};
  const s = p.shortcuts ?? {};
  return {
    moveKeys: oneOf(MOVE_KEYS, p.moveKeys, base.moveKeys),
    moveSpeed: num('controls.moveSpeed', p.moveSpeed, base.moveSpeed),
    zoomSpeed: num('controls.zoomSpeed', p.zoomSpeed, base.zoomSpeed),
    decelerationMs: num('controls.decelerationMs', p.decelerationMs, base.decelerationMs),
    orbitSpeed: num('controls.orbitSpeed', p.orbitSpeed, base.orbitSpeed),
    multiSelectKey: oneOf(MULTI_SELECT_KEYS, p.multiSelectKey, base.multiSelectKey),
    followLinkKey: oneOf(FOLLOW_LINK_KEYS, p.followLinkKey, base.followLinkKey),
    followLinkGesture: oneOf(FOLLOW_LINK_GESTURES, p.followLinkGesture, base.followLinkGesture),
    rotateSpeed: num('controls.rotateSpeed', p.rotateSpeed, base.rotateSpeed),
    clickSlop: num('controls.clickSlop', p.clickSlop, base.clickSlop),
    maxReleaseSpeed: num('controls.maxReleaseSpeed', p.maxReleaseSpeed, base.maxReleaseSpeed),
    releaseWindowMs: num('controls.releaseWindowMs', p.releaseWindowMs, base.releaseWindowMs),
    stopSpeed: num('controls.stopSpeed', p.stopSpeed, base.stopSpeed),
    shortcuts: {
      toggleViewMode: code(s.toggleViewMode, base.shortcuts.toggleViewMode),
      toggle3d: code(s.toggle3d, base.shortcuts.toggle3d),
      toggleGraph: code(s.toggleGraph, base.shortcuts.toggleGraph),
      toggleMinimap: code(s.toggleMinimap, base.shortcuts.toggleMinimap),
      toggleFlatten: code(s.toggleFlatten, base.shortcuts.toggleFlatten),
      overview: code(s.overview, base.shortcuts.overview),
      back: code(s.back, base.shortcuts.back),
      deleteSelection: code(s.deleteSelection, base.shortcuts.deleteSelection),
      placementVariant: code(s.placementVariant, base.shortcuts.placementVariant),
      editComment: code(s.editComment, base.shortcuts.editComment),
    },
  };
}

export function mergeAccessibility(
  base: AccessibilitySettings,
  patch: SettingsPatch['accessibility'],
): AccessibilitySettings {
  const p = patch ?? {};
  return {
    reducedMotion: oneOf(REDUCED_MOTION, p.reducedMotion, base.reducedMotion),
  };
}
