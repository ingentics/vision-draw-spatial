import { SETTINGS_LIMITS } from '../../engine';
import type { SettingsSectionProps } from './types';
import { IsoIcon, IsoSettings } from '../IsoSettings';
import { Section, Subsection } from '../PanelSection';
import { Choice, ColorField, Slider, Toggle } from '../SettingsFields';
import { BackgroundPreview, VolumePreview } from '../settingsPreviews';
import { ms, percent } from './formats';
import { SectionPreview } from './settingsTree';

/** Section « Vue » des paramètres : modes, iso, volumes, transitions. */
export function ViewSettings({
  settings,
  onChange,
  onResetOrientation,
}: SettingsSectionProps & { onResetOrientation: () => void }) {
  const { view, camera, background } = settings;
  return (
    <Section title="Vue">
      <Subsection title="Modes">
        <Choice
          label="Mode à l’ouverture"
          value={view.defaultMode}
          options={[
            ['top', '2D'],
            ['iso', 'Iso'],
            ['3d', '3D'],
          ]}
          onChange={(defaultMode) => onChange({ view: { defaultMode } })}
        />
        <Slider
          label="Durée de la bascule 2D ↔ iso ↔ 3D"
          value={view.switchDurationMs}
          limits={SETTINGS_LIMITS['view.switchDurationMs']}
          format={(v) => (v === 0 ? 'instantanée' : `${v} ms`)}
          onChange={(switchDurationMs) => onChange({ view: { switchDurationMs } })}
        />
      </Subsection>
      <Subsection
        title={
          <>
            <IsoIcon />
            Vue isométrique
          </>
        }
      >
        <IsoSettings
          value={view}
          onChange={(patch) => onChange({ view: patch })}
          onResetOrientation={onResetOrientation}
        />
      </Subsection>
      <Subsection title="Vue 3D">
        <Slider
          label="Champ de vision"
          value={camera.fovDeg}
          limits={SETTINGS_LIMITS['camera.fovDeg']}
          format={(v) => `${v}°`}
          onChange={(fovDeg) => onChange({ camera: { fovDeg } })}
        />
        <Slider
          label="Inclinaison maximale"
          value={camera.maxTilt3dDeg}
          limits={SETTINGS_LIMITS['camera.maxTilt3dDeg']}
          format={(v) => `${v}°`}
          onChange={(maxTilt3dDeg) => onChange({ camera: { maxTilt3dDeg } })}
        />
        <Slider
          label="Dézoom maximal (3D)"
          value={camera.minZoom3d}
          limits={SETTINGS_LIMITS['camera.minZoom3d']}
          format={percent}
          onChange={(minZoom3d) => onChange({ camera: { minZoom3d } })}
        />
        <Slider
          label="Zoom maximal (3D)"
          value={camera.maxZoom3d}
          limits={SETTINGS_LIMITS['camera.maxZoom3d']}
          format={percent}
          onChange={(maxZoom3d) => onChange({ camera: { maxZoom3d } })}
        />
      </Subsection>
      <Subsection title="Volumes (iso et 3D)">
        <Toggle
          label="Formes en volume"
          checked={view.isoVolume}
          onChange={(isoVolume) => onChange({ view: { isoVolume } })}
        />
        <Slider
          label="Épaisseur par défaut"
          value={view.isoDepth}
          limits={SETTINGS_LIMITS['view.isoDepth']}
          format={(v) => `${v} px`}
          disabled={!view.isoVolume}
          onChange={(isoDepth) => onChange({ view: { isoDepth } })}
        />
        <p className="hint muted">Par forme : style draw.io « spatial.height=… »</p>
        <Slider
          label="Luminosité de la face éclairée"
          value={view.shadeLight}
          limits={SETTINGS_LIMITS['view.shadeLight']}
          format={percent}
          disabled={!view.isoVolume}
          onChange={(shadeLight) => onChange({ view: { shadeLight } })}
        />
        <Slider
          label="Luminosité de la face à l’ombre"
          value={view.shadeDark}
          limits={SETTINGS_LIMITS['view.shadeDark']}
          format={percent}
          disabled={!view.isoVolume}
          onChange={(shadeDark) => onChange({ view: { shadeDark } })}
        />
        <VolumePreview view={view} background={background} />
      </Subsection>
    </Section>
  );
}

