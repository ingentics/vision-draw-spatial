import { distance } from '../../engine';
import type { BackgroundSettings, GraphSettings, Point, Rect } from '../../engine';
import { ArrowHead, PreviewFrame, pathOf } from './previewParts';

/** Proportions d'une carte (hauteur / largeur), entre les bornes de la vue graphe (`graphPage.ts`). */
const CARD_RATIO = 0.55;
/** Hauteur du titre au-dessus d'une carte (`graphPage.ts` : 26). */
const TITLE_HEIGHT = 26;
const MARGIN = 20;

/**
 * Aperçu de la vue graphe (sujet 320) : la page de départ (couleur d'accent) reliée dans les deux sens à une page, et
 * dessous une page orpheline et une inaccessible (cadres en tirets) ; tailles et écarts réglés, comme `graphPage.ts`.
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
  const height = graph.cardWidth * CARD_RATIO;
  const card = (column: number, row: number): Rect => ({
    x: MARGIN + column * (width + graph.columnGap),
    y: MARGIN + TITLE_HEIGHT + row * (height + graph.rowGap + TITLE_HEIGHT),
    width,
    height,
  });
  const start = card(0, 0);
  const page = card(1, 0);
  const cards = [
    { rect: start, title: 'Accueil  ·  départ', stroke: accent, dashed: false },
    { rect: page, title: 'Architecture', stroke: graph.cardColor, dashed: false },
    { rect: card(0, 1), title: 'Brouillon  ·  orpheline', stroke: graph.orphanColor, dashed: true },
    { rect: card(1, 1), title: 'Annexe  ·  inaccessible', stroke: graph.unreachableColor, dashed: true },
  ];
  const viewWidth = 2 * MARGIN + 2 * width + graph.columnGap;
  const viewHeight = 2 * MARGIN + 2 * (height + TITLE_HEIGHT) + graph.rowGap;
  return (
    <PreviewFrame background={background} height={250} zoom={0.5} viewBox={`0 0 ${viewWidth} ${viewHeight}`}>
      {cards.map(({ rect, title, stroke, dashed }, i) => (
        <g key={i}>
          <rect
            {...rect}
            rx={12}
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray={dashed ? '6 4' : undefined}
          />
          <text x={rect.x} y={rect.y - 4} fontSize={15} fontWeight="bold" fill={dashed ? stroke : graph.titleColor}>
            {title}
          </text>
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
