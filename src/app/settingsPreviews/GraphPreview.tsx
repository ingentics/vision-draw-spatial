import { distance, NODE_HEIGHT, STATUS_HEIGHT } from '../../engine';
import type { BackgroundSettings, GraphSettings, Point, Rect } from '../../engine';
import { ArrowHead, PreviewFrame, pathOf } from './previewParts';

const MARGIN = 20;

/**
 * Aperçu de la vue graphe (sujets 320, 362) : la page de départ (couleur d'accent) reliée dans les deux sens à une
 * page, et dessous une page orpheline et une inaccessible (cadres en tirets) ; tailles et écarts réglés, comme
 * `graphPage.ts`.
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
  const width = graph.cardWidth;
  const height = NODE_HEIGHT;
  const card = (column: number, row: number): Rect => ({
    x: MARGIN + column * (width + graph.columnGap),
    y: MARGIN + STATUS_HEIGHT + row * (height + graph.rowGap + STATUS_HEIGHT),
    width,
    height,
  });
  const start = card(0, 0);
  const page = card(1, 0);
  const cards = [
    { rect: start, name: 'Accueil', status: 'départ', stroke: accent, dashed: false },
    { rect: page, name: 'Architecture', status: '', stroke: graph.cardColor, dashed: false },
    { rect: card(0, 1), name: 'Brouillon', status: 'orpheline', stroke: graph.orphanColor, dashed: true },
    { rect: card(1, 1), name: 'Annexe', status: 'inaccessible', stroke: graph.unreachableColor, dashed: true },
  ];
  const viewWidth = 2 * MARGIN + 2 * width + graph.columnGap;
  const viewHeight = 2 * MARGIN + 2 * (height + STATUS_HEIGHT) + graph.rowGap;
  return (
    <PreviewFrame background={background} height={250} zoom={0.5} viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
      {cards.map(({ rect, name, status, stroke, dashed }, i) => (
        <g key={i}>
          <rect
            {...rect}
            rx={12}
            fill="#ffffff"
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray={dashed ? '6 4' : undefined}
          />
          <text
            x={rect.x + rect.width / 2}
            y={rect.y + rect.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={15}
            fontWeight="bold"
            fill={graph.titleColor}
          >
            {name}
          </text>
          {status && (
            <text x={rect.x} y={rect.y - 4} fontSize={12} fill={stroke}>
              {status}
            </text>
          )}
        </g>
      ))}
      {[link(start, page, graph.pairOffset), link(page, start, graph.pairOffset)].map((points, i) => (
        <g key={i}>
          <path d={pathOf(points)} fill="none" stroke={graph.arcColor} strokeWidth={2} />
          <ArrowHead points={points} color={graph.arcColor} size={8} />
        </g>
      ))}
    </PreviewFrame>
  );
}

const centerOf = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

/** Lien d'une carte à l'autre par un point décalé de son côté (aller-retour distincts), coupé aux cadres. */
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

/** Point où la demi-droite du centre de `rect` vers `toward` sort du cadre. */
function exit(rect: Rect, toward: Point): Point {
  const c = centerOf(rect);
  const d = { x: toward.x - c.x, y: toward.y - c.y };
  const k = Math.min(
    d.x === 0 ? Infinity : rect.width / 2 / Math.abs(d.x),
    d.y === 0 ? Infinity : rect.height / 2 / Math.abs(d.y),
  );
  return { x: c.x + d.x * k, y: c.y + d.y * k };
}
