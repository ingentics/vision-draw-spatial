import { useEffect, useRef } from 'react';
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
    ref.current?.focus();
    ref.current?.select();
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
      style={{ left: x, top: y, width: Math.max(width, 120), height: Math.max(height, 32) }}
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
