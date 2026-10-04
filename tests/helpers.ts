import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');
}

/**
 * Tracés des arêtes dans un export SVG de draw.io (`draw.io -x -f svg`) : premier `<path>` de chaque
 * cellule (`data-cell-id`) dont l'id passe `edgeIds`, ramené en coordonnées de page. L'export est décalé
 * sur l'emprise du dessin : le décalage est mesuré sur le rectangle d'une forme de référence.
 */
export function drawioSvgRoutes(
  svg: string,
  reference: { id: string; x: number; y: number },
  edgeIds: (id: string) => boolean,
): Map<string, Array<{ x: number; y: number }>> {
  const cells = new Map<string, string>();
  for (const part of svg.split('data-cell-id="').slice(1)) cells.set(part.slice(0, part.indexOf('"')), part);
  const rect = /<rect x="([-\d.]+)" y="([-\d.]+)"/.exec(cells.get(reference.id) ?? '');
  if (!rect) throw new Error(`Forme de référence ${reference.id} absente du SVG`);
  const dx = reference.x - parseFloat(rect[1]!);
  const dy = reference.y - parseFloat(rect[2]!);
  const routes = new Map<string, Array<{ x: number; y: number }>>();
  for (const [id, part] of cells) {
    if (!edgeIds(id)) continue;
    const d = /<path d="([^"]*)"/.exec(part)?.[1];
    if (!d) continue;
    const numbers = d.match(/-?[\d.]+/g)!.map(Number);
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i]! + dx, y: numbers[i + 1]! + dy });
    routes.set(id, points);
  }
  return routes;
}

/**
 * Retire les points quasi alignés (à moins de `tolerance` px de la droite de leurs voisins) : l'export SVG
 * de draw.io ajoute des points arrondis au centième sur les segments en biais.
 */
export function dropCollinear(points: Array<{ x: number; y: number }>, tolerance = 0.1) {
  const result = [...points];
  for (let i = 1; i + 1 < result.length;) {
    const [a, b, c] = [result[i - 1]!, result[i]!, result[i + 1]!];
    const length = Math.hypot(c.x - a.x, c.y - a.y);
    const distance =
      length === 0
        ? Math.hypot(b.x - a.x, b.y - a.y)
        : Math.abs((c.x - a.x) * (a.y - b.y) - (a.x - b.x) * (c.y - a.y)) / length;
    const between = (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) >= 0;
    if (distance < tolerance && between) result.splice(i, 1);
    else i++;
  }
  return result;
}

/**
 * Contours des formes dans un export SVG de draw.io : premier `<path>` de chaque cellule dont l'id passe
 * `ids`, avec sa transformation (`translate`, `scale`, `rotate(a, cx, cy)`, appliquées de droite à gauche
 * comme en SVG), ramené en coordonnées de page (décalage mesuré sur le rectangle de référence).
 */
export function drawioSvgOutlines(
  svg: string,
  reference: { id: string; x: number; y: number },
  ids: (id: string) => boolean,
): Map<string, Array<{ x: number; y: number }>> {
  const cells = new Map<string, string>();
  for (const part of svg.split('data-cell-id="').slice(1)) cells.set(part.slice(0, part.indexOf('"')), part);
  const rect = /<rect x="([-\d.]+)" y="([-\d.]+)"/.exec(cells.get(reference.id) ?? '');
  if (!rect) throw new Error(`Forme de référence ${reference.id} absente du SVG`);
  const dx = reference.x - parseFloat(rect[1]!);
  const dy = reference.y - parseFloat(rect[2]!);
  const outlines = new Map<string, Array<{ x: number; y: number }>>();
  for (const [id, part] of cells) {
    if (!ids(id)) continue;
    const tag = /<path [^>]*>/.exec(part)?.[0];
    const d = tag && /\bd="([^"]*)"/.exec(tag)?.[1];
    if (!tag || !d) continue;
    const transform = /\btransform="([^"]*)"/.exec(tag)?.[1];
    const numbers = d.match(/-?[\d.]+/g)!.map(Number);
    let points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i + 1 < numbers.length; i += 2) points.push({ x: numbers[i]!, y: numbers[i + 1]! });
    const steps = [...(transform ?? '').matchAll(/(translate|scale|rotate)\(([^)]*)\)/g)].reverse();
    for (const [, op, args] of steps) {
      const [a = 0, b = op === 'scale' ? a : 0, c = 0] = args!.split(',').map(Number);
      points = points.map((p) => {
        if (op === 'translate') return { x: p.x + a, y: p.y + b };
        if (op === 'scale') return { x: p.x * a, y: p.y * b };
        const rad = (a * Math.PI) / 180;
        const [x, y] = [p.x - b, p.y - c];
        return { x: b + x * Math.cos(rad) - y * Math.sin(rad), y: c + x * Math.sin(rad) + y * Math.cos(rad) };
      });
    }
    outlines.set(
      id,
      points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    );
  }
  return outlines;
}
