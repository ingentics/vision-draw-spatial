import { SETTINGS_LIMITS } from '../../engine';
import type { SettingsSectionProps } from './types';
import { Section, Subsection } from '../PanelSection';
import { Choice, ColorField, Slider, Toggle } from '../SettingsFields';
import { GraphPreview, TransitionPreview } from '../settingsPreviews';
import { percent } from './formats';

/** Section « Liens entre pages » des paramètres : liens, transitions, vue graphe. */
export function LinkSettings({ settings, onChange }: SettingsSectionProps) {
  const { transition, preload, selection, graph, background } = settings;
  return (
    <Section title="Liens entre pages">
      <Subsection title="Transitions">
        <Toggle
          label="Animer le passage par un lien"
          checked={transition.enabled}
          onChange={(enabled) => onChange({ transition: { enabled } })}
        />
        <Slider
          label="Durée"
          value={transition.durationMs}
          limits={SETTINGS_LIMITS['transition.durationMs']}
          format={(v) => `${(v / 1000).toFixed(2)} s`}
          disabled={!transition.enabled}
          onChange={(durationMs) => onChange({ transition: { durationMs } })}
        />
        <Choice
          label="Courbe"
          value={transition.easing}
          options={[
            ['ease-in-out', 'Douce'],
            ['ease-out', 'Freinée'],
            ['ease-in', 'Accélérée'],
            ['linear', 'Linéaire'],
          ]}
          disabled={!transition.enabled}
          onChange={(easing) => onChange({ transition: { easing } })}
        />
        <Slider
          label="Début du fondu entre les pages"
          value={transition.fadeStart}
          limits={SETTINGS_LIMITS['transition.fadeStart']}
          format={percent}
          disabled={!transition.enabled}
          onChange={(fadeStart) => onChange({ transition: { fadeStart } })}
        />
        <Slider
          label="Fin du fondu entre les pages"
          value={transition.fadeEnd}
          limits={SETTINGS_LIMITS['transition.fadeEnd']}
          format={percent}
          disabled={!transition.enabled}
          onChange={(fadeEnd) => onChange({ transition: { fadeEnd } })}
        />
        <TransitionPreview transition={transition} />
      </Subsection>
      <Subsection title="Préchargement">
        <Toggle
          label="Préparer la page cible au clic sur un lien"
          checked={preload.onClick}
          onChange={(onClick) => onChange({ preload: { onClick } })}
        />
        <Toggle
          label="Préparer au survol prolongé"
          checked={preload.onHover}
          onChange={(onHover) => onChange({ preload: { onHover } })}
        />
        <Slider
          label="Délai de survol"
          value={preload.hoverDelayMs}
          limits={SETTINGS_LIMITS['preload.hoverDelayMs']}
          format={(v) => `${v} ms`}
          disabled={!preload.onHover}
          onChange={(hoverDelayMs) => onChange({ preload: { hoverDelayMs } })}
        />
        <Slider
          label="Pages gardées en mémoire"
          value={preload.maxCachedPages}
          limits={SETTINGS_LIMITS['preload.maxCachedPages']}
          format={(v) => `${v} page${v > 1 ? 's' : ''}`}
          onChange={(maxCachedPages) => onChange({ preload: { maxCachedPages } })}
        />
      </Subsection>
      <Subsection title="Vue graphe">
        <Toggle
          label="Afficher le mini-graphe (à gauche de la mini-carte, de sa largeur)"
          checked={settings.minigraph.visible}
          onChange={(visible) => onChange({ minigraph: { visible } })}
        />
        <Slider
          label="Diamètre des nœuds"
          value={graph.nodeSize}
          limits={SETTINGS_LIMITS['graph.nodeSize']}
          format={(v) => `${v} px`}
          onChange={(nodeSize) => onChange({ graph: { nodeSize } })}
        />
        <Slider
          label="Écart entre les nœuds d’une rangée"
          value={graph.nodeGap}
          limits={SETTINGS_LIMITS['graph.nodeGap']}
          format={(v) => `${v} px`}
          onChange={(nodeGap) => onChange({ graph: { nodeGap } })}
        />
        <Slider
          label="Écart entre les rangées"
          value={graph.layerGap}
          limits={SETTINGS_LIMITS['graph.layerGap']}
          format={(v) => `${v} px`}
          onChange={(layerGap) => onChange({ graph: { layerGap } })}
        />
        <Slider
          label="Durée de la transition graphe ↔ page"
          value={graph.transitionMs}
          limits={SETTINGS_LIMITS['graph.transitionMs']}
          format={(v) => (v === 0 ? 'aucune' : `${v} ms`)}
          onChange={(transitionMs) => onChange({ graph: { transitionMs } })}
        />
        <Slider
          label="Écart entre l’aller et le retour d’un lien"
          value={graph.pairOffset}
          limits={SETTINGS_LIMITS['graph.pairOffset']}
          format={(v) => `${v} px`}
          onChange={(pairOffset) => onChange({ graph: { pairOffset } })}
        />
        <ColorField
          label="Contour des nœuds"
          value={graph.cardColor}
          onChange={(cardColor) => onChange({ graph: { cardColor } })}
        />
        <ColorField
          label="Page orpheline"
          value={graph.orphanColor}
          onChange={(orphanColor) => onChange({ graph: { orphanColor } })}
        />
        <ColorField
          label="Page inaccessible"
          value={graph.unreachableColor}
          onChange={(unreachableColor) => onChange({ graph: { unreachableColor } })}
        />
        <ColorField
          label="Liens entre pages"
          value={graph.arcColor}
          onChange={(arcColor) => onChange({ graph: { arcColor } })}
        />
        <ColorField
          label="Noms des pages"
          value={graph.titleColor}
          onChange={(titleColor) => onChange({ graph: { titleColor } })}
        />
        <p className="hint muted">La page de départ prend la couleur d’accent (Sélection).</p>
        <GraphPreview graph={graph} background={background} accent={selection.accentColor} />
      </Subsection>
    </Section>
  );
}
