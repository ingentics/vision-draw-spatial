import { useEffect, useRef } from 'react';
import type { ClipboardEvent, FocusEvent, KeyboardEvent, MutableRefObject, RefObject } from 'react';
import { isRich, parseColor, parseRichHtml, richToHtml, richToText } from '../engine';
import type { TextMarks } from '../engine';

/*
 * Saisie de texte riche partagée par l'édition en place d'un label (`LabelEditor`) et celle d'un commentaire
 * (`comment/CommentEditor`) : contenu posé une fois, sélection suivie pour le panneau de format, commandes du panneau
 * (gras, taille, couleur… sur la sélection), raccourcis, validation et annulation.
 */

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
  /** Valide la saisie (comme Ctrl+Entrée). */
  commit(): void;
}

/** Contenu validé : texte brut, et HTML draw.io s'il a une mise en forme partielle. */
export interface LabelContent {
  text: string;
  html?: string;
}

/** Police par défaut des textes draw.io (style sans `fontFamily`). */
const DEFAULT_FONT_FAMILY = 'Helvetica';

/** Les clics dans cette zone (format du texte, panneau latéral) ne terminent pas l'édition. */
export const TEXT_FORMAT_ATTRIBUTE = 'data-text-format';

const COMMANDS: Record<ToggleMark, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strikeThrough',
};

export interface RichEditorOptions {
  /** Champ éditable (`contentEditable`). */
  ref: RefObject<HTMLDivElement | null>;
  /** Zone dont les clics ne terminent pas l'édition (le champ et ses outils). */
  box: RefObject<HTMLElement | null>;
  /** Contenu de départ : texte brut, et HTML draw.io s'il a une mise en forme partielle. */
  text: string;
  html?: string;
  onCommit: (content: LabelContent) => void;
  onCancel: () => void;
  /** Raccourcis Ctrl+B, Ctrl+I, Ctrl+U. */
  onToggle: (mark: ToggleMark) => void;
  /** Format de la sélection (undefined : pas de sélection). */
  onSelectionFormat: (format: SelectionFormat | undefined) => void;
  handle: MutableRefObject<RichEditorHandle | undefined>;
  /** Style draw.io de tout le texte (police, couleur), pour les choix « aucune » du panneau. */
  baseStyle: () => Record<string, string>;
  /** Sans sélection, les commandes du panneau portent sur tout le texte (pas de style de cellule à changer). */
  wholeWithoutSelection?: boolean;
  /** À l'ouverture, tout le texte est sélectionné (sinon : curseur en fin de texte). */
  selectAll?: boolean;
  /** Texte d'une seule ligne (ex. champ d'une table RDD, sujet 249) : Entrée seule valide. */
  singleLine?: boolean;
  /** Texte brut (sujet 258) : les raccourcis de mise en forme ne font rien. */
  plain?: boolean;
}

/**
 * Saisie riche dans `ref` : pose le contenu, suit la sélection, installe les commandes du panneau (`handle`). Un clic
 * hors de `box` et du format du texte valide ; renvoie les gestionnaires à poser sur le champ (perte du focus, collage,
 * touches).
 */
