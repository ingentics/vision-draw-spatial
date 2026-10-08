import { useId } from 'react';
import { jumpHalfLength, withJumps } from '../../engine';
import type { BackgroundSettings, Point, ShapeSettings } from '../../engine';
import { ArrowHead, PreviewFrame, pathOf } from './previewParts';

/** Flèche verticale, dessinée d'abord (dessous) ; l'horizontale, dessinée après, saute par-dessus. */
const BELOW: Point[] = [
  { x: 90, y: 8 },
  { x: 90, y: 102 },
];
const ABOVE: Point[] = [
  { x: 15, y: 55 },
  { x: 225, y: 55 },
];
const LABEL = { text: 'requête', x: 160, y: 55, fontSize: 11 };

/**
 * Aperçu des flèches (sujet 321) : deux flèches qui se croisent, la seconde saute la première comme le moteur
 * (`withJumps`, saut réglé), avec un texte de la couleur réglée sur son fond (halo de la couleur du plan, fond uni, ou
 * aucun).
 */
export function EdgeLabelPreview({ shapes, background }: { shapes: ShapeSettings; background: BackgroundSettings }) {
  const blur = useId();
  const jumps = { style: shapes.edgeJumpStyle, size: shapes.edgeJumpSize };
  const pieces =
    shapes.edgeJumpStyle === 'none'
      ? [ABOVE]
      : withJumps(ABOVE, [BELOW], shapes.edgeJumpStyle, jumpHalfLength({}, 1, jumps));
  // Largeur du texte estimée (pas de mesure dans l'aperçu) : 0,55 em par lettre.
  const width = LABEL.text.length * LABEL.fontSize * 0.55;
  const text = (props: object) => (
    <text x={LABEL.x} y={LABEL.y} fontSize={LABEL.fontSize} textAnchor="middle" dominantBaseline="central" {...props}>
      {LABEL.text}
    </text>
  );
  return (
    <PreviewFrame background={background} height={170} zoom={1.5} viewBox="0 0 240 110">
      <path d={pathOf(BELOW)} fill="none" stroke="#000000" />
      <ArrowHead points={BELOW} color="#000000" />
      {pieces.map((piece, i) => (
        <path key={i} d={pathOf(piece)} fill="none" stroke="#000000" />
      ))}
      <ArrowHead points={ABOVE} color="#000000" />
      {shapes.edgeLabelBackdrop === 'solid' && (
        <rect
          x={LABEL.x - width / 2 - 1}
          y={LABEL.y - LABEL.fontSize * 0.6 - 1}
          width={width + 2}
          height={LABEL.fontSize * 1.2 + 2}
          fill={background.color}
        />
      )}
      {shapes.edgeLabelBackdrop === 'halo' && (
        <>
          <filter id={blur}>
            <feGaussianBlur stdDeviation={shapes.edgeLabelHaloBlur / 2} />
          </filter>
          {text({
            fill: background.color,
            stroke: background.color,
            strokeWidth: 2 * shapes.edgeLabelHaloWidth,
            strokeLinejoin: 'round',
            filter: shapes.edgeLabelHaloBlur > 0 ? `url(#${blur})` : undefined,
          })}
        </>
      )}
      {text({ fill: shapes.edgeFontColor })}
    </PreviewFrame>
  );
}
