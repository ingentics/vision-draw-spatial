import { describe, expect, it } from 'vitest';
import { definition as rdd } from '../../../../../src/engine/plugins/modes/rdd';
import { rowWidth, widthOf, KEY_ROW, labels, fieldsOf, tableFields, setup } from './helpers';
import { createDefaultModeRegistry, createDefaultRegistry } from '../../../../../src/engine/plugins';
import { readDrawio } from '../../../../../src/engine/core/format/parse';
import type { PageModel } from '../../../../../src/engine/core/model/types';
import { fixture } from '../../../../helpers';
import { isSecondary } from '../../../../../src/engine/plugins/modes/rdd/tables/tableLayout';
import { cardinalitiesShown } from '../../../../../src/engine/plugins/modes/rdd/relations';
import { modeHost } from '../../../modeHost';

describe('mode RDD (sujet 179) : page et palette', () => {
  const modes = createDefaultModeRegistry();
  const { page } = setup();

  it('sélection imposée en contour (sujet 254)', () => {
    expect(rdd.page!.selectionStyle).toBe('outline');
    expect(
      createDefaultModeRegistry()
        .list()
        .filter((mode) => mode.page!.selectionStyle)
        .map((mode) => mode.id),
    ).toEqual(['rdd']);
  });

  it('2D seulement, palette réduite au modèle abstrait dans la catégorie RDD', () => {
    expect(modes.modeOf(page())?.id).toBe('rdd');
    expect(modes.allowsViewMode(page(), 'top')).toBe(true);
    expect(modes.allowsViewMode(page(), 'iso')).toBe(false);
    expect(modes.allowsViewMode(page(), '3d')).toBe(false);
    const palette = modes.paletteFor(page(), createDefaultRegistry().templates());
    expect(palette.categories.map((c) => c.id)).toEqual(['rdd']);
    expect(palette.templates.map((t) => [t.id, t.name])).toEqual([
      ['rdd-entity', 'Entité'],
      ['rdd-enum', 'Entité énumérative'],
      ['rdd-embedded', 'Embedded'],
      ['rdd-document', 'Document'],
      ['rdd-view', 'Vue'],
      ['rdd-region', 'Région'],
    ]);
  });

  it('entité et énumération de la palette : swimlanes désignés par spatial.kind, nés avec la clé primaire', () => {
    const templates = createDefaultRegistry().templates();
    const entity = templates.find((t) => t.id === 'rdd-entity')!;
    expect(entity.style).toContain('swimlane;');
    expect(entity.style).toContain('spatial.kind=rdd-entity;');
    expect(entity.style).toContain(
      'spatial.rdd.fields=[{"kind":"pk","label":"id","type":"primary-key","nullable":false}];',
    );
    expect(entity.style).toContain('startSize=26;');
    expect([entity.width, entity.height]).toEqual([widthOf(KEY_ROW), 46]);
    const enumeration = templates.find((t) => t.id === 'rdd-enum')!;
    // Sans mention (sujet 216) : même entête que l'entité.
    expect(enumeration.style).toContain('startSize=26;');
    expect(enumeration.height).toBe(46);
    // Le modèle abstrait : base technique, jamais dans la palette (sujet 180).
    expect(templates.find((t) => t.id === 'rdd-model')).toBeUndefined();
  });

  it('les tables du fichier sont reconnues ; champs lus de spatial.fields', () => {
    const shapes = createDefaultRegistry();
    expect(page().shapes.map((shape) => shapes.resolve(shape).definition.id)).toEqual([
      'rdd-region',
      'rdd-model',
      'rdd-model',
      'rdd-model',
      'rdd-entity',
      'rdd-enum',
      'rdd-entity',
      'rdd-embedded',
      'rdd-document',
      'rdd-document',
      'rdd-view',
    ]);
    expect(
      page()
        .shapes.slice(1, 4)
        .map((shape) => labels(fieldsOf(shape))),
    ).toEqual([[], ['created_at', 'updated_at'], ['author']]);
  });

  it('clé primaire : toujours en tête à l’affichage ; absente du fichier, signalée dans Diagnostics', () => {
    const shape = (id: string) => page().shapes.find((s) => s.id === id)!;
    expect(labels(tableFields(shape('user')))).toEqual(['id', 'email', 'role']);
    expect(labels(tableFields(shape('role')))).toEqual(['id', 'admin', 'member']);
    expect(labels(tableFields(shape('orphan')))).toEqual(['id', 'name']);
    expect(tableFields(shape('orphan'))[0]!.kind).toBe('pk');
    expect(modeHost(modes).warnings({ pages: [page()] })).toEqual([
      {
        pageId: 'rdd',
        cellId: 'orphan',
        message: 'Table « Orphan » : clé primaire id absente ou déplacée, remise en tête',
      },
      { pageId: 'rdd', cellId: 'unnamed', message: 'Document sans nom : le nom est obligatoire' },
    ]);
  });

  it('réglages du mode masqués hors des tables ; clé primaire en lecture seule, sur les entités seulement', () => {
    // Réglages de la table (ceux d'un champ sélectionné : sujet 249).
    const properties = rdd.gestures!.properties!.filter((p) => !p.part);
    const model = page().shapes.find((s) => s.id === 'model')!;
    const entity = page().shapes.find((s) => s.id === 'user')!;
    // Plus de « Couleur » (le style de la forme, sujet 260 : celle-ci est celle de la région) ni d'« Icône ».
    expect(properties.map((p) => [p.label, p.hidden!(page(), model)])).toEqual([
      ['Couleur', true],
      ['Table secondaire', false],
      ['Clé primaire', true],
      ['Ajouter un séparateur', false],
    ]);
    expect(properties.map((p) => p.hidden!(page(), entity))).toEqual([true, false, false, false]);
    const key = properties.find((p) => p.label === 'Clé primaire')!;
    expect([key.readOnly, key.value!(page(), entity)]).toEqual([true, 'id']);
    expect(properties.every((p) => p.hidden!(page(), page()))).toBe(true);
  });
});

