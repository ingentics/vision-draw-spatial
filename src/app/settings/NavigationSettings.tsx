import { SETTINGS_LIMITS } from '../../engine';
import type { SettingsSectionProps } from './types';
import { Section, Subsection } from '../PanelSection';
import { Choice, Slider } from '../SettingsFields';

/** Section « Navigation » des paramètres : clavier, glisser, souris. */
export function NavigationSettings({ settings, onChange }: SettingsSectionProps) {
  const { controls } = settings;
  return (
    <Section title="Navigation">
      <Subsection title="Clavier">
        <Choice
          label="Touches de déplacement"
          value={controls.moveKeys}
          options={[
            ['all', 'Lettres + flèches'],
            ['letters', 'ZQSD / WASD'],
            ['arrows', 'Flèches'],
          ]}
          onChange={(moveKeys) => onChange({ controls: { moveKeys } })}
        />
        <Slider
          label="Vitesse au clavier"
          value={controls.moveSpeed}
          limits={SETTINGS_LIMITS['controls.moveSpeed']}
          format={(v) => `${v} px/s`}
          onChange={(moveSpeed) => onChange({ controls: { moveSpeed } })}
        />
        <Slider
          label="Rotation au clavier (A / E, iso et 3D)"
          value={controls.rotateSpeed}
          limits={SETTINGS_LIMITS['controls.rotateSpeed']}
          format={(v) => `${v}°/s`}
          onChange={(rotateSpeed) => onChange({ controls: { rotateSpeed } })}
        />
        <Slider
          label="Glissade à l’arrêt"
          value={controls.decelerationMs}
          limits={SETTINGS_LIMITS['controls.decelerationMs']}
          format={(v) => (v === 0 ? 'aucune' : `${v} ms`)}
          onChange={(decelerationMs) => onChange({ controls: { decelerationMs } })}
        />
      </Subsection>
      <Subsection title="Glisser">
        <Slider
          label="Déplacement au-delà duquel un clic devient un glisser"
          value={controls.clickSlop}
          limits={SETTINGS_LIMITS['controls.clickSlop']}
          format={(v) => `${v} px`}
          onChange={(clickSlop) => onChange({ controls: { clickSlop } })}
        />
        <Slider
          label="Vitesse maximale au lâcher"
          value={controls.maxReleaseSpeed}
          limits={SETTINGS_LIMITS['controls.maxReleaseSpeed']}
          format={(v) => `${v} px/s`}
          onChange={(maxReleaseSpeed) => onChange({ controls: { maxReleaseSpeed } })}
        />
        <Slider
          label="Mesure de la vitesse au lâcher, sur les dernières"
          value={controls.releaseWindowMs}
          limits={SETTINGS_LIMITS['controls.releaseWindowMs']}
          format={(v) => `${v} ms`}
          onChange={(releaseWindowMs) => onChange({ controls: { releaseWindowMs } })}
        />
        <Slider
          label="Arrêt de la glissade sous"
          value={controls.stopSpeed}
          limits={SETTINGS_LIMITS['controls.stopSpeed']}
          format={(v) => `${v} px/s`}
          onChange={(stopSpeed) => onChange({ controls: { stopSpeed } })}
        />
        <p className="hint muted">
          Un glisser rapide de la vue continue sur sa lancée (glissade à l’arrêt), à la vitesse mesurée juste avant de
          lâcher.
        </p>
      </Subsection>
      <Subsection title="Souris">
        <Slider
          label="Sensibilité de la molette (zoom)"
          value={controls.zoomSpeed}
          limits={SETTINGS_LIMITS['controls.zoomSpeed']}
          format={(v) => `×${(v / 0.0015).toFixed(1)}`}
          onChange={(zoomSpeed) => onChange({ controls: { zoomSpeed } })}
        />
        <Slider
          label="Sensibilité de la rotation (clic droit, iso et 3D)"
          value={controls.orbitSpeed}
          limits={SETTINGS_LIMITS['controls.orbitSpeed']}
          format={(v) => `${((v * 100 * 180) / Math.PI).toFixed(0)}° / 100 px`}
          onChange={(orbitSpeed) => onChange({ controls: { orbitSpeed } })}
        />
      </Subsection>
    </Section>
  );
}
