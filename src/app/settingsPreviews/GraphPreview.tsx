import { distance, LABEL_GAP, LABEL_HEIGHT, LABEL_WIDTH, STATUS_HEIGHT } from '../../engine';
import type { BackgroundSettings, GraphSettings, Point, Rect } from '../../engine';
import { ArrowHead, PreviewFrame, pathOf } from './previewParts';

const MARGIN = 20;

/**
 * Aperçu de la vue graphe (sujets 320, 362, 367) : de haut en bas, la page de départ (couleur d'accent) reliée dans
 * les deux sens à une page et vers une autre ; dessous une page inaccessible et une orpheline (cercles en tirets,
 * côte à côte ici pour tenir dans l'aperçu) ; tailles et écarts réglés, comme `graphPage.ts`.
 */
export function GraphPreview({
  graph,
  background,
  accent,
}: {
  graph: GraphSettings;
  background: BackgroundSettings;
  accent: string;
}) {
  const size = graph.nodeSize;
  const stepX = Math.max(size, LABEL_WIDTH) + graph.nodeGap;
  const stepY = STATUS_HEIGHT + size + LABEL_GAP + LABEL_HEIGHT + graph.layerGap;
  const viewWidth = 2 * MARGIN + stepX + Math.max(size, LABEL_WIDTH);
  // Rangée `row`, position `slot` en demi-pas depuis le centre (−1, 0, 1).
  const node = (row: number, slot: number): Rect => ({
    x: viewWidth / 2 + (slot * stepX) / 2 - size / 2,
    y: MARGIN + STATUS_HEIGHT + row * stepY,
    width: size,
    height: size,
  });
  const start = node(0, 0);
  const page = node(1, -1);
  const other = node(1, 1);
  const nodes = [
    { rect: start, name: 'Accueil', status: 'départ', stroke: accent, dashed: false },
    { rect: page, name: 'Architecture', status: '', stroke: graph.cardColor, dashed: false },
    { rect: other, name: 'Détail', status: '', stroke: graph.cardColor, dashed: false },
    { rect: node(2, -1), name: 'Annexe', status: 'inaccessible', stroke: graph.unreachableColor, dashed: true },
    { rect: node(2, 1), name: 'Brouillon', status: 'orpheline', stroke: graph.orphanColor, dashed: true },
  ];
  const viewHeight = 2 * MARGIN + 3 * stepY - graph.layerGap;
  const links = [link(start, page, graph.pairOffset), link(page, start, graph.pairOffset), link(start, other, 0)];
  return (
    <PreviewFrame background={background} height={320} zoom={0.5} viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
      {/* Flèches d'abord : celle qui descend d'un nœud passe sous son nom, comme dans la vue graphe. */}
      {links.map((points, i) => (
        <g key={i}>
          <path d={pathOf(points)} fill="none" stroke={graph.arcColor} strokeWidth={2} />
          <ArrowHead points={points} color={graph.arcColor} size={8} />
        </g>
      ))}
      {nodes.map(({ rect, name, status, stroke, dashed }, i) => {
        const c = centerOf(rect);
        return (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={size / 2}
              fill="#ffffff"
              stroke={stroke}
              strokeWidth={2}
              strokeDasharray={dashed ? '6 4' : undefined}
            />
            <text
              x={c.x}
              y={rect.y + size + LABEL_GAP}
              textAnchor="middle"
              dominantBaseline="hanging"
              fontSize={15}
              fontWeight="bold"
              fill={graph.titleColor}
              stroke={background.color}
              strokeWidth={6}
              paintOrder="stroke"
            >
              {name}
            </text>
            {status && (
              <text x={c.x} y={rect.y - 4} textAnchor="middle" fontSize={12} fill={stroke}>
                {status}
              </text>
            )}
          </g>
        );
      })}
    </PreviewFrame>
  );
}

const centerOf = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/** Lien d'un nœud à l'autre par un point décalé de son côté (aller-retour distincts), coupé aux cercles. */
function link(from: Rect, to: Rect, offset: number): Point[] {
  const a = centerOf(from);
  const b = centerOf(to);
  const length = distance(a, b) || 1;
  const middle = {
    x: (a.x + b.x) / 2 - ((b.y - a.y) / length) * offset,
    y: (a.y + b.y) / 2 + ((b.x - a.x) / length) * offset,
  };
  return [exit(from, middle), middle, exit(to, middle)];
}

/** Point où la demi-droite du centre du cercle inscrit dans `rect` vers `toward` sort du cercle. */
function exit(rect: Rect, toward: Point): Point {
  const c = centerOf(rect);
  const k = rect.width / 2 / (distance(c, toward) || 1);
  return { x: c.x + (toward.x - c.x) * k, y: c.y + (toward.y - c.y) * k };
}
