import { Box3, Object3D, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import type { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { collectUnsupported } from '../../../../src/engine/core/diagnostics/unsupportedStyles';
import { parseDrawio } from '../../../../src/engine/core/format/parse';
import { applyCameraState, applyPerspectiveState } from '../../../../src/engine/core/interaction/cameraMath';
import { pickElement } from '../../../../src/engine/core/interaction/pick';
import type { CameraState } from '../../../../src/engine/core/interaction/cameraMath';
import { orientBillboards } from '../../../../src/engine/core/render/billboard';
import { headSelectionRing } from '../../../../src/engine/core/render/decorations';
import { buildPageScene } from '../../../../src/engine/core/render/pageScene';
import { applyPageSpace } from '../../../../src/engine/core/render/space';
import type { RenderContext, TextSpec } from '../../../../src/engine/core/render/types';
import { DROID_SHAPE } from '../../../../src/engine/plugins/shapes/general/actors/droid';
import { decodeDiagram } from '../../../../src/engine/core/format/decode';
import { createDefaultRegistry } from '../../../../src/engine/plugins';

/** Actor (41) : bonhomme de draw.io en 2D, debout face à la caméra en iso / 3D. */

const STYLE = 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;';
const texts: TextSpec[] = [];
const ctx: RenderContext = {
  text: { create: (spec) => (texts.push(spec), Object.assign(new Object3D(), { userData: { spec } })) },
  volume: { depth: 20 },
};
const registry = createDefaultRegistry();

/** Une page d'Actors (30 × 60) aux positions données. */
function page(cells: Array<{ style?: string; x: number; y: number; value?: string }>) {
  const xml = cells
    .map(
      ({ style = STYLE, x, y, value = '' }, i) =>
        `<mxCell id="a${i}" value="${value}" style="${style}" vertex="1" parent="1">` +
        `<mxGeometry x="${x}" y="${y}" width="30" height="60" as="geometry"/></mxCell>`,
    )
    .join('');
  return parseDrawio(
    `<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${xml}` +
      `</root></mxGraphModel></diagram></mxfile>`,
  );
}

const isoScene = (document: ReturnType<typeof page>) => {
  const scene = buildPageScene(document.pages[0]!, registry, ctx, 'iso');
  applyPageSpace(scene.root);
  scene.root.updateMatrixWorld(true);
  return scene;
};
const element = (root: Object3D, id: string) => root.children.find((c) => c.userData.elementId === id)!;

describe('Actor (41)', () => {
  it('dessiné par sa définition, absent des Diagnostics ; spatial.kind=actor le dessine', () => {
    const document = page([
      { x: 0, y: 0 },
      { style: 'shape=note;spatial.kind=actor;', x: 100, y: 0 },
    ]);
    expect(document.pages[0]!.shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['actor', 'actor']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('2D : tête ronde remplie sur le quart du haut, corps, bras et jambes en traits, étirés dans les bornes', () => {
    const scene = buildPageScene(page([{ x: 100, y: 100 }]).pages[0]!, registry, ctx, 'flat');
    const actor = element(scene.root, 'a0');
    const head = new Box3().setFromObject(actor.getObjectByName('fill')!);
    expect([head.min.x, head.min.y, head.max.x, head.max.y].map((v) => +v.toFixed(3))).toEqual([
      107.5, 100, 122.5, 115,
    ]);
    // Tête, corps, bras, jambes.
    expect(actor.children.filter((c) => c.name === 'stroke')).toHaveLength(4);
    // Dans les bornes, à la demi-épaisseur du trait près.
    const all = new Box3().setFromObject(actor);
    expect([all.min.x, all.max.x].map((v) => Math.round(v))).toEqual([100, 130]);
    expect(all.min.y).toBeCloseTo(99.5, 1);
    expect(all.max.y).toBeGreaterThan(159.5);
    expect(all.max.y).toBeLessThan(161);
  });

  it('sans pancarte (spatial.sign=0) : label sous la forme (verticalLabelPosition=bottom), posé au sol en iso', () => {
    texts.length = 0;
    const scene = isoScene(page([{ style: `${STYLE}spatial.sign=0;`, x: 100, y: 100, value: 'Client' }]));
    const spec = texts.find((t) => t.text === 'Client')!;
    expect(spec.y).toBeGreaterThan(160);
    const label = element(scene.root, 'a0').getObjectByName('label')!;
    expect(label.userData.outsideLabel).toBe(true);
    expect(label.position.z).toBeLessThan(1);
  });

  it('iso : pas d’extrusion, silhouette debout au centre de l’emprise, de la hauteur de la forme', () => {
    const scene = isoScene(page([{ x: 100, y: 100 }]));
    const actor = element(scene.root, 'a0');
    expect(actor.getObjectByName('sides')).toBeUndefined();
    const silhouette = actor.getObjectByName('silhouette')!;
    expect(silhouette.userData.billboard).toBe(true);
    expect([silhouette.position.x, silhouette.position.y]).toEqual([115, 130]);
    // Espace monde : y vers le haut. Pieds au sol, tête à 60 (hauteur de la forme).
    const box = new Box3().setFromObject(silhouette.getObjectByName('head')!);
    expect(+box.max.y.toFixed(3)).toBe(60);
    expect(+box.min.y.toFixed(3)).toBe(45);
    expect(registry.volumeHeight(page([{ x: 0, y: 0 }]).pages[0]!.shapes[0]!, ctx)).toBe(60);
  });

  it('clic en iso : sur toute sa hauteur (pieds compris), pas seulement au niveau de la tête', () => {
    const document = page([{ x: 100, y: 100 }]);
    const scene = isoScene(document);
    expect(element(scene.root, 'a0').userData.standing).toBe(true);
    // Vue simplifiée : à `h` px de haut, le rayon arrive 1,5 h plus haut sur la page. Visé : les pieds (sol, y = 158).
    const options = {
      edgeTolerance: 4,
      edgeRoute: () => undefined,
      heightOf: () => 60,
      pointAtHeight: (height: number) => ({ x: 115, y: 158 - height * 1.5 }),
    };
    expect(pickElement(document.pages[0]!, { x: 115, y: 158 }, options)).toBeUndefined();
    const picked = pickElement(document.pages[0]!, { x: 115, y: 158 }, { ...options, baseOf: () => 0 });
    expect(picked?.element.id).toBe('a0');
  });

  // Étape 168 : la sélection en iso / 3D est un cercle autour de la tête, pas un rectangle au-dessus de l'emprise.
  it('sélection en iso : cercle autour de la tête, face à la caméra comme la silhouette', () => {
    const scene = isoScene(page([{ x: 100, y: 100 }]));
    const silhouette = element(scene.root, 'a0').getObjectByName('silhouette')!;
    const head = silhouette.userData.head;
    expect(head).toEqual({ x: -7.5, y: 45, width: 15, height: 15 });
    const ring = headSelectionRing(head, silhouette.position, 1, { dashed: false });
    expect(ring.userData.billboard).toBe(true);
    scene.root.add(ring);
    scene.root.updateMatrixWorld(true);
    const ringBox = new Box3().setFromObject(ring);
    const headBox = new Box3().setFromObject(silhouette.getObjectByName('head')!);
    // Monde : y vers le haut ; le cercle entoure la tête de quelques pixels.
    expect(ringBox.min.y).toBeLessThan(headBox.min.y);
    expect(ringBox.max.y).toBeGreaterThan(headBox.max.y);
    expect(ringBox.max.y).toBeLessThan(headBox.max.y + 5);
    expect(ringBox.min.x).toBeLessThan(headBox.min.x);
    expect(ringBox.max.x).toBeGreaterThan(headBox.max.x);
  });

  // Étape 169 : en iso / 3D, seule la silhouette se clique ; à côté de la tête, la forme derrière est prise.
  it('clic sur une silhouette debout : sa zone remplace les bornes et le volume', () => {
    const document = page([{ x: 100, y: 100 }]);
    document.pages[0]!.shapes.unshift({ ...document.pages[0]!.shapes[0]!, id: 'behind', z: -1, style: {} });
    const options = {
      edgeTolerance: 4,
      edgeRoute: () => undefined,
      heightOf: (id: string) => (id === 'a0' ? 60 : 20),
      baseOf: () => 0,
      pointAtHeight: () => ({ x: 115, y: 130 }),
    };
    const missed = pickElement(
      document.pages[0]!,
      { x: 115, y: 130 },
      {
        ...options,
        standingHit: (shape) => (shape.id === 'a0' ? { at: undefined } : undefined),
      },
    );
    expect(missed?.element.id).toBe('behind');
    const hit = pickElement(
      document.pages[0]!,
      { x: 115, y: 130 },
      {
        ...options,
        standingHit: (shape) => (shape.id === 'a0' ? { at: 52 } : undefined),
      },
    );
    expect(hit?.element.id).toBe('a0');
    expect(element(isoScene(document).root, 'a0').getObjectByName('silhouette')!.userData.strokes).toHaveLength(3);
  });

  // Étape 170 : en iso / 3D, l'Actor tient son texte sur une pancarte, entre ses mains.
  it('pancarte par défaut : texte ajusté au panneau, tenu devant le corps, bras jusqu’à ses bords', () => {
    texts.length = 0;
    const scene = isoScene(page([{ x: 100, y: 100, value: 'Client' }]));
    const actor = element(scene.root, 'a0');
    const silhouette = actor.getObjectByName('silhouette')!;
    const sign = silhouette.getObjectByName('sign')!;
    expect(sign).toBeDefined();
    // Le texte est sur la pancarte (pas au sol), ajusté et centré.
    const label = sign.getObjectByName('label')!;
    expect(label.userData.outsideLabel).toBeUndefined();
    const spec = texts.find((t) => t.text === 'Client')!;
    expect(spec.fit).toBeDefined();
    expect(spec.anchorX).toBe('center');
    expect(actor.children.some((c) => c.name === 'label')).toBe(false);
    // Panneau : 42 × 21 (1,4 × la largeur, 0,35 × la hauteur), bord haut juste au-dessus des mains (épaules, 40).
    expect(silhouette.userData.sign).toEqual({ x: -21, y: 22.15, width: 42, height: 21 });
    const board = new Box3().setFromObject(sign.getObjectByName('sign-board')!);
    // Monde : y vers le haut, et le panneau plus près de la caméra (−z monde, face vers −y page) que le corps.
    expect(+board.max.y.toFixed(2)).toBe(43.15);
    expect(+board.min.y.toFixed(2)).toBe(22.15);
    expect(+(board.max.x - board.min.x).toFixed(2)).toBe(42);
    // Étape 171 : deux mains devant le panneau, à cheval sur ses bords.
    const hands = sign.children.filter((c) => c.name === 'hand');
    expect(hands).toHaveLength(2);
    for (const hand of hands) {
      const box = new Box3().setFromObject(hand);
      const outer = Math.max(Math.abs(box.min.x - 115), Math.abs(box.max.x - 115));
      const inner = Math.min(Math.abs(box.min.x - 115), Math.abs(box.max.x - 115));
      expect(outer).toBeGreaterThan(21);
      expect(inner).toBeLessThan(21);
    }
    // Bras tendus jusqu'aux bords.
    const arms = silhouette.userData.strokes[1];
    expect(arms.map((p: { x: number }) => p.x)).toEqual([21, -21]);
  });

  it('pas de pancarte sans texte, ni avec spatial.sign=0', () => {
    const scene = isoScene(
      page([
        { x: 0, y: 0 },
        { style: `${STYLE}spatial.sign=0;`, x: 100, y: 0, value: 'Client' },
      ]),
    );
    for (const id of ['a0', 'a1']) expect(element(scene.root, id).getObjectByName('sign')).toBeUndefined();
  });

  it('spatial.height : hauteur debout, proportions gardées', () => {
    const scene = isoScene(page([{ style: `${STYLE}spatial.height=120;`, x: 100, y: 100 }]));
    const head = new Box3().setFromObject(element(scene.root, 'a0').getObjectByName('head')!);
    expect(+head.max.y.toFixed(3)).toBe(120);
    expect(+(head.max.y - head.min.y).toFixed(3)).toBe(30);
  });
});

describe('orientBillboards : silhouettes face à la caméra', () => {
  const state = (patch: Partial<CameraState>): CameraState => ({
    mode: 'iso',
    center: { x: 500, y: 500 },
    zoom: 1,
    rotation: 0,
    tilt: 0.95,
    ...patch,
  });
  const viewport = { width: 800, height: 600 };
  const scene = () =>
    isoScene(
      page([
        { x: 100, y: 470 },
        { x: 870, y: 470 },
      ]),
    );
  const silhouettes = (root: Group) => ['a0', 'a1'].map((id) => element(root, id).getObjectByName('silhouette')!);
  /** Direction (monde, horizontale) vers laquelle la silhouette regarde : son axe −y. */
  const facing = (object: Object3D) => {
    object.updateMatrixWorld(true);
    const d = new Vector3(0, -1, 0).transformDirection(object.matrixWorld);
    return { x: d.x, z: d.z };
  };

  it('iso (orthographique) : toutes regardent vers la caméra, selon la rotation de la vue', () => {
    const { root } = scene();
    const camera = new OrthographicCamera();
    applyCameraState(camera, state({}), viewport);
    orientBillboards(root, camera);
    // Rotation 0 : la caméra est vers le bas de la page (+y page = +z monde).
    for (const s of silhouettes(root)) {
      const d = facing(s);
      expect(d.x).toBeCloseTo(0);
      expect(d.z).toBeCloseTo(1);
    }
    applyCameraState(camera, state({ rotation: Math.PI / 2 }), viewport);
    orientBillboards(root, camera);
    const [a, b] = silhouettes(root).map(facing);
    expect(a!.x).toBeCloseTo(b!.x);
    expect(a!.z).toBeCloseTo(b!.z);
    expect(Math.hypot(a!.x, a!.z)).toBeCloseTo(1);
    expect(Math.abs(a!.z)).toBeLessThan(1e-6);
  });

  it('vue d’aplomb : face au bas de l’écran', () => {
    const { root } = scene();
    const camera = new OrthographicCamera();
    applyCameraState(camera, state({ tilt: 0 }), viewport);
    orientBillboards(root, camera);
    const d = facing(silhouettes(root)[0]!);
    expect(d.z).toBeCloseTo(1);
  });

  it('3D (perspective) : chacune vise exactement la position de la caméra', () => {
    const { root } = scene();
    const camera = new PerspectiveCamera();
    applyPerspectiveState(camera, state({ mode: '3d', fov: 0.8 }), viewport);
    camera.updateMatrixWorld();
    orientBillboards(root, camera);
    const [left, right] = silhouettes(root);
    for (const s of [left!, right!]) {
      const position = new Vector3().setFromMatrixPosition(s.matrixWorld);
      const toCamera = camera.position.clone().sub(position);
      const d = facing(s);
      const length = Math.hypot(toCamera.x, toCamera.z);
      expect(d.x).toBeCloseTo(toCamera.x / length);
      expect(d.z).toBeCloseTo(toCamera.z / length);
    }
    // De part et d'autre de la caméra, elles ne regardent pas dans la même direction.
    expect(facing(left!).x).toBeGreaterThan(0);
    expect(facing(right!).x).toBeLessThan(0);
  });
});

/** Droid (173, 174) : l'Actor avec une tête de droid de combat et une antenne à droite, stencil embarqué pour draw.io. */
describe('Droid (173)', () => {
  const DROID = `shape=${DROID_SHAPE};verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;`;

  it('stencil actor-droid dessiné par sa définition, absent des Diagnostics ; spatial.kind=actor-droid le dessine', () => {
    const document = page([
      { style: DROID, x: 0, y: 0 },
      { style: 'shape=umlActor;spatial.kind=actor-droid;', x: 100, y: 0 },
    ]);
    const shapes = document.pages[0]!.shapes;
    expect(shapes[0]!.kind).toBe('stencil:actor-droid');
    expect(shapes.map((s) => registry.resolve(s).definition.id)).toEqual(['actor-droid', 'actor-droid']);
    expect(collectUnsupported(document, registry).entries).toEqual([]);
  });

  it('stencil draw.io : cadre 30 × 60 étiré, tête en fond, antenne et corps devant', () => {
    const xml = decodeDiagram(DROID_SHAPE.slice('stencil('.length, -1));
    expect(xml).toMatch(/^<shape name="actor-droid" w="30" h="60" aspect="variable" strokewidth="inherit">/);
    // Tête, puis embout de l'antenne (remplis), puis corps, bras, jambes et tige (traits).
    expect(xml.match(/<fillstroke\/>/g)).toHaveLength(2);
    expect(xml.match(/<stroke\/>/g)).toHaveLength(4);
  });

  it('2D : tête allongée de droid de combat, antenne à sa droite, corps de l’Actor, étirés dans les bornes', () => {
    const scene = buildPageScene(page([{ style: DROID, x: 100, y: 100 }]).pages[0]!, registry, ctx, 'flat');
    const droid = element(scene.root, 'a0');
    const [head, ball] = droid.children.filter((c) => c.name === 'fill');
    const box = (o: Object3D) => {
      const b = new Box3().setFromObject(o);
      return [b.min.x, b.min.y, b.max.x, b.max.y].map((v) => +v.toFixed(3));
    };
    // Tête : 10 de large au plus (aux yeux), du haut du cadre (1,5) au cou (15) ; coins arrondis.
    const [left = 0, top, right = 0, bottom] = box(head!);
    expect(left).toBeGreaterThanOrEqual(110);
    expect(right).toBeLessThanOrEqual(120);
    expect(right - left).toBeGreaterThan(9);
    expect([top, bottom]).toEqual([101.5, 115]);
    // Embout de l'antenne, à droite de la tête, en haut du cadre.
    expect(box(ball!)).toEqual([121, 100, 122.6, 103.5]);
    // Tête, embout, corps, bras, jambes, tige.
    expect(droid.children.filter((c) => c.name === 'stroke')).toHaveLength(6);
  });

  it('iso : debout avec sa pancarte, sélection autour de la tête, tête et embout cliquables', () => {
    const scene = isoScene(page([{ style: DROID, x: 100, y: 100, value: 'Bot' }]));
    const droid = element(scene.root, 'a0');
    expect(droid.userData.standing).toBe(true);
    const silhouette = droid.getObjectByName('silhouette')!;
    expect(silhouette.userData.head).toEqual({ x: -5, y: 45, width: 10, height: 13.5 });
    expect(silhouette.userData.parts).toHaveLength(2);
    const head = new Box3().setFromObject(silhouette.getObjectByName('head')!);
    expect([+head.min.y.toFixed(3), +head.max.y.toFixed(3)]).toEqual([45, 58.5]);
    expect(silhouette.getObjectByName('sign')).toBeDefined();
    expect(silhouette.userData.strokes[1].map((p: { x: number }) => p.x)).toEqual([21, -21]);
    // Étape 174 : antenne partant de la droite du visage vue de la caméra, comme en 2D. Le x de la silhouette va vers
    // la gauche vu de la caméra (espace page indirect) : le dessin est retourné, l'antenne est à x < 0.
    const antenna = silhouette.userData.strokes.at(-1);
    expect(antenna.map((p: { x: number }) => +p.x.toFixed(3))).toEqual([-4.8, -6.8, -6.8]);
  });
});
