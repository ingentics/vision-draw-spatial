import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LabelEditRequest } from '../engine/Engine';

interface LabelEditorProps {
  request: LabelEditRequest;
  onCommit: (text: string) => void;
  onCancel: () => void;
}

/**
 * Champ d'édition d'un label, posé sur l'élément (SPEC §14.1). Comme dans draw.io : Entrée
 * ajoute une ligne, Ctrl+Entrée (ou un clic ailleurs) valide, Échap annule.
 */
export function LabelEditor({ request, onCommit, onCancel }: LabelEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);

  useEffect(() => {
    // Sans faire défiler la page (la boîte peut toucher un bord de la vue).
    ref.current?.focus({ preventScroll: true });
    ref.current?.select();
  }, []);

  // Posée sur l'élément, mais ramenée dans la vue si l'élément touche un bord.
  const [shift, setShift] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const box = ref.current;
    const area = box?.offsetParent as HTMLElement | null;
    if (!box || !area) return;
    const clamp = (start: number, size: number, max: number) =>
      Math.min(Math.max(start, 0), Math.max(max - size, 0)) - start;
    setShift({
      x: clamp(box.offsetLeft, box.offsetWidth, area.clientWidth),
      y: clamp(box.offsetTop, box.offsetHeight, area.clientHeight),
    });
  }, []);

  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    if (commit) onCommit(ref.current?.value ?? request.text);
    else onCancel();
  };

  const { x, y, width, height } = request.screen;
  return (
    <textarea
      ref={ref}
      className="label-editor"
      defaultValue={request.text}
      aria-label="Texte de l’élément"
      style={{ left: x + shift.x, top: y + shift.y, width: Math.max(width, 120), height: Math.max(height, 32) }}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          finish(true);
        }
      }}
    />
  );
}
