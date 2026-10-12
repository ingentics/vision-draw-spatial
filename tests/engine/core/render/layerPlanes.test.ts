import type { Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { Group, Object3D } from 'three';
import { layerPlanes, LAYER_PLANES, spreadLayers } from '../../../../src/engine/core/render/layerPlanes';

// Sujet 525 : un plan par niveau des calques élevés, à l'emprise de la page.

const layer = (id: string, attrs: string) => `<mxCell id="${id}" parent="0" ${attrs}/>`;
const page = (layers: string, content = true) =>
  readDrawio(`<mxfile><diagram id="p" name="P"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
    ${layers}
    ${content ? '<mxCell id="a" vertex="1" parent="1"><mxGeometry x="10" y="20" width="100" height="50" as="geometry"/></mxCell>' : ''}
  </root></mxGraphModel></diagram></mxfile>`).document.pages[0]!;

const levels = (group: ReturnType<typeof layerPlanes>) => group?.children.map((plane) => plane.position.z);

describe('plans des calques (sujet 525)', () => {
  it('un plan par niveau non nul des calques visibles, pas au sol', () => {
    const p = page(
      layer('A', 'style="spatial.elevation=40;"') +
        layer('B', 'style="spatial.elevation=40;"') +
        layer('C', 'style="spatial.elevation=80;"') +
        layer('D', 'style="spatial.elevation=120;" visible="0"'),
    );
    const group = layerPlanes(p, '1', '#ff0000', false);
    expect(group?.name).toBe(LAYER_PLANES);
    expect(levels(group)).toEqual([40, 80]);
  });

  it('niveau 0 seulement si demandé', () => {
    const p = page(layer('A', 'style="spatial.elevation=40;"'));
    expect(levels(layerPlanes(p, '1', '#ff0000', true))).toEqual([0, 40]);
  });

  it('rien sans niveau élevé ni sur une page vide', () => {
    expect(layerPlanes(page(layer('A', '')), '1', '#ff0000', false)).toBeUndefined();
    expect(
      layerPlanes(page(layer('A', 'style="spatial.elevation=40;"'), false), 'A', '#ff0000', false),
    ).toBeUndefined();
  });

  it('emprise de la page élargie de 20 px ; le niveau du calque courant à l’accent, plus opaque', () => {
    const p = page(layer('A', 'style="spatial.elevation=40;"') + layer('B', 'style="spatial.elevation=80;"'));
    const group = layerPlanes(p, 'B', '#ff0000', false)!;
    const fill = (index: number) => group.children[index]!.children[0] as Mesh;
    fill(0).geometry.computeBoundingBox();
    const box = fill(0).geometry.boundingBox!;
    expect([box.min.x, box.min.y, box.max.x, box.max.y]).toEqual([-10, 0, 130, 90]);
    const material = (index: number) => fill(index).material as MeshBasicMaterial;
    expect(material(1).color.getHexString()).toBe('ff0000');
    expect(material(1).opacity).toBeGreaterThan(material(0).opacity);
    expect(material(0).color.getHexString()).toBe('808080');
  });

  it('aplatis (sujet 526) : plans au sol et cachés', () => {
    const p = page(layer('A', 'style="spatial.elevation=40;"'));
    const group = layerPlanes(p, 'A', '#ff0000', false, 0)!;
    expect(levels(group)).toEqual([0]);
    expect(group.visible).toBe(false);
  });

  it('étalement en cours : chaque élément descend de sa part d’élévation de calque, les plans suivent', () => {
    const root = new Group();
    root.userData.layerSpread = 1;
    const lifted = new Object3D();
    lifted.position.z = 45;
    lifted.userData.layerLift = 40;
    const grounded = new Object3D();
    grounded.position.z = 5;
    const planes = layerPlanes(page(layer('A', 'style="spatial.elevation=40;"')), 'A', '#ff0000', false)!;
    root.add(lifted, grounded, planes);
    spreadLayers(root, 0.25);
    expect(lifted.position.z).toBe(15);
    expect(grounded.position.z).toBe(5);
    expect(levels(planes)).toEqual([10]);
    spreadLayers(root, 0);
    expect(lifted.position.z).toBe(5);
    expect(planes.visible).toBe(false);
    spreadLayers(root, 1);
    expect(lifted.position.z).toBe(45);
    expect(planes.visible).toBe(true);
  });
});
