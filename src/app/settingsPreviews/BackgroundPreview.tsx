import type { BackgroundSettings } from '../../engine';
import { planStyle } from './previewParts';

/**
 * Aperçu du fond et de la grille (sujet 320) : un carré de plan au zoom 100 %, avec la couleur du fond, la grille, ses
 * lignes principales et l'intensité des lignes secondaires.
 */
export function BackgroundPreview({ background }: { background: BackgroundSettings }) {
  return (
    <div className="settings-preview">
      <div className="settings-preview-canvas" style={{ ...planStyle(background), width: 200, height: 200 }} />
    </div>
  );
}
