import type { ReactElement } from 'react';
import type { ControlSettings } from '../engine/interaction/controls';

type MiddleDrag = ControlSettings['middleDrag'];

type ViewMode = 'top' | 'iso';

interface NavigationToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  middleDrag: MiddleDrag;
  onMiddleDragChange: (mode: MiddleDrag) => void;
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

const VIEW_MODES: Array<{ value: ViewMode; label: string; title: string; icon: ReactElement }> = [
  {
    value: 'top',
    label: '2D',
    title: 'Vue 2D, à plat comme draw.io (touche I pour basculer)',
    icon: <path d="M2.5 2.5h11v11h-11zM2.5 8h11M8 2.5v11" />,
  },
  {
    value: 'iso',
    label: 'Iso',
    title: 'Vue isométrique : le schéma posé au sol (touche I pour basculer)',
    icon: <path d="M8 2.5 14 6 8 9.5 2 6zM2 6v4l6 3.5 6-3.5V6M8 9.5v4" />, // même icône que la section iso des paramètres
  },
];

/** Mode de vue et mode du glisser molette (groupes de boutons liés). */
export function NavigationToolbar({
  viewMode,
  onViewModeChange,
  middleDrag,
  onMiddleDragChange,
}: NavigationToolbarProps) {
  return (
    <div className="nav-tools">
      <div className="button-group" role="group" aria-label="Mode de vue">
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            className="group-button"
            aria-pressed={viewMode === mode.value}
            title={mode.title}
            onClick={() => onViewModeChange(mode.value)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {mode.icon}
            </svg>
            {mode.label}
          </button>
        ))}
      </div>
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
    </div>
  );
}
