import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { LabelEditRequest } from '../engine/Engine';

interface LabelEditorProps {
  request: LabelEditRequest;
  onCommit: (text: string) => void;
  onCancel: () => void;
  /** Raccourcis de format (Ctrl+B gras, Ctrl+I italique) : clés de style à écrire. */
  onFormat: (patch: Record<string, string | undefined>) => void;
}

/** Les clics dans cette zone (format du texte, panneau latéral) ne terminent pas l'édition. */
export const TEXT_FORMAT_ATTRIBUTE = 'data-text-format';

/**
 * Édition en place d'un label (SPEC §14.1) : le texte se modifie là où il est dessiné, dans sa police,
 * sa taille, sa couleur et son alignement (le label dessiné est masqué pendant la saisie). Comme dans
 * draw.io : Entrée ajoute une ligne, Ctrl+Entrée (ou un clic ailleurs) valide, Échap annule.
 */
export function LabelEditor({ request, onCommit, onCancel, onFormat }: LabelEditorProps) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    if (commit) onCommit(readText(ref.current) ?? request.text);
    else onCancel();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    // Texte posé une seule fois : les changements de format (props) ne touchent pas à la saisie.
    editor.textContent = request.text;
    // Sans faire défiler la page (la boîte peut toucher un bord de la vue).
    editor.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    // Un clic ailleurs valide, sauf dans le format du texte (le panneau latéral).
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || box.current?.contains(target) || target.closest(`[${TEXT_FORMAT_ATTRIBUTE}]`)) return;
      finishRef.current(true);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Posée sur l'élément, mais ramenée dans la vue si l'élément touche un bord.
  const [shift, setShift] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    const element = box.current;
    const area = element?.offsetParent as HTMLElement | null;
    if (!element || !area) return;
    const clamp = (start: number, size: number, max: number) =>
      Math.min(Math.max(start, 0), Math.max(max - size, 0)) - start;
    setShift({
      x: clamp(element.offsetLeft, element.offsetWidth, area.clientWidth),
      y: clamp(element.offsetTop, element.offsetHeight, area.clientHeight),
    });
  }, []);

  const { style, scale } = request;
  const bits = Number(style.fontStyle) || 0;
  const { x, y, width, height } = request.screen;
  const padding = 2 * scale;
  const boxStyle: CSSProperties = {
    left: x + shift.x,
    top: y + shift.y,
    width: Math.max(width, 40),
    minHeight: Math.max(height, 20),
    padding,
    justifyContent:
      style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'bottom' ? 'flex-end' : 'center',
    background: request.onEdge ? 'var(--bg)' : 'transparent',
  };
  const textStyle: CSSProperties = {
    fontSize: (Number(style.fontSize) || 11) * scale,
    color: isColor(style.fontColor) ? style.fontColor : '#000000',
    fontWeight: bits & 1 ? 700 : 400,
    fontStyle: bits & 2 ? 'italic' : 'normal',
    textDecoration: bits & 4 ? 'underline' : 'none',
    textAlign: style.align === 'left' || style.align === 'right' ? style.align : 'center',
    whiteSpace: request.onEdge || style.whiteSpace !== 'wrap' ? 'pre' : 'pre-wrap',
  };

  return (
    <div ref={box} className="label-editor" style={boxStyle}>
      <div
        ref={ref}
        className="label-editor-text"
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Texte de l’élément"
        style={textStyle}
        onBlur={(event) => {
          // Focus passé au format du texte (taille, couleur) : l'édition continue.
          const next = event.relatedTarget as Element | null;
          if (next?.closest(`[${TEXT_FORMAT_ATTRIBUTE}]`)) return;
          finish(true);
        }}
        onKeyDown={(event) => {
          const mod = event.ctrlKey || event.metaKey;
          if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
          } else if (event.key === 'Enter' && mod) {
            event.preventDefault();
            finish(true);
          } else if (mod && !event.altKey && (event.key === 'b' || event.key === 'i')) {
            event.preventDefault();
            if (!request.styleCellId) return;
            const bit = event.key === 'b' ? 1 : 2;
            onFormat({ fontStyle: fontStyleValue(bits ^ bit) });
          }
        }}
      />
    </div>
  );
}

/** Texte saisi (retours à la ligne compris), sans la ligne vide finale que le navigateur ajoute. */
function readText(editor: HTMLElement | null): string | undefined {
  return editor?.innerText.replace(/\n$/, '');
}

function isColor(value: string | undefined): value is string {
  return !!value && value !== 'none' && value !== 'default';
}

/** Valeur de `fontStyle` (bits : 1 gras, 2 italique, 4 souligné) ; 0 = clé retirée. */
export function fontStyleValue(bits: number): string | undefined {
  return bits === 0 ? undefined : String(bits);
}
