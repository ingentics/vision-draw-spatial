import { useEffect, useRef } from 'react';
import type { BackTarget } from '../engine/Engine';
import type { ParentLink } from '../engine/interaction/history';

interface BackButtonProps {
  target: BackTarget;
  onBack: () => void;
  /** Pages parentes proposées (pile vide, plusieurs parents) ; undefined = menu fermé. */
  choices: ParentLink[] | undefined;
  onChoose: (pageId: string) => void;
  onDismiss: () => void;
  /** Horloge, pour afficher l'ancienneté des liens (injectable pour les tests). */
  now?: number;
}

/** Bouton « Retour » (SPEC §11.3) et menu des pages parentes, triées par usage récent. */
export function BackButton({ target, onBack, choices, onChoose, onDismiss, now = Date.now() }: BackButtonProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Le menu se ferme au clic à l'extérieur ou avec Échap.
  useEffect(() => {
    if (!choices) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) onDismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [choices, onDismiss]);

  return (
    <div className="back" ref={rootRef}>
      <button
        type="button"
        className="button"
        disabled={target.kind === 'none'}
        aria-haspopup={target.kind === 'choose' ? 'menu' : undefined}
        aria-expanded={target.kind === 'choose' ? choices !== undefined : undefined}
        title={describe(target)}
        onClick={onBack}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13.5 8h-11M6.5 4 2.5 8l4 4" />
        </svg>
        Retour
      </button>
      {choices && (
        <ul className="back-menu" role="menu" aria-label="Revenir à une page parente">
          {choices.map((parent) => (
            <li key={parent.pageId} role="none">
              <button type="button" role="menuitem" onClick={() => onChoose(parent.pageId)}>
                <span>{parent.pageName}</span>
                <span className="muted">{parent.lastUsedAt ? ago(now - parent.lastUsedAt) : 'jamais utilisé'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function describe(target: BackTarget): string {
  switch (target.kind) {
    case 'history':
      return `Revenir à « ${target.pageName} » (Retour arrière, Alt+←)`;
    case 'parent':
      return `Remonter à « ${target.parent.pageName} » (Retour arrière, Alt+←)`;
    case 'choose':
      return 'Choisir la page parente (Retour arrière, Alt+←)';
    case 'none':
      return 'Aucune page d’où revenir';
  }
}

function ago(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}
