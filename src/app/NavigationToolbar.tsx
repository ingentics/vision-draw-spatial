import type { ReactElement } from 'react';
import type { ControlSettings } from '../engine/interaction/controls';

type MiddleDrag = ControlSettings['middleDrag'];

interface NavigationToolbarProps {
  middleDrag: MiddleDrag;
  onMiddleDragChange: (mode: MiddleDrag) => void;
  /** Orientation de la vue, en degrés arrondis. */
  rotationDeg: number;
  onResetRotation: () => void;
}

const MODES: Array<{ value: MiddleDrag; label: string; title: string; icon: ReactElement }> = [
  {
    value: 'pan',
    label: 'Déplacer',
    title: 'Glisser avec la molette enfoncée : déplacer la vue',
    icon: (
      <path d="M8 1.5v13M1.5 8h13M8 1.5 6 3.5M8 1.5l2 2M8 14.5l-2-2M8 14.5l2-2M1.5 8l2-2M1.5 8l2 2M14.5 8l-2-2M14.5 8l-2 2" />
    ),
  },
  {
    value: 'rotate',
    label: 'Tourner',
    title: 'Glisser avec la molette enfoncée : tourner la vue',
    icon: <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 1.8v2.8h-2.8" />,
  },
];

/** Mode du glisser molette (groupe de boutons liés) et remise à zéro de l'orientation. */
export function NavigationToolbar({
  middleDrag,
  onMiddleDragChange,
  rotationDeg,
  onResetRotation,
}: NavigationToolbarProps) {
  return (
    <div className="nav-tools">
      <div className="button-group" role="group" aria-label="Glisser avec la molette">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            className="group-button"
            aria-pressed={middleDrag === mode.value}
            title={mode.title}
            onClick={() => onMiddleDragChange(mode.value)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {mode.icon}
            </svg>
            {mode.label}
          </button>
        ))}
      </div>
      {rotationDeg !== 0 && (
        <button type="button" className="button" title="Remettre le nord en haut" onClick={onResetRotation}>
          {/* La flèche indique où se trouve le nord de la page à l'écran. */}
          <svg
            viewBox="0 0 16 16"
            aria-hidden="true"
            style={{ transform: `rotate(${-rotationDeg}deg)` }}
            className="compass"
          >
            <path d="M8 1.5 11 13 8 10.5 5 13Z" />
          </svg>
          Nord ({rotationDeg}°)
        </button>
      )}
    </div>
  );
}
