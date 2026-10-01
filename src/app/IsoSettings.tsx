import { ISOMETRIC_ELEVATION_DEG } from '../engine/interaction/camera';
import type { ViewSettings } from '../engine/settings';

type IsoPreferences = Pick<ViewSettings, 'isoAngleDeg' | 'isoAzimuthDeg'>;

interface IsoSettingsProps {
  value: IsoPreferences;
  onChange: (patch: Partial<IsoPreferences>) => void;
}

const ORIENTATIONS: Array<{ azimuth: number; label: string }> = [
  { azimuth: -45, label: 'Vers la droite' },
  { azimuth: 45, label: 'Vers la gauche' },
  { azimuth: 0, label: 'Sans rotation' },
];

/** Icône de la vue isométrique (cube posé), partagée par la barre d'outils et les paramètres. */
export function IsoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="iso-icon" aria-hidden="true">
      <path d="M8 2.5 14 6 8 9.5 2 6zM2 6v4l6 3.5 6-3.5V6M8 9.5v4" />
    </svg>
  );
}

/**
 * Réglages de la vue isométrique (section du panneau Paramètres) : orientation avec aperçu
 * dessiné, élévation de la caméra, retour à l'isométrie vraie.
 */
export function IsoSettings({ value, onChange }: IsoSettingsProps) {
  const elevation = Math.round(value.isoAngleDeg);
  const isTrueIso = Math.abs(value.isoAngleDeg - ISOMETRIC_ELEVATION_DEG) < 0.5;

  return (
    <>
      <div className="field">
        <span className="field-row">Orientation</span>
        <div className="orientation-choices" role="radiogroup" aria-label="Orientation">
          {ORIENTATIONS.map((option) => (
            <button
              key={option.azimuth}
              type="button"
              role="radio"
              aria-checked={value.isoAzimuthDeg === option.azimuth}
              className="orientation-choice"
              onClick={() => onChange({ isoAzimuthDeg: option.azimuth })}
            >
              <Preview azimuthDeg={option.azimuth} elevationDeg={value.isoAngleDeg} />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-row">
          <span>Élévation de la caméra</span>
          <span className="field-value">{elevation}°</span>
        </span>
        <input
          type="range"
          min={10}
          max={80}
          step={1}
          value={elevation}
          onChange={(event) => onChange({ isoAngleDeg: Number(event.target.value) })}
        />
        <span className="range-hints muted">
          <span>rasante</span>
          <span>vue de dessus</span>
        </span>
      </label>
      <button
        type="button"
        className="button"
        disabled={isTrueIso}
        onClick={() => onChange({ isoAngleDeg: ISOMETRIC_ELEVATION_DEG })}
      >
        Isométrie vraie (35°)
      </button>
    </>
  );
}

/**
 * Aperçu d'une page rectangulaire vue en iso : même projection que le moteur
 * (rotation de l'azimut, hauteur raccourcie de cos(inclinaison)). Le point marque le coin haut-gauche.
 */
function Preview({ azimuthDeg, elevationDeg }: { azimuthDeg: number; elevationDeg: number }) {
  const r = (azimuthDeg * Math.PI) / 180;
  const k = Math.cos(((90 - elevationDeg) * Math.PI) / 180);
  const matrix = [Math.cos(r), -Math.sin(r) * k, Math.sin(r), Math.cos(r) * k, 24, 16].join(' ');
  return (
    <svg viewBox="0 0 48 32" className="orientation-preview" aria-hidden="true">
      <g transform={`matrix(${matrix})`}>
        <rect x={-14} y={-8} width={28} height={16} />
        <circle cx={-14} cy={-8} r={2.2} />
      </g>
    </svg>
  );
}
