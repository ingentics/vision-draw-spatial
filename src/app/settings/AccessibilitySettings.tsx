import type { SettingsSectionProps } from './types';
import { useEffect, useState } from 'react';
import { Section } from '../PanelSection';
import { Choice, Toggle } from '../SettingsFields';

/** Sections « Accessibilité » et « Diagnostics » des paramètres. */
export function AccessibilitySettings({ settings, onChange }: SettingsSectionProps) {
  const { accessibility, debug } = settings;
  const systemReduced = useSystemReducedMotion();
  return (
    <>
      <Section title="Accessibilité">
        <Choice
          label="Réduire les animations"
          value={accessibility.reducedMotion}
          options={[
            ['system', 'Comme le système'],
            ['always', 'Toujours'],
            ['never', 'Jamais'],
          ]}
          onChange={(reducedMotion) => onChange({ accessibility: { reducedMotion } })}
        />
        <p className="hint muted">
          Système : {systemReduced ? 'animations réduites demandées' : 'animations normales'}. Réduites = transitions,
          bascule iso, vue globale et glissade instantanées.
        </p>
      </Section>

      <Section title="Diagnostics">
        <Toggle
          label="Bouton « Diagnostics » (erreurs, non supportés, avertissements)"
          checked={debug.showUnsupportedPanel}
          onChange={(showUnsupportedPanel) => onChange({ debug: { showUnsupportedPanel } })}
        />
      </Section>
    </>
  );
}

function useSystemReducedMotion(): boolean {
  const [query] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)'));
  const [reduced, setReduced] = useState(query?.matches ?? false);
  useEffect(() => {
    if (!query) return;
    const update = () => setReduced(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, [query]);
  return reduced;
}
