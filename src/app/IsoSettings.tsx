import { useEffect, useRef, useState } from 'react';
import { ISOMETRIC_ELEVATION_DEG } from '../engine/interaction/camera';
import type { IsoPreferences } from './viewPreferences';

interface IsoSettingsProps {
  value: IsoPreferences;
  onChange: (patch: Partial<IsoPreferences>) => void;
}

const ORIENTATIONS: Array<{ azimuth: number; label: string }> = [
  { azimuth: -45, label: 'Vers la droite' },
  { azimuth: 45, label: 'Vers la gauche' },
  { azimuth: 0, label: 'Sans rotation' },
];

/** Réglages de la vue isométrique : orientation (avec aperçu) et élévation de la caméra. */
export function IsoSettings({ value, onChange }: IsoSettingsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const elevation = Math.round(value.isoAngleDeg);
  const isTrueIso = Math.abs(value.isoAngleDeg - ISOMETRIC_ELEVATION_DEG) < 0.5;

  return (
    <div className="iso-settings" ref={rootRef}>
      <button
        type="button"
        className="icon-button settings-button"
        aria-label="Réglages de la vue isométrique"
        aria-expanded={open}
        title="Réglages de la vue isométrique"
        onClick={() => setOpen((o) => !o)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="2.2" />
          <path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M3.6 12.4 5 11M11 5l1.4-1.4" />
        </svg>
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Réglages de la vue isométrique">
          <div className="popover-title">Vue isométrique</div>

          <div className="field-label">Orientation</div>
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

          <label className="field-label" htmlFor="iso-elevation">
            Élévation de la caméra : {elevation}°
          </label>
          <input
            id="iso-elevation"
            type="range"
            min={10}
            max={80}
            step={1}
            value={elevation}
            onChange={(event) => onChange({ isoAngleDeg: Number(event.target.value) })}
          />
          <div className="range-hints muted">
            <span>rasante</span>
            <span>vue de dessus</span>
          </div>
          <button
            type="button"
            className="button"
            disabled={isTrueIso}
            onClick={() => onChange({ isoAngleDeg: ISOMETRIC_ELEVATION_DEG })}
          >
            Isométrie vraie (35°)
          </button>
        </div>
      )}
    </div>
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
