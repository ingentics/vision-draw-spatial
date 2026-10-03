import type { ReactElement } from 'react';
import type { ViewMode } from '../engine/interaction/camera';

interface NavigationToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

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
  {
    value: '3d',
    label: '3D',
    title:
      'Vue 3D en perspective : molette = zoom, glisser molette = déplacer, glisser clic droit = tourner / incliner (touche P pour basculer)',
    // Sol en perspective : grille qui fuit vers l'horizon.
    icon: <path d="M5 3.5h6l3.5 9h-13zM8 3.5v9M3.2 8h9.6M6.5 3.5 4.8 12.5M9.5 3.5l1.7 9" />,
  },
];

/** Mode de vue (groupe de boutons liés). */
export function NavigationToolbar({ viewMode, onViewModeChange }: NavigationToolbarProps) {
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
    </div>
  );
}