describe('mode RDD : fichier aux anciennes clés (sujet 301)', () => {
  it('mêmes champs, mêmes tables secondaires, mêmes cardinalités que le même fichier aux nouvelles clés', () => {
    const page = (file: string) => readDrawio(fixture(file)).document.pages[0]!;
    const [legacy, current] = [page('rdd-anciennes-cles.drawio'), page('rdd.drawio')];
    const read = (p: PageModel) => [
      cardinalitiesShown(p),
      ...p.shapes.map((shape) => [shape.id, tableFields(shape), isSecondary(shape)]),
    ];
    expect(read(legacy)).toEqual(read(current));
    expect(current.shapes.some(isSecondary)).toBe(true);
  });
});

describe('mode RDD : opérations sur une table', () => {
  it('plus de réglage de couleur d’entête : elle vient du style de la forme (sujet 260)', () => {
    expect(rdd.gestures!.properties!.find((p) => p.key === 'fillColor')).toBeUndefined();
  });
});

describe('mode RDD : tables ajustées à l’ouverture (sujet 255)', () => {
  it('chaque table prend la taille de son contenu ; une seconde passe ne change rien ; la région reste', () => {
    const { run, shape } = setup();
    const region = shape('accounts').bounds;
    expect(shape('user').bounds.width).toBe(160);
    expect(run((edit) => rdd.lifecycle!.opened!(edit))).toBe(true);
    expect(shape('user').bounds).toEqual({
      x: 40,
      y: 160,
      width: widthOf(KEY_ROW, rowWidth('role', 'Nombre entier')),
      height: 26 + 3 * 20,
    });
    expect(shape('timestamped').bounds.width).toBe(widthOf(rowWidth('created_at', 'Phrase')));
    expect(shape('accounts').bounds).toEqual(region);
    expect(run((edit) => rdd.lifecycle!.opened!(edit))).toBe(false);
  });
});
