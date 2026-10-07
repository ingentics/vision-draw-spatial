import { useEffect, useRef } from 'react';
import type { ModeHandleMenu } from '../engine';

/**
 * Menu d'une poignée de mode (sujet 250, ex. « + » d'une table RDD : types de donnée du champ à ajouter), ouvert sous
 * la poignée. Un choix l'applique ; Échap ou un clic ailleurs le ferme sans rien faire. Flèches haut / bas : choix
 * suivant ou précédent.
 */
export function HandleMenu({
  menu,
  onChoose,
  onClose,
}: {
  menu: ModeHandleMenu;
  onChoose: (choiceId: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onCloseRef.current();
    };
    window.addEventListener('pointerdown', outside, true);
    return () => window.removeEventListener('pointerdown', outside, true);
  }, []);

  const move = (step: number) => {
    const buttons = [...(ref.current?.querySelectorAll('button') ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(at + step + buttons.length) % buttons.length]?.focus();
  };

  return (
    <div
      ref={ref}
      className="handle-menu"
      role="menu"
      style={{ left: menu.screen.x, top: menu.screen.y }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
        else if (event.key === 'ArrowDown') move(1);
        else if (event.key === 'ArrowUp') move(-1);
        else return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {menu.choices.map((choice, index) =>
        choice === 'separator' ? (
          <hr key={`separator:${index}`} />
        ) : (
          <button key={choice.id} type="button" role="menuitem" onClick={() => onChoose(choice.id)}>
            {choice.label}
          </button>
        ),
      )}
    </div>
  );
}
