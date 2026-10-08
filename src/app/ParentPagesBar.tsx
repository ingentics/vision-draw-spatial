import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ModeInfo, ParentLink } from '../engine';
import { ModeIcon } from './ModeIcon';
import { useTooltip } from './Tooltip';

/** Durée du glissement des boutons (ms), à l'entrée comme à la sortie (`--parent-pages-slide` dans `main.css`). */
const SLIDE_MS = 150;

/**
 * Boutons des pages parentes (sujet 357), en haut de la zone de dessin : un par page ayant un lien vers la page
 * courante (titre précédé de l'icône de son mode), la plus récemment utilisée d'abord ; un clic y remonte comme
 * « Retour ». Ils descendent depuis le haut quand `open` passe à vrai (mode navigation, ou choix demandé par Alt+↑)
 * et remontent quand il repasse à faux, en gardant pendant la sortie les derniers parents affichés.
 * `choosing` : choix demandé par Alt+↑ (plusieurs parents, pile vide), refermé par Échap ou un clic ailleurs
 * (`onDismiss`).
 */
export function ParentPagesBar({
  parents,
  open,
  choosing,
  modeOf,
  onChoose,
  onDismiss,
  now = Date.now(),
}: {
  parents: ParentLink[];
  open: boolean;
  choosing: boolean;
  modeOf: (pageId: string) => Pick<ModeInfo, 'name' | 'icon'> | undefined;
  onChoose: (pageId: string) => void;
  onDismiss: () => void;
  /** Horloge, pour l'ancienneté des liens dans l'infobulle (injectable pour les tests). */
  now?: number;
}) {
  const { hover, hide, tooltip } = useTooltip();
  const rootRef = useRef<HTMLDivElement>(null);
  const visible = open && parents.length > 0;
  // Derniers parents affichés : les boutons les gardent pendant leur sortie.
  const last = useRef(parents);
  if (visible) last.current = parents;
  const [present, setPresent] = useState(visible);

  // La sortie animée finie, les boutons sont retirés.
  useEffect(() => {
    if (visible) return;
    hide();
    const timer = setTimeout(() => setPresent(false), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps -- `hide` change à chaque rendu
  if (visible && !present) setPresent(true);

  // Choix demandé par Alt+↑ : fermé au clic à l'extérieur ou avec Échap.
  useEffect(() => {
    if (!choosing) return;
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
  }, [choosing, onDismiss]);

  if (!present && !visible) return null;
  return (
    <div
      ref={rootRef}
      className={visible ? 'parent-pages open' : 'parent-pages'}
      style={{ '--parent-pages-slide': `${SLIDE_MS}ms` } as CSSProperties}
      role="navigation"
      aria-label="Pages parentes"
      inert={!visible}
    >
      {last.current.map((parent) => {
        const mode = modeOf(parent.pageId);
        const used = parent.lastUsedAt ? `lien suivi ${ago(now - parent.lastUsedAt)}` : 'lien jamais suivi';
        return (
          <button
            key={parent.pageId}
            type="button"
            className="parent-page"
            {...hover(`Remonter à « ${parent.pageName} » (Alt+↑) — ${used}`)}
            onClick={() => {
              hide();
              onChoose(parent.pageId);
            }}
          >
            {/* Flèche vers le haut : on remonte vers la page qui contient la page courante. */}
            <svg className="parent-page-up" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 13.5v-11M3.5 7 8 2.5 12.5 7" />
            </svg>
            {mode && <ModeIcon mode={mode} className="tab-mode-icon" />}
            <span className="parent-page-name">{parent.pageName}</span>
          </button>
        );
      })}
      {tooltip}
    </div>
  );
}

function ago(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}
