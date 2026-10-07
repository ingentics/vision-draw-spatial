import { describe, expect, it } from 'vitest';
import { readDrawio } from '../../../../src/engine/core/format/parse';
import {
  formatViewState,
  parseViewState,
  readPageViews,
  VIEW_ATTRIBUTE,
  writePageViews,
} from '../../../../src/engine/core/format/viewState';
import type { PageViewState } from '../../../../src/engine/core/format/viewState';
import { writeDrawio } from '../../../../src/engine/core/format/write';
import { childElements, parseXml } from '../../../../src/engine/core/format/xmlTree';
import { fixture } from '../../../helpers';

const ISO_VIEW: PageViewState = {
  camera: {
    mode: 'iso',
    center: { x: 120.5, y: -80 },
    zoom: 1.25,
    rotation: -Math.PI / 4,
    tilt: (54.74 * Math.PI) / 180,
  },
  iso: { isoAngleDeg: 35.26, isoAzimuthDeg: -45, isoVolume: true, isoDepth: 24 },
};

describe('formatViewState / parseViewState', () => {
  it('format « clé=valeur; », angles en degrés', () => {
    expect(formatViewState(ISO_VIEW)).toBe(
      'mode=iso;x=120.5;y=-80;zoom=1.25;rotation=-45;tilt=54.74;elevation=35.26;azimuth=-45;volume=1;depth=24;v=2;',
    );
  });

  it('migration : l’ancienne épaisseur par défaut (16, sans version) devient 32 ; une valeur choisie reste', () => {
    const old = 'mode=iso;x=0;y=0;zoom=1;rotation=-45;tilt=54.74;elevation=35.26;azimuth=-45;volume=1;';
    expect(parseViewState(`${old}depth=16;`)!.iso!.isoDepth).toBe(32);
    expect(parseViewState(`${old}depth=24;`)!.iso!.isoDepth).toBe(24);
    expect(parseViewState(`${old}depth=16;v=2;`)!.iso!.isoDepth).toBe(16);
  });

  it('aller-retour (à l’arrondi près)', () => {
    const parsed = parseViewState(formatViewState(ISO_VIEW))!;
    expect(parsed.camera.mode).toBe('iso');
    expect(parsed.camera.center).toEqual({ x: 120.5, y: -80 });
    expect(parsed.camera.zoom).toBe(1.25);
    expect(parsed.camera.rotation).toBeCloseTo(-Math.PI / 4, 4);
    expect(parsed.camera.tilt).toBeCloseTo(ISO_VIEW.camera.tilt, 4);
    expect(parsed.iso).toEqual(ISO_VIEW.iso);
  });

  it('vue de dessus sans réglages iso', () => {
    const top: PageViewState = { camera: { mode: 'top', center: { x: 0, y: 0 }, zoom: 1, rotation: 0, tilt: 0 } };
    expect(parseViewState(formatViewState(top))).toEqual(top);
  });

  it('ignore un attribut absent ou inexploitable', () => {
    expect(parseViewState(undefined)).toBeUndefined();
    expect(parseViewState('mode=iso;x=1')).toBeUndefined();
    expect(parseViewState('x=1;y=2;zoom=0')).toBeUndefined();
    expect(parseViewState('x=1;y=2;zoom=1;elevation=30')?.iso).toBeUndefined();
  });
});

describe('writePageViews / readPageViews', () => {
  it('attribut de <diagram>, relu après écriture, contenu compressé intact', () => {
    const xml = fixture('compressed.drawio');
    const { tree } = readDrawio(xml);
    const pageId = tree.pages[0]!.id;
    writePageViews(tree, new Map([[pageId, ISO_VIEW]]));
    const written = writeDrawio(tree);

    const diagram = (source: string) => childElements(parseXml(source).documentElement!, 'diagram')[0]!;
    expect(diagram(written).getAttribute(VIEW_ATTRIBUTE)).toBe(formatViewState(ISO_VIEW));
    expect(diagram(written).textContent).toBe(diagram(xml).textContent);
    expect(readPageViews(readDrawio(written).tree).get(pageId)?.iso).toEqual(ISO_VIEW.iso);
  });

  it('ancien format sans <diagram> : rien n’est écrit', () => {
    const { tree } = readDrawio(fixture('legacy.xml'));
    writePageViews(tree, new Map([[tree.pages[0]!.id, ISO_VIEW]]));
    expect(writeDrawio(tree)).not.toContain(VIEW_ATTRIBUTE);
  });
});
