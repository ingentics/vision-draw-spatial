import { useId } from 'react';
import { distance, splitLabelFrame, splitPieces } from '../../engine';
import type { BackgroundSettings, Point, ShapeSettings } from '../../engine';
import { ArrowHead, PreviewFrame, PreviewShape, pathOf, sideOf } from './previewParts';

const SOURCE = { x: 10, y: 40, width: 70, height: 40 };
const TARGET = { x: 330, y: 40, width: 70, height: 40 };
const ROUTE = [sideOf(SOURCE, 'e'), sideOf(TARGET, 'w')];
/** Côté source sans texte (fondu), côté cible avec un texte de renvoi. */
const STYLE = { split: '1', splitLabelRight: 'Client' };
/** Interligne du texte de renvoi (comme le moteur). */
const LINE_HEIGHT = 1.2;

/**
 * Aperçu des flèches coupées (sujet 321) : une flèche coupée en deux tronçons (`splitPieces`) aux longueurs réglées,
 * celui du départ en fondu, celui de l'arrivée arrêté net sur son cadre de renvoi (marge et taille réglées).
 */
export function SplitEdgePreview({ shapes, background }: { shapes: ShapeSettings; background: BackgroundSettings }) {
  const fade = useId();
  const pieces = splitPieces(ROUTE, STYLE, {
    length: shapes.edgeSplitLength,
    fade: shapes.edgeSplitFade,
    labelPadding: shapes.edgeSplitLabelPadding,
    labelSize: shapes.edgeSplitLabelSize,
  });
  return (
    <PreviewFrame background={background} height={150} zoom={1.4} viewBox="0 0 410 110">
      <PreviewShape rect={SOURCE} label="Client" />
      <PreviewShape rect={TARGET} label="Paiement" />
      {pieces.map((piece) => {
        const start = piece.points[0]!;
        const end = piece.points[piece.points.length - 1]!;
        const id = `${fade}-${piece.side}`;
        return (
          <g key={piece.side}>
            {!piece.label && (
              <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={start.x} y1={start.y} x2={end.x} y2={end.y}>
                {/* Opaque jusqu'au début du fondu, puis transparent au bout (comme `alphaAt`). */}
                <stop offset={0} stopColor="#000000" />
                <stop offset={fadeStart(start, end, shapes.edgeSplitFade)} stopColor="#000000" />
                <stop offset={1} stopColor="#000000" stopOpacity={0} />
              </linearGradient>
            )}
            <path d={pathOf(piece.points)} fill="none" stroke={piece.label ? '#000000' : `url(#${id})`} />
            {piece.side === 'right' && <ArrowHead points={[...piece.points].reverse()} color="#000000" />}
            {piece.label && (
              <RefFrame
                text={piece.label}
                end={end}
                from={piece.points[piece.points.length - 2]!}
                shapes={shapes}
                background={background.color}
              />
            )}
          </g>
        );
      })}
    </PreviewFrame>
  );
}

/** Début du fondu d'un tronçon droit de `start` à `end`, en fraction de sa longueur (fondu borné au tronçon). */
function fadeStart(start: Point, end: Point, fade: number): number {
  const visible = distance(start, end) || 1;
  return Math.max(0, 1 - fade / visible);
}

/** Cadre de renvoi au bout d'un tronçon : fond du plan, bord du trait, texte au centre (`edge.ts`). */
function RefFrame({
  text,
  end,
  from,
  shapes,
  background,
}: {
  text: string;
  end: Point;
  from: Point;
  shapes: ShapeSettings;
  background: string;
}) {
  const size = shapes.edgeSplitLabelSize;
  const padding = shapes.edgeSplitLabelPadding;
  // Largeur du texte estimée (pas de mesure dans l'aperçu) : 0,55 em par lettre.
  const width = text.length * size * 0.55 + 2 * padding;
  const height = size * LINE_HEIGHT + 2 * padding;
  const length = distance(from, end) || 1;
  const center = splitLabelFrame(end, { x: (end.x - from.x) / length, y: (end.y - from.y) / length }, width, height);
  return (
    <>
      <rect
        x={center.x - width / 2}
        y={center.y - height / 2}
        width={width}
        height={height}
        fill={background}
        stroke="#000000"
      />
      <text x={center.x} y={center.y} fontSize={size} textAnchor="middle" dominantBaseline="central" fill="#000000">
        {text}
      </text>
    </>
  );
}