/** Section « Caméra » des paramètres. */
export function CameraSettings({ settings, onChange }: SettingsSectionProps) {
  const { camera } = settings;
  return (
    <Section title="Caméra">
      <Subsection title="Zoom (2D et iso)">
        <Slider
          label="Dézoom maximal"
          value={camera.minZoom}
          limits={SETTINGS_LIMITS['camera.minZoom']}
          format={percent}
          onChange={(minZoom) => onChange({ camera: { minZoom } })}
        />
        <Slider
          label="Zoom maximal"
          value={camera.maxZoom}
          limits={SETTINGS_LIMITS['camera.maxZoom']}
          format={percent}
          onChange={(maxZoom) => onChange({ camera: { maxZoom } })}
        />
      </Subsection>
      <Subsection title="Animations de la caméra">
        <Slider
          label="Durée (vue globale, réinitialiser la vue, aller à un élément)"
          value={camera.animationMs}
          limits={SETTINGS_LIMITS['camera.animationMs']}
          format={ms}
          onChange={(animationMs) => onChange({ camera: { animationMs } })}
        />
      </Subsection>
      <Subsection title="Aller à un élément (diagnostics, liens)">
        <Slider
          label="Zoom maximal"
          value={camera.focusMaxZoom}
          limits={SETTINGS_LIMITS['camera.focusMaxZoom']}
          format={percent}
          onChange={(focusMaxZoom) => onChange({ camera: { focusMaxZoom } })}
        />
        <Slider
          label="Marge autour de l’élément"
          value={camera.focusPadding}
          limits={SETTINGS_LIMITS['camera.focusPadding']}
          format={(v) => `${v} px`}
          onChange={(focusPadding) => onChange({ camera: { focusPadding } })}
        />
      </Subsection>
    </Section>
  );
}

/** Section « Fond et grille » des paramètres. */
export function BackgroundSettings({ settings, onChange }: SettingsSectionProps) {
  const { background } = settings;
  return (
    <Section title="Fond et grille">
      <Subsection title="Fond">
        <ColorField
          label="Couleur du fond"
          value={background.color}
          onChange={(color) => onChange({ background: { color } })}
        />
      </Subsection>
      <Subsection title="Grille">
        <Toggle
          label="Afficher la grille"
          checked={background.grid}
          onChange={(grid) => onChange({ background: { grid } })}
        />
        <Toggle
          label="Pas de la page draw.io quand elle en a un"
          checked={background.gridFromPage}
          disabled={!background.grid}
          onChange={(gridFromPage) => onChange({ background: { gridFromPage } })}
        />
        <Slider
          label={background.gridFromPage ? 'Pas par défaut' : 'Pas de la grille'}
          value={background.gridSize}
          limits={SETTINGS_LIMITS['background.gridSize']}
          format={(v) => `${v} px`}
          disabled={!background.grid}
          onChange={(gridSize) => onChange({ background: { gridSize } })}
        />
        <Slider
          label="Ligne principale"
          value={background.majorEvery}
          limits={SETTINGS_LIMITS['background.majorEvery']}
          format={(v) => (v === 1 ? 'aucune' : `toutes les ${v} cases`)}
          disabled={!background.grid}
          onChange={(majorEvery) => onChange({ background: { majorEvery } })}
        />
        <ColorField
          label="Couleur de la grille"
          value={background.gridColor}
          disabled={!background.grid}
          onChange={(gridColor) => onChange({ background: { gridColor } })}
        />
        <Slider
          label="Intensité des lignes secondaires"
          value={background.minorStrength}
          limits={SETTINGS_LIMITS['background.minorStrength']}
          format={percent}
          disabled={!background.grid || background.majorEvery === 1}
          onChange={(minorStrength) => onChange({ background: { minorStrength } })}
        />
      </Subsection>
      <SectionPreview>
        <BackgroundPreview background={background} />
      </SectionPreview>
    </Section>
  );
}
