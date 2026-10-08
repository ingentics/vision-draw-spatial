import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MutableRefObject, RefObject } from 'react';
import {
  fontStyleBits,
  homographyCss,
  isMonospace,
  labelPadding,
  largestFitting,
  MIN_FIT_SIZE,
  rectToQuad,
} from '../engine';
import type { LabelEditPlane, LabelEditRequest } from '../engine';
import { isColor, readContent, TEXT_FORMAT_ATTRIBUTE, useRichEditor } from './richEditor';
import type { LabelContent, RichEditorHandle, SelectionFormat, ToggleMark } from './richEditor';

export { TEXT_FORMAT_ATTRIBUTE } from './richEditor';
export type { LabelContent, RichEditorHandle, SelectionFormat, ToggleMark } from './richEditor';

interface LabelEditorProps {
  request: LabelEditRequest;
  onCommit: (content: LabelContent) => void;
  onCancel: () => void;
  /** Raccourcis Ctrl+B, Ctrl+I, Ctrl+U : sélection ou tout le texte, comme les boutons du panneau. */
  onToggle: (mark: ToggleMark) => void;
  /** Format de la sélection (undefined : pas de sélection, le format est celui de tout le texte). */
  onSelectionFormat: (format: SelectionFormat | undefined) => void;
  handle: MutableRefObject<RichEditorHandle | undefined>;
  /**
   * Texte de flèche déplaçable (poignée sous le texte) : point du canvas visé pour l'ancre du texte,
   * puis fin du déplacement. Absent : pas de poignée (forme, ou texte pas encore créé).
   */
  onMoveText?: (screen: { x: number; y: number }) => void;
  onMoveTextEnd?: () => void;
  /** Bascule du texte de début / fin de l'autre côté du trait (flèche sous le texte, `request.flip`). */
  onFlip?: () => void;
  /** Taille obtenue en mode « Ajuster » (`fitText=1`), à chaque recalcul ; undefined hors de ce mode. */
  onFitSize?: (size: number | undefined) => void;
  /** Texte saisi, à chaque changement (aperçu en direct, ex. onglet d'une région RDD). */
  onTextInput?: (text: string) => void;
}

/**
 * Édition en place d'un label (SPEC §14.1) : le texte se modifie là où il est dessiné, dans sa police,
 * sa taille, sa couleur et son alignement (le label dessiné est masqué pendant la saisie). Texte riche :
 * une partie sélectionnée peut être mise en gras, en italique, soulignée, barrée, changer de taille, de
 * couleur ou de police. Le contenu est mis en page en pixels de page puis agrandi au zoom de la vue :
 * les tailles écrites sont celles de draw.io. Entrée ajoute une ligne, Ctrl+Entrée (ou un clic
 * ailleurs) valide, Échap annule.
 */
