import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject } from 'react';
import type { LabelEditRequest } from '../engine/Engine';
import { isMonospace, isRich, parseColor, parseRichHtml, richToHtml, richToText } from '../engine/format/richText';
import type { TextMarks } from '../engine/model/types';

/** Mise en forme qui se bascule (gras, italique, souligné, barré). */
export type ToggleMark = 'bold' | 'italic' | 'underline' | 'strike';

/** Format de la sélection dans le texte (affiché par le panneau de format). */
export interface SelectionFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  /** Taille en pixels de page. */
  fontSize: number;
  color: string;
  fontFamily?: string;
}

/** Commandes de l'éditeur, pour le panneau de format (sélection dans le texte ou tout le texte). */
export interface RichEditorHandle {
  /** Une partie du texte est sélectionnée (sinon le format s'applique à tout le texte). */
  hasSelection(): boolean;
  /** Bascule une mise en forme sur la sélection. */
  toggle(mark: ToggleMark): void;
  /** Taille, couleur, police de la sélection ; null = retirée (format de tout le texte). */
  setMarks(marks: { fontSize?: number; color?: string | null; fontFamily?: string | null }): void;
  /** Retire du texte ces mises en forme partielles (le format de tout le texte vient d'en changer). */
  clear(keys: Array<keyof TextMarks>): void;
}

/** Contenu validé : texte brut, et HTML draw.io s'il a une mise en forme partielle. */
export interface LabelContent {
  text: string;
  html?: string;
}

interface LabelEditorProps {
  request: LabelEditRequest;
  onCommit: (content: LabelContent) => void;
  onCancel: () => void;
  /** Raccourcis Ctrl+B, Ctrl+I, Ctrl+U : sélection ou tout le texte, comme les boutons du panneau. */
  onToggle: (mark: ToggleMark) => void;
  /** Format de la sélection (undefined : pas de sélection, le format est celui de tout le texte). */
  onSelectionFormat: (format: SelectionFormat | undefined) => void;
  handle: MutableRefObject<RichEditorHandle | undefined>;
}

/** Les clics dans cette zone (format du texte, panneau latéral) ne terminent pas l'édition. */
export const TEXT_FORMAT_ATTRIBUTE = 'data-text-format';

const COMMANDS: Record<ToggleMark, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strikeThrough',
};

/**
 * Édition en place d'un label (SPEC §14.1) : le texte se modifie là où il est dessiné, dans sa police,
 * sa taille, sa couleur et son alignement (le label dessiné est masqué pendant la saisie). Texte riche :
 * une partie sélectionnée peut être mise en gras, en italique, soulignée, barrée, changer de taille, de
 * couleur ou de police. Le contenu est mis en page en pixels de page puis agrandi au zoom de la vue :
 * les tailles écrites sont celles de draw.io. Entrée ajoute une ligne, Ctrl+Entrée (ou un clic
 * ailleurs) valide, Échap annule.
 */
