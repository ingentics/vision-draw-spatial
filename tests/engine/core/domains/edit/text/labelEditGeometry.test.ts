import { describe, expect, it } from 'vitest';
import {
  flipDirection,
  followedTextAngle,
  labelEditPlane,
  labelEditScreen,
  revealTarget,
  textScale,
} from '../../../../../../src/engine/core/domains/edit/text/labelEditGeometry';
import type { LabelEditView } from '../../../../../../src/engine/core/domains/edit/text/labelEditGeometry';
import type { LabelEditRequest } from '../../../../../../src/engine/core/domains/types';
import type { StandingPlane } from '../../../../../../src/engine/core/domains/view/projection';
import { END_TEXT_GAP, edgeTextLayout, flipTarget } from '../../../../../../src/engine/core/edit/edgeLabels';
import { pageToScreen } from '../../../../../../src/engine/core/interaction/cameraMath';
import type { CameraState } from '../../../../../../src/engine/core/interaction/cameraMath';
import { readDrawio } from '../../../../../../src/engine/core/format/parse';
import type { Point, Rect } from '../../../../../../src/engine/core/model/types';
import type { TextAlong } from '../../../../../../src/engine/core/render/textPath';

const FILE =
  '<mxfile><diagram id="p"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>' +
  '<mxCell id="a" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="b" vertex="1" parent="1"><mxGeometry x="300" y="0" width="100" height="60" as="geometry"/></mxCell>' +
  '<mxCell id="e" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>' +
  '</root></mxGraphModel></diagram></mxfile>';

const TOP: CameraState = { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 };
const ROUTE: Point[] = [
  { x: 100, y: 30 },
  { x: 300, y: 30 },
];

/** Vue réduite : vraie projection de la caméra, hauteurs et zones données ; `overrides` en remplace une partie. */
function view(overrides: Partial<LabelEditView> & { standing?: StandingPlane; along?: TextAlong } = {}): LabelEditView {
  const page = readDrawio(FILE).document.pages[0]!;
  const camera = overrides.camera ?? TOP;
  const viewport = { width: 800, height: 600 };
  const screenOfPoint = (p: Point, h: number) => pageToScreen(camera, viewport, p, h);
  return {
    page,
    level: 'flat',
    camera,
    viewport,
    projection: {
      screenOfPoint,
      screenRectOf: (_id: string, area?: Rect, elevation?: number) =>
        area && { ...screenOfPoint(area, elevation ?? 0), width: area.width, height: area.height },
      standingPlane: () => overrides.standing,
    },
    route: (id) => (id === 'e' ? ROUTE : undefined),
    elementTop: () => 0,
    labelTop: () => 0,
    textZone: (shape) => shape.bounds,
    followedText: () => overrides.along,
    endTextGap: () => END_TEXT_GAP,
    ...overrides,
  };
}

const request = (fields: Partial<LabelEditRequest>): LabelEditRequest => ({
  pageId: 'p',
  elementId: 'a',
  text: '',
  screen: { x: 0, y: 0, width: 0, height: 0 },
  style: {},
  scale: 1,
  onEdge: false,
  ...fields,
});

