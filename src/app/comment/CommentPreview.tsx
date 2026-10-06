import { useEffect, useRef, useState } from 'react';
import type { BackgroundSettings, CommentSettings } from '../../engine/settings';
import { CommentCard } from './CommentCard';

const PREVIEW_TEXT = 'Appel HTTP synchrone vers le service de paiement\ntimeout 2 s, 3 essais';

/**
 * Aperçu du commentaire dans les paramètres : un rendu factice (fond et grille des réglages) avec le commentaire
 * affiché, qui suit les réglages en direct. « Rejouer le fondu » le fait disparaître puis réapparaître.
 */
export function CommentPreview({
  settings,
  background,
}: {
  settings: CommentSettings;
  background: BackgroundSettings;
}) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const replay = () => {
    clearTimeout(timer.current);
    setVisible(false);
    timer.current = setTimeout(() => setVisible(true), settings.fadeOutMs + 300);
  };
  const line = background.grid ? background.gridColor : 'transparent';
  const step = background.gridSize * 2;
  return (
    <div className="comment-preview">
      <div
        className="comment-preview-canvas"
        style={{
          backgroundColor: background.color,
          backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: `${step}px ${step}px`,
        }}
      >
        <div className="comment-preview-shape" style={{ left: '12%', top: '18%' }} />
        <div className="comment-preview-shape" style={{ left: '58%', top: '30%' }} />
        <div className="comment-preview-shape" style={{ left: '30%', top: '62%' }} />
        <CommentCard comment={visible ? { text: PREVIEW_TEXT } : undefined} settings={settings} />
      </div>
      <button type="button" className="button" onClick={replay}>
        Rejouer le fondu
      </button>
    </div>
  );
}