export function useRichEditor(options: RichEditorOptions) {
  const { ref, box, handle } = options;
  const done = useRef(false);
  /** Dernière sélection dans le texte : gardée quand le focus passe au panneau (taille, couleur). */
  const saved = useRef<Range | undefined>(undefined);
  const latest = useRef(options);
  latest.current = options;
  const baseStyleRef = useRef(options.baseStyle);
  baseStyleRef.current = options.baseStyle;
  const wholeRef = useRef(!!options.wholeWithoutSelection);
  wholeRef.current = !!options.wholeWithoutSelection;
  const onSelectionFormatRef = useRef(options.onSelectionFormat);
  onSelectionFormatRef.current = options.onSelectionFormat;

  const finish = (commit: boolean) => {
    if (done.current) return;
    done.current = true;
    const { onSelectionFormat, onCommit, onCancel, text } = latest.current;
    onSelectionFormat(undefined);
    if (commit && ref.current) onCommit(readContent(ref.current));
    else if (commit) onCommit({ text });
    else onCancel();
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    const { html, text, selectAll } = latest.current;
    // Contenu posé une seule fois : les changements de format (props) ne touchent pas à la saisie.
    editor.innerHTML = html !== undefined ? richToHtml(parseRichHtml(html)) : textToEditorHtml(text);
    document.execCommand('styleWithCSS', false, 'false');
    // Sans faire défiler la page (la boîte peut toucher un bord de la vue).
    editor.focus({ preventScroll: true });
    // Curseur en fin de texte : il clignote, la saisie s'ajoute au texte (Ctrl+A sélectionne tout). Ou tout le
    // texte sélectionné.
    const range = document.createRange();
    range.selectNodeContents(editor);
    if (!selectAll) range.collapse(false);
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

  useEffect(() => {
    const restore = (): Range | undefined => {
      const editor = ref.current;
      let range = saved.current;
      if (editor && (!range || range.collapsed) && wholeRef.current) {
        // Sans sélection : tout le texte.
        range = document.createRange();
        range.selectNodeContents(editor);
      }
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
      commit: () => finishRef.current(true),
      hasSelection: () => wholeRef.current || (!!saved.current && !saved.current.collapsed),
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
        // « Aucune » couleur / police (style de texte sans elles) : celles de tout le texte. Si la sélection
        // était dans une partie d'une autre police ou couleur (ex. du code), le segment l'hériterait :
        // la valeur de tout le texte est alors écrite.
        const root = ref.current;
        if (root) {
          const base = baseStyleRef.current();
          const computed = getComputedStyle(span);
          const whole = getComputedStyle(root);
          if (marks.fontFamily === null && computed.fontFamily !== whole.fontFamily)
            span.style.fontFamily = base.fontFamily ?? DEFAULT_FONT_FAMILY;
          if (marks.color === null && computed.color !== whole.color)
            span.style.color = isColor(base.fontColor) ? base.fontColor : '#000000';
        }
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
  }, [handle, ref]);

  return {
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      // Focus passé au format du texte (taille, couleur) : l'édition continue.
      const next = event.relatedTarget as Element | null;
      if (next?.closest(`[${TEXT_FORMAT_ATTRIBUTE}]`)) return;
      finish(true);
    },
    onPaste: (event: ClipboardEvent<HTMLDivElement>) => {
      // Texte collé sans sa mise en forme d'origine.
      event.preventDefault();
      document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      } else if (event.key === 'Enter' && (mod || latest.current.singleLine)) {
        event.preventDefault();
        finish(true);
      } else if (mod && !event.altKey && (key === 'b' || key === 'i' || key === 'u')) {
        event.preventDefault();
        if (!latest.current.plain) latest.current.onToggle(({ b: 'bold', i: 'italic', u: 'underline' } as const)[key]);
      }
    },
  };
}

export function select(range: Range): void {
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * Texte brut → contenu de l'éditeur : échappé, lignes en `<br>`, une ligne vide finale en `<div><br></div>` (un `<br>`
 * final ne s'afficherait pas, et la ligne serait perdue à la validation).
 */
function textToEditorHtml(text: string): string {
  return richToHtml(text.split('\n').map((line) => [{ text: line }]));
}

/** Contenu saisi : texte brut, plus le HTML draw.io s'il y a une mise en forme partielle. */
export function readContent(editor: HTMLElement): LabelContent {
  // L'éditeur est en `white-space: pre` : tous ses espaces comptent (sujet 409).
  const lines = parseRichHtml(editor.innerHTML, { preserveSpaces: true });
  const text = richToText(lines);
  return isRich(lines) ? { text, html: richToHtml(lines) } : { text };
}

/** Format au début de la sélection (styles calculés : tailles en pixels de page, voir la boîte). */
export function selectionFormat(range: Range): SelectionFormat {
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

export function isColor(value: string | undefined): value is string {
  return !!value && value !== 'none' && value !== 'default';
}