describe('emprise à l’écran du texte édité (sujet 384)', () => {
  it('forme : sa zone de texte projetée ; flèche : le point de son texte, sans étendue', () => {
    expect(labelEditScreen(view(), 'a')).toEqual({ x: 400, y: 300, width: 100, height: 60 });
    expect(labelEditScreen(view(), 'e')).toEqual({ x: 600, y: 330, width: 0, height: 0 });
    expect(labelEditScreen(view(), 'absent')).toBeUndefined();
  });

  it('pancarte d’une silhouette debout : le cadre du panneau, coins dans le sens de lecture', () => {
    const standing = {
      figure: {
        head: { x: 0, y: 0, width: 1, height: 1 },
        parts: [],
        strokes: [],
        sign: { x: 0, y: 0, width: 40, height: 20 },
      },
      toScreen: (p: Point) => ({ x: -p.x, y: -p.y, height: 0 }),
    } as unknown as StandingPlane;
    const v = view({ standing });
    expect(labelEditScreen(v, 'a')).toEqual({ x: -40, y: -20, width: 40, height: 20 });
    // L'axe x de la silhouette va vers la gauche de l'écran : le coin haut gauche est à x + largeur.
    expect(labelEditPlane(v, 'a')?.corners[0]).toEqual({ x: -40, y: -20 });
  });

  it('plan : aucun en vue de dessus non tournée ; les coins de la zone sinon', () => {
    expect(labelEditPlane(view(), 'a')).toBeUndefined();
    const plane = labelEditPlane(view({ camera: { ...TOP, rotation: Math.PI / 2 } }), 'a');
    expect(plane?.width).toBe(100);
    expect(plane?.corners).toHaveLength(4);
  });
});

describe('échelle et angle de l’éditeur (sujet 384)', () => {
  it('hors 3D : le zoom ; en 3D : pixels écran par pixel de page au niveau de l’élément', () => {
    expect(textScale(view({ camera: { ...TOP, zoom: 2 } }), 'a')).toBe(2);
    const scaled = view({ camera: { ...TOP, mode: '3d' } });
    scaled.projection.screenOfPoint = (p) => ({ x: p.x * 3, y: p.y * 3 });
    expect(textScale(scaled, 'a')).toBeCloseTo(3);
  });

  it('texte qui suit sa flèche : l’angle du trait, jamais à l’envers ; horizontal ou sans suivi : aucun', () => {
    const along = (path: Point[]): TextAlong => ({ path, position: 0, distance: 0, offset: { x: 0, y: 0 } });
    const down = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
    ];
    expect(followedTextAngle(view({ along: along(down) }), 'e')).toBeCloseTo(Math.PI / 2);
    expect(followedTextAngle(view({ along: along([...down].reverse()) }), 'e')).toBeCloseTo(Math.PI / 2);
    expect(followedTextAngle(view({ along: along([ROUTE[1]!, ROUTE[0]!]) }), 'e')).toBeUndefined();
    expect(followedTextAngle(view(), 'e')).toBeUndefined();
  });

  it('bascule : seulement pour un texte de début / fin de flèche, celle de `flipTarget`', () => {
    expect(flipDirection(view(), request({ elementId: 'e', onEdge: true }))).toBeUndefined();
    expect(flipDirection(view(), request({ elementId: 'a', end: 'start' }))).toBeUndefined();
    const placement = edgeTextLayout(ROUTE, 'start', false, END_TEXT_GAP).placement;
    expect(flipDirection(view(), request({ elementId: 'e', onEdge: true, end: 'start' }))).toBe(
      flipTarget(ROUTE, 'start', placement, {}, END_TEXT_GAP)?.direction,
    );
  });
});

describe('glissement de la vue pour montrer le texte édité (ticket 240)', () => {
  it('entièrement visible : la vue ne bouge pas', () => {
    expect(revealTarget(view(), request({ screen: { x: 100, y: 100, width: 100, height: 40 } }))).toBeUndefined();
  });

  it('coupé par le bord : la vue glisse juste assez pour laisser la marge de 20 px', () => {
    const v = view();
    const screen = { x: -50, y: 100, width: 100, height: 40 };
    const target = revealTarget(v, request({ elementId: 'absent', screen }))!;
    const grabbed = { x: screen.x - 400, y: screen.y - 300 };
    expect(pageToScreen(target, v.viewport, grabbed).x).toBeCloseTo(20);
  });

  it('texte de flèche (un point) : la boîte de 120 × 32 px autour de lui compte', () => {
    const target = revealTarget(view(), request({ onEdge: true, screen: { x: 30, y: 300, width: 0, height: 0 } }))!;
    expect(pageToScreen(target, { width: 800, height: 600 }, { x: 30 - 400, y: 0 }).x).toBeCloseTo(80);
  });
});
