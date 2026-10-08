import type { CSSProperties, ReactNode } from 'react';
import { distance } from '../../engine';
import type { BackgroundSettings, Point, Rect } from '../../engine';
import './settingsPreviews.css';

/**
 * Briques des aperçus des paramètres (sujets 320, 321) : un bout de plan (fond et grille des réglages) et des
 * dessins SVG simples, sans moteur Three.js, qui suivent les réglages en direct.
 */

/** Couleur `a` mélangée à `b` (#rrggbb) : `t` = 0 donne `a`, 1 donne `b` ; au-delà de 1, `b` éclaircie. */
export function mixColor(a: string, b: string, t: number): string {
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0);
  const ca = channels(a);
  const cb = channels(b);
  return `#${ca
    .map((v, i) => Math.round(Math.min(255, Math.max(0, v + (cb[i]! - v) * t))))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Fond d'un bout de plan, comme la grille du moteur (`render/grid.ts`) : lignes d'un pixel tous les `gridSize`
 * pixels de page (× `zoom`), principales pleines toutes les `majorEvery` cases, secondaires mêlées au fond selon
 * `minorStrength`.
 */
export function planStyle(background: BackgroundSettings, zoom = 1): CSSProperties {
  if (!background.grid) return { backgroundColor: background.color };
  const lines = (color: string, size: number) => ({
    images: [`linear-gradient(${color} 1px, transparent 1px)`, `linear-gradient(90deg, ${color} 1px, transparent 1px)`],
    sizes: [`${size}px ${size}px`, `${size}px ${size}px`],
  });
  const cell = background.gridSize * zoom;
  const layers =
    background.majorEvery > 1
      ? [
          lines(background.gridColor, cell * background.majorEvery),
          lines(mixColor(background.color, background.gridColor, background.minorStrength), cell),
        ]
      : [lines(background.gridColor, cell)];
  return {
    backgroundColor: background.color,
    backgroundImage: layers.flatMap((layer) => layer.images).join(', '),
    backgroundSize: layers.flatMap((layer) => layer.sizes).join(', '),
  };
}

/**
 * Cadre d'un aperçu : un bout de plan de hauteur `height` (pixels CSS) ; `viewBox` : contenu SVG en pixels de page,
 * centré. Placé en bas d'une section ou d'une sous-section des paramètres (classe `settings-preview`).
 */
export function PreviewFrame({
  background,
  height,
  zoom = 1,
  viewBox,
  hint,
  disabled,
  children,
}: {
  background: BackgroundSettings;
  height: number;
  /** Échelle du plan derrière le dessin (pixels CSS par pixel de page). */
  zoom?: number;
  viewBox?: string;
  /** Aide sous l'aperçu. */
  hint?: ReactNode;
  /** Réglages illustrés sans effet (ex. mini-carte masquée) : aperçu estompé. */
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={disabled ? 'settings-preview disabled' : 'settings-preview'}>
      <div className="settings-preview-canvas" style={{ ...planStyle(background, zoom), height }}>
        {viewBox ? <svg viewBox={viewBox}>{children}</svg> : children}
      </div>
      {hint && <p className="hint muted">{hint}</p>}
    </div>
  );
}

/** Tracé SVG d'une polyligne. */
export const pathOf = (points: readonly Point[]) =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

/** Pointe « classic » de draw.io (taille 6 par défaut) au bout d'un tracé. */
export function ArrowHead({ points, color, size = 6 }: { points: readonly Point[]; color: string; size?: number }) {
  const tip = points[points.length - 1]!;
  const from = points[points.length - 2]!;
  const length = distance(from, tip) || 1;
  const u = { x: (tip.x - from.x) / length, y: (tip.y - from.y) / length };
  const at = (back: number, side: number) => ({
    x: tip.x - u.x * back - u.y * side,
    y: tip.y - u.y * back + u.x * side,
  });
  const corners = [tip, at(size * 1.5, size / 1.5), at(size, 0), at(size * 1.5, -size / 1.5)];
  return <path d={`${pathOf(corners)} Z`} fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />;
}

/** Forme d'aperçu : rectangle draw.io par défaut (fond blanc, bord noir), texte centré. */
export function PreviewShape({
  rect,
  label,
  fontSize = 11,
  onClick,
}: {
  rect: Rect;
  label?: string;
  fontSize?: number;
  onClick?: () => void;
}) {
  return (
    <g onClick={onClick} className={onClick ? 'settings-preview-pick' : undefined}>
      <rect {...rect} fill="#ffffff" stroke="#000000" strokeWidth={1} />
      {label && (
        <text
          x={rect.x + rect.width / 2}
          y={rect.y + rect.height / 2}
          fontSize={fontSize}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#000000"
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** Centre du côté droit, gauche, haut ou bas d'un rectangle. */
export const sideOf = (rect: Rect, side: 'e' | 'w' | 'n' | 's'): Point =>
  side === 'e'
    ? { x: rect.x + rect.width, y: rect.y + rect.height / 2 }
    : side === 'w'
      ? { x: rect.x, y: rect.y + rect.height / 2 }
      : side === 'n'
        ? { x: rect.x + rect.width / 2, y: rect.y }
        : { x: rect.x + rect.width / 2, y: rect.y + rect.height };