export function LabelEditor({
  request,
  onCommit,
  onCancel,
  onToggle,
  onSelectionFormat,
  handle,
  onMoveText,
  onMoveTextEnd,
  onFlip,
  onFitSize,
  onTextInput,
}: LabelEditorProps) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const requestRef = useRef(request);
  requestRef.current = request;
  const handlers = useRichEditor({
    ref,
    box,
    text: request.text,
    html: request.html,
    onCommit,
    onCancel,
    onToggle,
    onSelectionFormat,
    handle,
    baseStyle: () => requestRef.current.style,
    singleLine: request.singleLine,
    plain: request.plain,
    // Une ligne (champ d'une table RDD) : tout le texte sélectionné, à remplacer d'un coup.
    selectAll: request.singleLine,
  });
  // « Ajuster » (`fitText=1`, texte d'une forme) : le texte est réduit (CSS `zoom`, tailles partielles à
  // proportion, retour à la ligne à la largeur de la forme) jusqu'à tenir dans la boîte, comme le label
  // dessiné (`fitFontSize`) : même recherche des tailles entières, mesurée ici dans le DOM.
  const shownStyle = request.displayStyle ?? request.style;
  const fitOn = !request.onEdge && shownStyle.fitText === '1';
  const baseSize = Number(shownStyle.fontSize) || 11;
  const onFitSizeRef = useRef(onFitSize);
  onFitSizeRef.current = onFitSize;
  const onTextInputRef = useRef(onTextInput);
  onTextInputRef.current = onTextInput;
  const fitRef = useRef<() => void>(() => undefined);
  fitRef.current = () => {
    const editor = ref.current;
    const frame = box.current;
    if (!editor || !frame) return;
    if (!fitOn) {
      editor.style.removeProperty('zoom');
      onFitSizeRef.current?.(undefined);
      return;
    }
    // Mesure en pixels de page, la boîte sans sa transformation (agrandissement, ou plan en perspective) ;
    // boîte sans ses marges (celles du label dessiné, en pixels de page).
    const transform = frame.style.transform;
    frame.style.transform = 'none';
    const outer = frame.getBoundingClientRect();
    const padding = getComputedStyle(frame);
    const room = {
      width: outer.width - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight) + 0.5 / request.scale,
      height: outer.height - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) + 0.5 / request.scale,
    };
    const fits = (size: number) => {
      editor.style.zoom = String(size / baseSize);
      const rect = editor.getBoundingClientRect();
      return rect.width <= room.width && rect.height <= room.height;
    };
    const size = fits(baseSize) ? baseSize : largestFitting(Math.max(Math.ceil(baseSize) - 1, MIN_FIT_SIZE), fits);
    editor.style.zoom = String(size / baseSize);
    frame.style.transform = transform;
    onFitSizeRef.current?.(size);
  };
  const { width: screenWidth, height: screenHeight } = request.screen;
  useLayoutEffect(() => fitRef.current(), [fitOn, baseSize, screenWidth, screenHeight, request.scale, shownStyle]);
  // Recalcul à chaque changement du contenu (saisie, mise en forme partielle).
  useEffect(() => {
    const editor = ref.current;
    if (!editor) return;
    fitRef.current();
    const observer = new MutationObserver((mutations) => {
      // Le zoom posé par le calcul lui-même ne relance pas le calcul.
      if (mutations.every((m) => m.target === editor && m.type === 'attributes')) return;
      fitRef.current();
      onTextInputRef.current?.(readContent(editor).text);
    });
    observer.observe(editor, { childList: true, characterData: true, subtree: true, attributes: true });
    return () => {
      observer.disconnect();
      onFitSizeRef.current?.(undefined);
    };
  }, []);

  // Posée sur l'élément, mais ramenée dans la vue si l'élément touche un bord ; recalculé quand
  // l'élément bouge à l'écran (vue déplacée, panneau latéral qui change la taille du plan).
  const [shift, setShift] = useState({ x: 0, y: 0 });
  const shiftRef = useRef(shift);
  shiftRef.current = shift;
  const { plane } = request;
  // Forme vue de biais : la boîte part du coin haut-gauche de sa zone de texte à l'écran.
  const {
    x: left,
    y: top,
    width,
    height,
  } = plane ? { ...request.screen, x: plane.corners[0].x, y: plane.corners[0].y } : request.screen;
  const onPlane = !!plane;
  useLayoutEffect(() => {
    // Plaquée sur un plan en perspective : pas de décalage (le texte quitterait la forme).
    if (onPlane) {
      setShift({ x: 0, y: 0 });
      return;
    }
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
  }, [left, top, onPlane]);

  const { scale, onEdge } = request;
  const style = request.displayStyle ?? request.style;
  const marks = fontStyleBits(style);
  const align = style.align === 'left' || style.align === 'right' ? style.align : 'center';
  const insets = labelPadding(style);
  // Boîte en pixels de page, agrandie au zoom : tailles du texte riche = tailles draw.io. Une forme : sur
  // son emprise. Une flèche : à la taille du texte, ancrée sur son point comme le label dessiné (aligné à
  // gauche : le texte part du point vers la droite ; à droite : l'inverse ; centré : de part et d'autre).
  const anchorShift = { left: '0', center: '-50%', right: '-100%' }[align];
  const anchorShiftY = style.verticalAlign === 'top' ? '0' : style.verticalAlign === 'bottom' ? '-100%' : '-50%';
  const boxStyle: CSSProperties = {
    left: left + shift.x,
    top: top + shift.y,
    outlineWidth: 1 / scale,
    background: request.background ?? 'transparent',
    // Texte de partie sur plusieurs lignes (sujet 331) : le cadre reste celui de la zone, avec ascenseurs.
    ...(request.part && !request.singleLine && { overflow: 'auto' }),
    ...(onEdge
      ? {
          padding: 1,
          minWidth: 8,
          // Texte qui suit sa flèche : tourné comme le trait, autour de son point.
          transform: `${request.angle ? `rotate(${request.angle}rad) ` : ''}scale(${scale}) translate(${anchorShift}, ${anchorShiftY})`,
        }
      : {
          // Exactement l'emprise de la forme (même étroite) : le texte qui dépasse déborde, centré
          // selon son alignement, comme le label dessiné. Vue de biais : la zone de texte en pixels de
          // page, plaquée sur ses coins à l'écran (homographie), dans le plan et le sens du label.
          width: plane ? plane.width : width / scale,
          height: plane ? plane.height : height / scale,
          // Marges communes du label dessiné (`spacing`, et celles de draw.io en haut et en bas) ; celles propres au
          // style (`spacingLeft`…) réduisent déjà le cadre (`Engine.labelEditZone`).
          padding: `${insets.top}px ${insets.right}px ${insets.bottom}px ${insets.left}px`,
          transform: plane ? planeTransform(plane) : `scale(${scale})`,
          justifyContent:
            style.verticalAlign === 'top' ? 'flex-start' : style.verticalAlign === 'bottom' ? 'flex-end' : 'center',
        }),
  };
  const decorations = [marks.underline && 'underline', marks.strike && 'line-through'].filter(Boolean).join(' ');
  const textStyle: CSSProperties = {
    fontSize: Number(style.fontSize) || 11,
    color: isColor(style.fontColor) ? style.fontColor : '#000000',
    fontWeight: marks.bold ? 700 : 400,
    fontStyle: marks.italic ? 'italic' : 'normal',
    textDecoration: decorations || 'none',
    fontFamily: isMonospace(style.fontFamily) ? "'Roboto Mono', monospace" : "'Roboto', sans-serif",
    textAlign: align,
    // Pas plus large que la forme (retour à la ligne), mais jamais plus étroit que le mot le plus long :
    // un débordement se répartit selon l'alignement (centré : des deux côtés).
    alignSelf: onEdge ? undefined : align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
    // Halo autour des lettres (texte de flèche sans fond), comme le label dessiné.
    textShadow: request.halo ? haloShadow(request.halo, request.haloWidth ?? 1.5, request.haloBlur ?? 0) : undefined,
    whiteSpace: onEdge || style.whiteSpace !== 'wrap' ? 'pre' : 'pre-wrap',
  };

  return (
    <>
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
          {...handlers}
        />
      </div>
      {onMoveText && (
        <TextTools
          box={box}
          anchor={{ x: left, y: top }}
          angle={request.angle}
          scale={scale}
          onMove={onMoveText}
          onEnd={onMoveTextEnd}
          flip={request.flip}
          onFlip={onFlip}
        />
      )}
    </>
  );
}

