import type { CSSProperties } from 'react';
import type { BackgroundSettings, PanelsSettings } from '../../engine';
import { planStyle } from './previewParts';

/**
 * Aperçu des barres latérales (sujet 320) : les deux bandes repliées (classes `.sidebar-strip` de l'appli), le nom
 * dans le sens réglé, et leur ombre portée sur un bout de plan.
 */
export function SidebarPreview({ panels, background }: { panels: PanelsSettings; background: BackgroundSettings }) {
  const strip = (side: 'left' | 'right', label: string) => (
    <div className={`sidebar-strip sidebar-strip-${side} sidebar-strip-${panels.stripText}`} aria-hidden="true">
      <span className="sidebar-strip-arrow">{side === 'left' ? '»' : '«'}</span>
      <span className="sidebar-strip-label">{label}</span>
    </div>
  );
  return (
    <div className="settings-preview">
      <div
        className="settings-preview-canvas"
        style={{ height: 150, '--bar-shadow': `rgba(0, 0, 0, ${panels.shadow})` } as CSSProperties}
      >
        {strip('left', 'Formes')}
        <div className="settings-preview-plan" style={planStyle(background)} />
        {strip('right', 'Page')}
      </div>
    </div>
  );
}