export function LabelEditor({ request, onCommit, onCancel, onToggle, onSelectionFormat, handle }: LabelEditorProps) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  /** Dernière sélection dans le texte : gardée quand le focus passe au panneau (taille, couleur). */
  const saved = useRef<Range | undefined>(undefined);

  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    onSelectionFormat(undefined);
    if (commit && ref.current) onCommit(readContent(ref.current));
    else if (commit) onCommit({ text: request.text });
    else onCancel();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  const onSelectionFormatRef = useRef(onSelectionFormat);
  onSelectionFormatRef.current = onSelectionFormat;

  useEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    // Contenu posé une seule fois : les changements de format (props) ne touchent pas à la saisie.
    editor.innerHTML =
      request.html !== undefined ? richToHtml(parseRichHtml(request.html)) : textToEditorHtml(request.text);
    document.execCommand('styleWithCSS', false, 'false');
    // Sans faire défiler la page (la boîte peut toucher un bord de la vue).
    editor.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(editor);
    select(range);

    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const current = selection.getRangeAt(0);
      if (!editor.contains(current.commonAncestorContainer)) return;
      saved.current = current.cloneRange();
      onSelectionFormatRef.current(current.collapsed ? undefined : selectionFormat(current));
    };
    document.addEventListener('selectionchange', onSelectionChange);
    // Un clic ailleurs valide, sauf dans le format du texte (le panneau latéral).
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || box.current?.contains(target) || target.closest(`[${TEXT_FORMAT_ATTRIBUTE}]`)) return;
      finishRef.current(true);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('pointerdown', onPointerDown, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Commandes du panneau de format.
  useEffect(() => {
    const restore = (): Range | undefined => {
      const editor = ref.current;
      const range = saved.current;
      if (!editor || !range || range.collapsed) return undefined;
      editor.focus({ preventScroll: true });
      select(range);
      return range;
    };
    const refresh = () => {
      const selection = window.getSelection();
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : undefined;
      if (range && ref.current?.contains(range.commonAncestorContainer)) {
        saved.current = range.cloneRange();
        onSelectionFormatRef.current(range.collapsed ? undefined : selectionFormat(range));
      }
    };
    handle.current = {
      hasSelection: () => !!saved.current && !saved.current.collapsed,
      toggle(mark) {
        if (!restore()) return;
        document.execCommand(COMMANDS[mark]);
        refresh();
      },
      setMarks(marks) {
        const range = restore();
        if (!range) return;
        const content = range.extractContents();
        const keys = (['fontSize', 'color', 'fontFamily'] as const).filter((key) => key in marks);
        stripMarks(content, keys);
        const span = document.createElement('span');
        if (marks.fontSize !== undefined) span.style.fontSize = `${marks.fontSize}px`;
        if (marks.color) span.style.color = marks.color;
        if (marks.fontFamily) span.style.fontFamily = marks.fontFamily;
        span.append(content);
        range.insertNode(span);
        const next = document.createRange();
        next.selectNodeContents(span);
        select(next);
        refresh();
      },
      clear(keys) {
        if (ref.current) stripMarks(ref.current, keys);
      },
    };
    return () => {
      handle.current = undefined;
    };
  }, [handle]);

  // Posée sur l'élément, mais ramenée dans la vue si l'élément touche un bord ; recalculé quand
  // l'élément bouge à l'écran (vue déplacée, panneau latéral qui change la taille du plan).
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const shiftRef = useRef(shift);
  shiftRef.current = shift;
  const { x: left, y: top, width, height } = request.screen;
  useLayoutEffect(() => {
    const element = box.current;
    const area = element?.offsetParent as HTMLElement | null;
    if (!element || !area) return;
    // Emprise affichée (agrandie, centrée pour une flèche), sans le décalage déjà appliqué.
    const rect = element.getBoundingClientRect();
    const origin = area.getBoundingClientRect();
    const clamp = (start: number, size: number, max: number) =>
      Math.min(Math.max(start, 0), Math.max(max - size, 0)) - start;
    setShift({
      x: clamp(rect.left - origin.left - shiftRef.current.x, rect.width, area.clientWidth),
      y: clamp(rect.top - origin.top - shiftRef.current.y, rect.height, area.clientHeight),
    });
  }, [left, top]);

  const { style, scale, onEdge } = request;
  const bits = Number(style.fontStyle) || 0;
  // Boîte en pixels de page, agrandie au zoom : tailles du texte riche = tailles draw.io. Une forme : sur
  // son emprise. Une flèche : centrée sur le point du texte, à la taille du texte, comme le label dessiné.
  const boxStyle: CSSProperties = {
    left: left + shift.x,
    top: top + shift.y,
    outlineWidth: 1 / scale,
    background: request.background ?? 'transparent',
    ...(onEdge
      ? { padding: 1, minWidth: 8, transform: `scale(${scale}) translate(-50%, -50%)` }
      : {
          width: Math.max(width, 40) / scale,
          minHeight: Math.max(height, 20) / scale,
          padding: 2,
          transform: `scale(${scale})`,
          justifyContent:
            style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'bottom' ? 'flex-end' : 'center',
        }),
  };
  const decorations = [bits & 4 && 'underline', bits & 8 && 'line-through'].filter(Boolean).join(' ');
  const textStyle: CSSProperties = {
    fontSize: Number(style.fontSize) || 11,
    color: isColor(style.fontColor) ? style.fontColor : '#000000',
    fontWeight: bits & 1 ? 700 : 400,
    fontStyle: bits & 2 ? 'italic' : 'normal',
    textDecoration: decorations || 'none',
    fontFamily: isMonospace(style.fontFamily) ? "'Roboto Mono', monospace" : "'Roboto', sans-serif",
    textAlign: style.align === 'left' || style.align === 'right' ? style.align : 'center',
    whiteSpace: onEdge || style.whiteSpace !== 'wrap' ? 'pre' : 'pre-wrap',
  };

  return (
    <div ref={box} className="label-editor" style={boxStyle}>
      <div
        ref={ref}
        className="label-editor-text"
        contentEditable
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
        onPaste={(event) => {
          // Texte collé sans sa mise en forme d'origine.
          event.preventDefault();
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
        }}
        onKeyDown={(event) => {
          const mod = event.ctrlKey || event.metaKey;
          const key = event.key.toLowerCase();
          if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
          } else if (event.key === 'Enter' && mod) {
            event.preventDefault();
            finish(true);
          } else if (mod && !event.altKey && (key === 'b' || key === 'i' || key === 'u')) {
            event.preventDefault();
            onToggle(({ b: 'bold', i: 'italic', u: 'underline' } as const)[key]);
          }
        }}
      />
    </div>
  );
}

