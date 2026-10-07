import { Color, Group, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { PageEffectRegistry } from '../../../../src/engine/core/effects/registry';
import { freezeModel, freezePlain } from '../../../../src/engine/core/model/freeze';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import { modeHost } from '../../modeHost';
import { PageModeRegistry } from '../../../../src/engine/core/modes/registry';
import type { PageModeDefinition } from '../../../../src/engine/core/modes/types';
import type { ShapeDefinition } from '../../../../src/engine/core/plugins';
import { ShapeRegistry } from '../../../../src/engine/core/shapes/registry';

describe('gel des objets simples (sujet 303)', () => {
  it('objets littéraux et tableaux gelés en profondeur ; fonctions et objets d’une classe laissés tels quels', () => {
    const color = new Color('#ff0000');
    const value = freezePlain({ list: [{ a: 1 }], nested: { b: 2 }, color, run: () => 1 });
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.list[0])).toBe(true);
    expect(Object.isFrozen(value.nested)).toBe(true);
    expect(Object.isFrozen(value.color)).toBe(false);
    expect(() => {
      (value.nested as { b: number }).b = 3;
    }).toThrow(TypeError);
    color.set('#00ff00');
    expect(color.getHexString()).toBe('00ff00');
  });

  it('définitions des plugins gelées à l’enregistrement : un plugin ne modifie pas celle d’un autre', () => {
    const mode: PageModeDefinition = { id: 'm', namespace: 'm', name: 'M', page: { viewModes: ['top'] } };
    new PageModeRegistry().register(mode);
    expect(() => mode.page!.viewModes!.push('iso')).toThrow(TypeError);
    const shape: ShapeDefinition = { id: 's', flat: { create: () => new Color() as never }, kinds: ['s'] };
    new ShapeRegistry().register(shape);
    expect(() => {
      (shape as { id: string }).id = 'autre';
    }).toThrow(TypeError);
    const effect = { id: 'e', name: 'E', viewModes: ['iso' as const] };
    new PageEffectRegistry().register(effect);
    expect(() => effect.viewModes.push('iso')).toThrow(TypeError);
  });
});

describe('plugin qui modifie le modèle reçu (sujet 312)', () => {
  const XML = `<mxfile><diagram id="p" name="P" spatial.mode="tricheur"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>
<mxCell id="a" value="A" style="spatial.kind=tricheuse;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="100" height="60" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`;

  it('mode et forme de test : exception signalée, repli, document inchangé', () => {
    const page = freezeModel(readDrawio(XML).document.pages[0]!);
    const before = JSON.stringify(page);
    // Mode qui écrit dans la page reçue pour son habillage.
    const mode: PageModeDefinition = {
      id: 'tricheur',
      namespace: 'tricheur',
      name: 'Tricheur',
      dressing: (received) => {
        (received.attributes as Record<string, string>)['spatial.mode'] = 'autre';
        return {};
      },
    };
    const { host } = modeHost(new PageModeRegistry().register(mode));
    expect(host.dressing(page)).toBeUndefined();
    // Forme qui écrit dans le style de la forme reçue en se dessinant.
    const errors: string[] = [];
    const shapes = new ShapeRegistry()
      .register({
        id: 'tricheuse',
        flat: {
          create: (shape) => {
            (shape.style as Record<string, string>).fillColor = '#ff0000';
            return new Group();
          },
        },
      })
      .reportingTo((id, hook) => errors.push(`${id} ${hook}`));
    const object = shapes.sceneRenderer(page.shapes[0]!, 'flat').create(page.shapes[0]!, {
      text: { create: () => new Object3D() },
    });
    expect(object.getObjectByName('stroke')).toBeDefined();
    expect(errors).toEqual(['tricheuse flat.create']);
    expect(JSON.stringify(page)).toBe(before);
  });
});
