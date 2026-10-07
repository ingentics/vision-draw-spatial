import { useState } from 'react';
import type { CSSProperties } from 'react';
import { parseRichHtml, richToHtml } from '../../engine';
import type { CommentSettings, ElementComment } from '../../engine';
import './comment.css';

/**
 * Commentaire de l'élément survolé (flèche ou forme), en bas à gauche du rendu, sur un voile dégradé dont la courbe
 * finit au-dessus et à droite du texte (réglages `comment`) : apparaît en fondu, et disparaît en fondu à la sortie de
 * l'élément en gardant son texte le temps du fondu. Mise en forme partielle (HTML) affichée.
 */
export function CommentCard({ comment, settings }: { comment: ElementComment | undefined; settings: CommentSettings }) {
  const [shown, setShown] = useState(comment);
  if (comment !== undefined && comment !== shown) setShown(comment);
  if (shown === undefined) return null;
  return (
    <div
      className={`comment-card${comment !== undefined ? ' visible' : ''}`}
      role="status"
      style={commentCardStyle(settings)}
      onTransitionEnd={(event) => event.target === event.currentTarget && comment === undefined && setShown(undefined)}
    >
      {shown.html !== undefined ? (
        <div className="comment-text" dangerouslySetInnerHTML={{ __html: richToHtml(parseRichHtml(shown.html)) }} />
      ) : (
        <div className="comment-text">{shown.text}</div>
      )}
    </div>
  );
}

/** Géométrie, couleurs et durées de l'encart (variables CSS de `comment.css`), d'après les réglages. */
export function commentCardStyle(settings: CommentSettings): CSSProperties {
  const veil = (opacity: number) => `color-mix(in srgb, ${settings.veilColor} ${opacity * 100}%, transparent)`;
  return {
    padding: `${settings.marginTop}px ${settings.marginRight}px ${settings.padding}px ${settings.padding}px`,
    '--comment-veil-corner': veil(settings.opacityCorner),
    '--comment-veil-edge': veil(settings.opacityEdge),
    '--comment-radius': `${settings.curveRadius}px`,
    // Flou gaussien : la transition de 10 % à 90 % s'étend sur ~2,5 écarts-types.
    '--comment-fade': `${settings.fadeLength / 2.5}px`,
    // Le voile déborde des bords gauche et bas du rendu : le dégradé de son contour ne les éclaircit pas.
    '--comment-overflow': `${settings.fadeLength + 20}px`,
    '--comment-fade-in': `${settings.fadeInMs}ms`,
    '--comment-fade-out': `${settings.fadeOutMs}ms`,
    '--comment-text-color': settings.textColor,
    '--comment-text-size': `${settings.textSize}px`,
    '--comment-text-width': `${settings.textMaxWidth}px`,
  } as CSSProperties;
}
