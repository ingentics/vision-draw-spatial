import { easing } from '../../engine';
import type { TransitionSettings } from '../../engine';
import { pathOf } from './previewParts';

const WIDTH = 300;
const HEIGHT = 120;
/** Marges du tracé dans le cadre (place des graduations). */
const PAD = { left: 10, right: 10, top: 12, bottom: 22 };
const STEPS = 60;

/**
 * Aperçu des transitions (sujet 320) : la courbe choisie (avancée de la caméra selon le temps, `transitionMath.ts`)
 * et la plage du fondu entre les deux pages marquée dessous.
 */
export function TransitionPreview({ transition }: { transition: TransitionSettings }) {
  const ease = easing(transition.easing);
  const plot = { width: WIDTH - PAD.left - PAD.right, height: HEIGHT - PAD.top - PAD.bottom };
  const at = (t: number, v: number) => ({ x: PAD.left + t * plot.width, y: PAD.top + (1 - v) * plot.height });
  const curve = Array.from({ length: STEPS + 1 }, (_, i) => at(i / STEPS, ease(i / STEPS)));
  const fade = { from: at(transition.fadeStart, 0).x, to: at(transition.fadeEnd, 0).x };
  const bottom = PAD.top + plot.height;
  const seconds = (transition.durationMs / 1000).toLocaleString('fr-FR');
  return (
    <div className={transition.enabled ? 'settings-preview' : 'settings-preview disabled'}>
      <div className="settings-preview-canvas settings-preview-chart" style={{ height: 140 }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <rect
            x={fade.from}
            y={PAD.top}
            width={Math.max(0, fade.to - fade.from)}
            height={plot.height}
            className="fade-band"
          />
          <path d={`M${PAD.left} ${PAD.top}V${bottom}H${WIDTH - PAD.right}`} className="axis" />
          <path d={pathOf(curve)} className="curve" />
          <text x={PAD.left} y={HEIGHT - 6}>
            0
          </text>
          <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end">
            {seconds} s
          </text>
          <text x={(fade.from + fade.to) / 2} y={HEIGHT - 6} textAnchor="middle" className="fade-label">
            fondu
          </text>
        </svg>
      </div>
    </div>
  );
}
