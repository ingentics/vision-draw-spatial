import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { readableOn } from '../engine';
import type { ModeIndicator } from '../engine';
import { InlineEdit } from './InlineEdit';

/**
 * `ModeBar` qui glisse : elle remonte hors de la vue quand `indicator` disparaît (ex. au début d'une transition entre
 * pages) et descend depuis le haut quand il apparaît, en `slideDuration` ms de l'indicateur (réglage du mode ; 0 = sans
 * animation). Pendant la sortie, la barre garde le dernier indicateur affiché.
 */
export function SlidingModeBar({
  indicator,
  onChoose,
  onRename,
}: {
  indicator: ModeIndicator | undefined;
  onChoose: (value: string) => void;
  onRename: (label: string) => void;
}) {
  // Dernier indicateur affiché : la barre le garde pendant sa sortie.
  const last = useRef(indicator);
  if (indicator) last.current = indicator;
  const visible = indicator !== undefined;
  const duration = (indicator ?? last.current)?.slideDuration ?? 0;
  const [present, setPresent] = useState(visible);

  // La sortie animée finie, la barre est retirée.
  useEffect(() => {
    if (visible) return;
    const timer = setTimeout(() => setPresent(false), duration);
    return () => clearTimeout(timer);
  }, [visible, duration]);
  if (visible && !present) setPresent(true);

  const shown = indicator ?? last.current;
  if (!(present || visible) || !shown) return null;
  return (
    <div
      className={visible ? 'mode-bar-slide open' : 'mode-bar-slide'}
      style={{ '--mode-bar-slide': `${duration}ms` } as CSSProperties}
      inert={!visible}
    >
      <ModeBar indicator={shown} onChoose={onChoose} onRename={onRename} />
    </div>
  );
}

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