function select(range: Range): void {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Texte brut → contenu de l'éditeur (échappé, lignes en `<br>`). */
function textToEditorHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

/** Contenu saisi : texte brut, plus le HTML draw.io s'il y a une mise en forme partielle. */
function readContent(editor: HTMLElement): LabelContent {
  const lines = parseRichHtml(editor.innerHTML);
  const text = richToText(lines);
  return isRich(lines) ? { text, html: richToHtml(lines) } : { text };
}

/** Format au début de la sélection (styles calculés : tailles en pixels de page, voir la boîte). */
function selectionFormat(range: Range): SelectionFormat {
  const node = range.startContainer;
  const element = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement) as Element;
  const computed = getComputedStyle(element);
  return {
    bold: document.queryCommandState('bold'),
    italic: document.queryCommandState('italic'),
    underline: document.queryCommandState('underline'),
    strike: document.queryCommandState('strikeThrough'),
    fontSize: Math.round(parseFloat(computed.fontSize) * 100) / 100,
    color: parseColor(computed.color) ?? '#000000',
    fontFamily: computed.fontFamily
      .split(',')[0]
      ?.trim()
      .replace(/^["']|["']$/g, ''),
  };
}

/** Balises et propriétés CSS de chaque mise en forme partielle. */
const MARK_TAGS: Partial<Record<keyof TextMarks, string[]>> = {
  bold: ['B', 'STRONG'],
  italic: ['I', 'EM'],
  underline: ['U'],
  strike: ['S', 'STRIKE', 'DEL'],
};
const MARK_CSS: Record<keyof TextMarks, string> = {
  bold: 'font-weight',
  italic: 'font-style',
  underline: 'text-decoration',
  strike: 'text-decoration',
  fontSize: 'font-size',
  color: 'color',
  fontFamily: 'font-family',
};
const FONT_ATTRIBUTES: Partial<Record<keyof TextMarks, string>> = {
  fontSize: 'size',
  color: 'color',
  fontFamily: 'face',
};

/** Retire des mises en forme partielles d'un contenu (balises déballées, propriétés CSS retirées). */
function stripMarks(root: ParentNode, keys: Array<keyof TextMarks>): void {
  for (const element of [...root.querySelectorAll('*')].reverse()) {
    for (const key of keys) {
      if (element instanceof HTMLElement) element.style.removeProperty(MARK_CSS[key]);
      const attribute = FONT_ATTRIBUTES[key];
      if (attribute && element.tagName === 'FONT') element.removeAttribute(attribute);
    }
    if (element instanceof HTMLElement && element.getAttribute('style') === '') element.removeAttribute('style');
    const unwrap =
      keys.some((key) => MARK_TAGS[key]?.includes(element.tagName)) ||
      (['SPAN', 'FONT'].includes(element.tagName) && element.attributes.length === 0);
    if (unwrap) element.replaceWith(...element.childNodes);
  }
}

function isColor(value: string | undefined): value is string {
  return !!value && value !== 'none' && value !== 'default';
}

/** Valeur de `fontStyle` (bits : 1 gras, 2 italique, 4 souligné, 8 barré) ; 0 = clé retirée. */
export function fontStyleValue(bits: number): string | undefined {
  return bits === 0 ? undefined : String(bits);
}
