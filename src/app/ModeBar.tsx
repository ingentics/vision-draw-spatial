import type { ModeIndicator } from '../engine/Engine';
import { InlineEdit } from './InlineEdit';

/**
 * Barre du courant du mode de la page (ex. flux courant du mode Séquences), en haut de la zone de dessin : sa couleur,
 * son libellé centré, et des boutons précédent / suivant (en boucle) s'il y a au moins deux valeurs. Un libellé
 * renommable se modifie sur place au clic (`InlineEdit` : Entrée ou quitter le champ, Échap ; vide refusé).
 */
export function ModeBar({
  indicator,
  onChoose,
  onRename,
}: {
  indicator: ModeIndicator;
  onChoose: (value: string) => void;
  onRename: (label: string) => void;
}) {
  const { values, value } = indicator;
  const index = values.indexOf(value);
  const step = (delta: number) => onChoose(values[(index + delta + values.length) % values.length]!);
  const navigable = values.length >= 2 && index >= 0;
  return (
    <div className="mode-bar" style={{ background: indicator.color, color: readableOn(indicator.color) }}>
      {navigable && (
        <button type="button" className="mode-bar-button" title="Précédent" onClick={() => step(-1)}>
          ‹
        </button>
      )}
      <InlineEdit
        value={indicator.label}
        label="Nouveau titre"
        className={indicator.renamable ? 'mode-bar-label renamable' : 'mode-bar-label'}
        inputClassName="mode-bar-input"
        title={indicator.renamable ? `${indicator.label} — cliquer pour renommer` : indicator.label}
        onCommit={indicator.renamable ? onRename : undefined}
      />
      {navigable && (
        <button type="button" className="mode-bar-button" title="Suivant" onClick={() => step(1)}>
          ›
        </button>
      )}
    </div>
  );
}

/** Texte lisible sur un fond #rrggbb : noir sur une couleur claire, blanc sinon (luminance relative, WCAG). */
function readableOn(background: string): string {
  const channel = (offset: number) => {
    const c = parseInt(background.slice(offset, offset + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // Contraste égal avec le blanc et le noir pour une luminance d'environ 0,18.
  return luminance > 0.18 ? '#000000' : '#ffffff';
}