/** Écart entre le texte et ses outils (`margin-top` de `.text-tools`), appliqué dans le sens d'un texte tourné. */
const TOOLS_GAP = 4;

/**
 * Outils sous le texte d'une flèche en cours d'édition : la poignée ◇ (la tirer déplace le texte, son
 * ancre suit le pointeur au même écart qu'au moment de la saisie) et, pour un texte de début / fin dans
 * sa configuration par défaut, une flèche qui le fait sauter de l'autre côté du trait (et revenir). Ils
 * ne prennent pas le focus : la saisie continue.
 */
function TextTools({
  box,
  anchor,
  angle = 0,
  scale,
  onMove,
  onEnd,
  flip,
  onFlip,
}: {
  box: RefObject<HTMLDivElement | null>;
  anchor: { x: number; y: number };
  /** Texte tourné (qui suit sa flèche) : les outils sont sous lui, dans son sens. */
  angle?: number;
  scale: number;
  onMove?: (screen: { x: number; y: number }) => void;
  onEnd?: () => void;
  flip?: 'up' | 'down' | 'left' | 'right';
  onFlip?: () => void;
}) {
  const [position, setPosition] = useState<{ x: number; y: number }>();
  const grab = useRef<{ dx: number; dy: number } | undefined>(undefined);
  // Sous la boîte du texte (qui change de taille pendant la saisie), centrés ; texte tourné : sous lui dans
  // son sens (le centre de l'emprise à l'écran est celui de la boîte, quelle que soit la rotation).
  useLayoutEffect(() => {
    const element = box.current;
    const area = element?.offsetParent as HTMLElement | null;
    if (!element || !area) return;
    const place = () => {
      const rect = element.getBoundingClientRect();
      const origin = area.getBoundingClientRect();
      const below = (element.offsetHeight * scale) / 2 + (angle ? TOOLS_GAP : 0);
      setPosition({
        x: rect.left - origin.left + rect.width / 2 - Math.sin(angle) * below,
        y: rect.top - origin.top + rect.height / 2 + Math.cos(angle) * below,
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => observer.disconnect();
  }, [box, anchor.x, anchor.y, angle, scale]);
  if (!position || (!onMove && !(flip && onFlip))) return null;
  const areaOf = (target: Element) =>
    (target.closest('.text-tools')!.parentElement as HTMLElement).getBoundingClientRect();
  const FLIP_LABELS = { up: 'au-dessus', down: 'en dessous', left: 'à gauche', right: 'à droite' };
  return (
    <div
      className="text-tools"
      {...{ [TEXT_FORMAT_ATTRIBUTE]: '' }}
      style={{
        left: position.x,
        top: position.y,
        ...(angle && { marginTop: 0, transformOrigin: '0 0', transform: `rotate(${angle}rad) translateX(-50%)` }),
      }}
    >
      {onMove && (
        <div
          className="text-move-handle"
          title="Déplacer le texte"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            const area = areaOf(event.currentTarget);
            grab.current = { dx: event.clientX - area.left - anchor.x, dy: event.clientY - area.top - anchor.y };
          }}
          onPointerMove={(event) => {
            if (!grab.current) return;
            const area = areaOf(event.currentTarget);
            onMove({ x: event.clientX - area.left - grab.current.dx, y: event.clientY - area.top - grab.current.dy });
          }}
          onPointerUp={(event) => {
            if (!grab.current) return;
            grab.current = undefined;
            event.currentTarget.releasePointerCapture(event.pointerId);
            onEnd?.();
          }}
        />
      )}
      {flip && onFlip && (
        <button
          type="button"
          className="text-flip"
          title={`Passer le texte ${FLIP_LABELS[flip]} du trait`}
          aria-label={`Passer le texte ${FLIP_LABELS[flip]} du trait`}
          onPointerDown={(event) => event.preventDefault()}
          onClick={onFlip}
        >
          <svg
            viewBox="0 0 12 12"
            aria-hidden="true"
            style={{ transform: `rotate(${{ up: 0, right: 90, down: 180, left: 270 }[flip]}deg)` }}
          >
            <path d="M6 10.5V2M2.5 5.5 6 2l3.5 3.5" />
          </svg>
        </button>
      )}
    </div>
  );
}

/** Transformation CSS qui plaque la zone de texte (pixels de page) sur ses coins à l'écran. */
function planeTransform(plane: LabelEditPlane): string {
  const [origin] = plane.corners;
  const corners = plane.corners.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y }));
  return homographyCss(rectToQuad(plane.width, plane.height, corners));
}

/**
 * Halo CSS autour des lettres : ombres tout autour à `width` pixels de page (contenu non agrandi), au
 * bord flouté de `blur`.
 */
function haloShadow(color: string, width: number, blur: number): string {
  const steps = 12;
  return Array.from({ length: steps }, (_, i) => {
    const angle = (i / steps) * 2 * Math.PI;
    const x = Math.round(Math.cos(angle) * width * 100) / 100;
    const y = Math.round(Math.sin(angle) * width * 100) / 100;
    return `${x}px ${y}px ${blur}px ${color}`;
  }).join(', ');
}
