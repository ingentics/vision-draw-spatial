import { Box3, Mesh, Object3D } from 'three';
import type { Color, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { documentFromTree, readDrawio } from '../../../src/engine/format/parse';
import { applyModeEdit } from '../../../src/engine/modes/modeEdits';
import { createDefaultModeRegistry } from '../../../src/engine/modes/registry';
import { definition as rdd } from '../../../src/engine/modes/rdd';
import {
  FIELDS,
  ICON,
  SECONDARY,
  fieldProblems,
  fieldsOf,
  fieldsValue,
  tableFields,
} from '../../../src/engine/modes/rdd/tables';
import type { Field } from '../../../src/engine/modes/rdd/tables';
import {
  addField,
  fitTable,
  newFieldLabel,
  setField,
  setHeaderColor,
  setSecondary,
} from '../../../src/engine/modes/rdd/operations';
import { fieldParts } from '../../../src/engine/modes/rdd/fieldParts';
import { REGION, REGION_COLORS, regionContent, regionOf, regionTextColor } from '../../../src/engine/modes/rdd/regions';
import { regionOutline, tabPath, tabRect } from '../../../src/engine/modes/rdd/shapes/region';
import { pickElement } from '../../../src/engine/interaction/pick';
import { addShapeCell } from '../../../src/engine/format/create';
import { setCellLabel } from '../../../src/engine/format/cellEdits';
import { approximateMeasure } from '../../../src/engine/render/richLayout';
import type { ModeEdit } from '../../../src/engine/modes/types';
import type { PageModel, Point, ShapeModel } from '../../../src/engine/model/types';
import { buildPageScene } from '../../../src/engine/render/pageScene';
import type { RenderContext, TextSpec } from '../../../src/engine/render/types';
import { createDefaultRegistry } from '../../../src/engine/shapes/registry';
import { spatialValue } from '../../../src/engine/spatial';
import { fixture } from '../../helpers';

/** Largeur d'une ligne de champ à l'échelle 1 (sujet 248) : marge, icône, air, label, puis air et type, marge. */
const rowWidth = (label: string, type?: string) =>
  6 +
  12 +
  4 +
  approximateMeasure(label, { size: 11, bold: false, italic: false }) +
  (type ? 6 + approximateMeasure(type, { size: 11, bold: false, italic: false }) : 0) +
  6;
/** Largeur d'une table d'après ses lignes : la plus grande, au moins 120. */
const widthOf = (...rows: number[]) => Math.ceil(Math.max(120, ...rows));
/** Ligne de la clé primaire `id` (Nombre entier) : 125 px. */
const KEY_ROW = rowWidth('id', 'Nombre entier');

/**
 * Pose les champs d'une table par leurs labels (un par ligne ; la clé primaire d'une entité reste en tête) : un label
 * déjà présent garde son champ, un nouveau est une propriété « Phrase » ; la taille suit.
 */
function setFields(edit: ModeEdit, shape: ShapeModel, text: string): void {
  const current = tableFields(shape);
  const key = current[0]?.kind === 'pk' ? current[0] : undefined;
  const fields: Field[] = text
    .split('\n')
    .map((label) => label.trim())
    .filter((label) => label && label !== key?.label)
    .map(
      (label) => current.find((f) => f.label === label) ?? { kind: 'property', label, type: 'string', nullable: false },
    );
  const written = key ? [key, ...fields] : fields;
  edit.setElementAttribute(shape.id, FIELDS, fieldsValue(written));
  fitTable(edit, shape, { fields: written });
}

/** Labels des champs, dans l'ordre. */
const labels = (fields: Field[]) => fields.map((field) => field.label);

/** Page de la fixture, et une fonction qui applique une opération puis relit la page. */
function setup() {
  const { document, tree } = readDrawio(fixture('rdd.drawio'));
  let page = document.pages[0]!;
  const run = (operation: (edit: ModeEdit) => void): boolean => {
    // Relue avant : l'arbre a pu être écrit directement (ex. texte de la forme).
    page = documentFromTree(tree).pages[0]!;
    const changed = applyModeEdit(page, tree.pages[0]!, operation);
    page = documentFromTree(tree).pages[0]!;
    return changed;
  };
  const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
  return { run, page: () => page, shape, tree };
}

describe('mode RDD (sujet 179) : page et palette', () => {
  const modes = createDefaultModeRegistry();
  const { page } = setup();

  it('sélection imposée en contour (sujet 254)', () => {
    expect(rdd.selectionStyle).toBe('outline');
    expect(
      createDefaultModeRegistry()
        .list()
        .filter((mode) => mode.selectionStyle)
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
    expect(entity.style).toContain('spatial.fields=[{"kind":"pk","label":"id","type":"integer","nullable":false}];');
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
    expect(modes.warnings({ pages: [page()] } as never)).toEqual([
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
    const properties = rdd.shapeProperties!.filter((p) => !p.part);
    const model = page().shapes.find((s) => s.id === 'model')!;
    const entity = page().shapes.find((s) => s.id === 'user')!;
    expect(properties.map((p) => [p.label, p.hidden!(page(), model)])).toEqual([
      ['Couleur', false],
      ['Couleur', true],
      ['Table secondaire', false],
      ['Icône', true],
      ['Clé primaire', true],
    ]);
    // Entité : sans icône d'entête ; « Icône » n'est proposée qu'aux tables qui en ont une.
    expect(properties.map((p) => p.hidden!(page(), entity))).toEqual([false, true, false, true, false]);
    const key = properties.find((p) => p.label === 'Clé primaire')!;
    expect([key.readOnly, key.value!(page(), entity)]).toEqual([true, 'id']);
    expect(properties.every((p) => p.hidden!(page(), page()))).toBe(true);
  });
});

describe('mode RDD : opérations sur une table', () => {
  it('champs : un par ligne, la table prend la hauteur de ses champs (au moins une ligne)', () => {
    const { run, shape } = setup();
    expect(run((edit) => setFields(edit, shape('model'), 'id\n\n  name  \ncreated_at'))).toBe(true);
    expect(labels(fieldsOf(shape('model')))).toEqual(['id', 'name', 'created_at']);
    expect(shape('model').bounds).toEqual({
      x: 40,
      y: 40,
      width: widthOf(rowWidth('created_at', 'Phrase')),
      height: 26 + 3 * 20,
    });
    run((edit) => setFields(edit, shape('model'), ''));
    expect(spatialValue(shape('model'), FIELDS)).toBeUndefined();
    expect(shape('model').bounds.height).toBe(46);
  });

  it('table secondaire : taille du contenu × 0,8 depuis le coin haut-gauche, puis ÷ 0,8 ; entête et texte suivent', () => {
    const { run, shape } = setup();
    const width = widthOf(rowWidth('created_at', 'Phrase'), rowWidth('updated_at', 'Phrase'));
    run((edit) => setSecondary(edit, shape('timestamped'), true));
    const small = shape('timestamped');
    expect(spatialValue(small, SECONDARY)).toBe('1');
    expect(small.bounds).toEqual({ x: 240, y: 40, width: Math.round(width * 80) / 100, height: 52.8 });
    expect([small.style.startSize, small.style.fontSize]).toEqual(['20.8', '9.6']);
    // Un champ de plus : lignes à l'échelle de la table secondaire.
    run((edit) => setFields(edit, shape('timestamped'), 'created_at\nupdated_at\ndeleted_at'));
    expect(shape('timestamped').bounds.height).toBe(68.8);
    run((edit) => setSecondary(edit, shape('timestamped'), false));
    const back = shape('timestamped');
    expect(spatialValue(back, SECONDARY)).toBeUndefined();
    expect(back.bounds).toEqual({ x: 240, y: 40, width, height: 86 });
    expect([back.style.startSize, back.style.fontSize]).toEqual(['26', '12']);
    expect(run((edit) => setSecondary(edit, shape('timestamped'), false))).toBe(false);
  });

  it("couleur d'entête : fillColor, et fontColor lisible pour draw.io", () => {
    const { run, shape } = setup();
    run((edit) => setHeaderColor(edit, shape('model'), '#e1d5e7'));
    expect([shape('model').style.fillColor, shape('model').style.fontColor]).toEqual(['#e1d5e7', '#000000']);
    run((edit) => setHeaderColor(edit, shape('model'), '#1f3a5f'));
    expect(shape('model').style.fontColor).toBe('#ffffff');
  });

  it('couleurs proposées : celle par défaut puis la palette de l’appli, sans doublon', () => {
    const { page } = setup();
    const color = rdd.shapeProperties!.find((p) => p.key === 'fillColor')!;
    expect(color.type === 'select' && color.options(page(), ['#f5f5f5', '#d5e8d4']).map((o) => o.value)).toEqual([
      '#f5f5f5',
      '#d5e8d4',
    ]);
  });

  it('table neuve au style « Gris » (sujet 235) : entête #f5f5f5, bordure #666666, texte #333333', () => {
    const templates = createDefaultRegistry()
      .templates()
      .filter((t) => t.category === 'rdd' && t.id !== 'rdd-region');
    expect(templates.length).toBe(5);
    for (const template of templates) {
      expect(template.style).toContain('fillColor=#f5f5f5;fontColor=#333333;');
      expect(template.style).toContain('strokeColor=#666666;');
    }
  });
});

describe('mode RDD : champs structurés (sujet 246)', () => {
  /** Table du mode avec la valeur brute de `spatial.fields`. */
  const table = (fields: string, kind = 'rdd-entity') =>
    ({ id: 't', kind, label: 'T', style: { 'spatial.kind': kind, [FIELDS]: fields } }) as unknown as ShapeModel;

  it('champs lus avec kind, label, type et nullable', () => {
    const { shape } = setup();
    expect(fieldsOf(shape('user'))).toEqual([
      { kind: 'pk', label: 'id', type: 'integer', nullable: false },
      { kind: 'property', label: 'email', type: 'string', nullable: false },
      { kind: 'fk', label: 'role', type: 'integer', nullable: false },
    ]);
    expect(fieldsOf(shape('secondary'))).toEqual([{ kind: 'fk', label: 'author', type: 'integer', nullable: true }]);
    expect(fieldProblems(shape('user'))).toEqual([]);
  });

  it('pas de lecture de l’ancien format ; entrées illisibles ignorées et signalées', () => {
    expect(fieldsOf(table('["id","name"]'))).toEqual([]);
    expect(fieldProblems(table('["id","name"]'))).toEqual(['2 champ(s) illisible(s), ignoré(s)']);
    expect(fieldProblems(table('pas du json'))).toEqual(['champs illisibles, ignorés']);
    const mixed = table('[{"kind":"pk","label":"id","type":"integer"},{"kind":"other","label":"x"},{"kind":"fk"}]');
    expect(labels(fieldsOf(mixed))).toEqual(['id']);
    expect(fieldProblems(mixed)).toEqual(['2 champ(s) illisible(s), ignoré(s)']);
  });

  it('type inconnu signalé ; clé primaire jamais nullable', () => {
    const shape = table(
      '[{"kind":"pk","label":"id","type":"integer","nullable":true},{"kind":"property","label":"at","type":"date","nullable":true}]',
    );
    expect(fieldsOf(shape).map((field) => field.nullable)).toEqual([false, true]);
    expect(fieldProblems(shape)).toEqual([
      'champ at : type « date » inconnu',
      'clé primaire nullable, lue non nullable',
    ]);
  });
});

describe('mode RDD : taille calculée (sujet 247)', () => {
  /** Largeur approchée d'un texte (celle des tests, sans polices). */
  const measure = (text: string, size: number, bold = false) => approximateMeasure(text, { size, bold, italic: false });

  it('pas de poignées de redimensionnement sur les tables ; la région garde les siennes', () => {
    const { shape } = setup();
    const registry = createDefaultRegistry();
    expect(
      ['model', 'user', 'role', 'address', 'settings', 'active'].map((id) => registry.isResizable(shape(id))),
    ).toEqual([false, false, false, false, false, false]);
    expect(registry.isResizable(shape('accounts'))).toBe(true);
  });

  it('largeur : au moins 120, sinon le plus long champ, marges comprises ; la table rétrécit aussi', () => {
    const { run, shape } = setup();
    const long = 'a_very_long_field_name_for_a_table';
    run((edit) => setFields(edit, shape('user'), `email\n${long}`));
    expect(shape('user').bounds.width).toBe(Math.ceil(rowWidth(long, 'Phrase')));
    expect(shape('user').bounds.width).toBeGreaterThan(KEY_ROW);
    run((edit) => setFields(edit, shape('user'), 'email'));
    expect(shape('user').bounds).toEqual({ x: 40, y: 160, width: widthOf(KEY_ROW), height: 26 + 2 * 20 });
    // Le minimum, sans champ plus large.
    run((edit) => setFields(edit, shape('model'), ''));
    expect(shape('model').bounds.width).toBe(120);
    // Table secondaire : le minimum et le reste × 0,8.
    run((edit) => setSecondary(edit, shape('model'), true));
    expect(shape('model').bounds.width).toBe(96);
    run((edit) => setFields(edit, shape('user'), long));
    run((edit) => setSecondary(edit, shape('user'), true));
    expect(shape('user').bounds.width).toBeCloseTo(Math.ceil(rowWidth(long, 'Phrase')) * 0.8, 5);
  });

  it('largeur : le nom, gras, avec la place de l’icône d’entête de chaque côté ; sans icône, le nom seul', () => {
    const { run, shape, tree } = setup();
    const name = 'ActiveUsersOfTheWholePlatform';
    // Le renommage écrit le texte de la forme, puis le moteur appelle `relabeled` du mode.
    setCellLabel(tree.pages[0]!, 'role', name);
    run((edit) => rdd.relabeled!(edit, 'role'));
    expect(shape('role').bounds.width).toBe(Math.ceil(measure(name, 12, true) + 2 * (6 + 7 + 14 * 1.5 + 4)));
    const icon = rdd.shapeProperties!.find((p) => p.label === 'Icône')!;
    run((edit) => icon.write!(edit, shape('role'), undefined));
    expect(shape('role').bounds.width).toBe(Math.ceil(measure(name, 12, true) + 2 * 6));
    // Un nom court : la largeur des champs.
    setCellLabel(tree.pages[0]!, 'role', 'Role');
    run((edit) => rdd.relabeled!(edit, 'role'));
    expect(shape('role').bounds.width).toBe(widthOf(KEY_ROW));
  });
});

describe('mode RDD : champ sélectionné dans sa table (sujet 249)', () => {
  // User : (40, 160), 160 de large ; entête de 26, lignes de 20 (id, email, role).
  it('partie sous un point : le rang du champ ; l’entête, hors de la table ou sous les lignes : la table', () => {
    const { page, shape } = setup();
    const at = (x: number, y: number) => fieldParts.at(page(), shape('user'), { x, y });
    expect([at(60, 160 + 26 + 5), at(60, 160 + 26 + 25), at(190, 160 + 26 + 59)]).toEqual(['0', '1', '2']);
    expect([at(60, 170), at(30, 200), at(60, 160 + 26 + 61)]).toEqual([undefined, undefined, undefined]);
    expect(fieldParts.at(page(), shape('accounts'), { x: 60, y: 200 })).toBeUndefined();
  });

  it('emprise : la ligne entière ; texte : le label, du label au bord droit, à l’échelle de la table', () => {
    const { run, page, shape } = setup();
    expect(fieldParts.bounds(page(), shape('user'), '1')).toEqual({ x: 40, y: 206, width: 160, height: 20 });
    expect(fieldParts.bounds(page(), shape('user'), '3')).toBeUndefined();
    expect(fieldParts.bounds(page(), shape('user'), 'x')).toBeUndefined();
    expect(fieldParts.text!(page(), shape('user'), '1')).toEqual({
      text: 'email',
      zone: { x: 62, y: 206, width: 132, height: 20 },
      fontSize: 11,
      italic: undefined,
    });
    run((edit) => setSecondary(edit, shape('settings'), true));
    const settings = shape('settings');
    const text = fieldParts.text!(page(), settings, '0')!;
    expect([text.text, text.fontSize, text.italic]).toEqual(['theme', 11 * 0.8, true]);
    expect(text.zone.height).toBeCloseTo(16, 5);
  });

  it('label sur place : écrit et la table s’élargit ; vide : refusé', () => {
    const { run, page, shape } = setup();
    const long = 'a_role_identifier_that_is_long';
    run((edit) => fieldParts.setText!(edit, shape('user'), '2', `  ${long} `));
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'email', long]);
    expect(shape('user').bounds.width).toBe(Math.ceil(rowWidth(long, 'Nombre entier')));
    expect(run((edit) => fieldParts.setText!(edit, shape('user'), '2', '  '))).toBe(false);
    expect(fieldParts.text!(page(), shape('user'), '2')!.text).toBe(long);
  });

  it('kind et nullable ; la clé primaire garde les siens et aucun champ ne le devient', () => {
    const { run, shape } = setup();
    run((edit) => setField(edit, shape('user'), 1, { kind: 'external-fk', nullable: true }));
    expect(fieldsOf(shape('user'))[1]).toEqual({ kind: 'external-fk', label: 'email', type: 'string', nullable: true });
    expect(run((edit) => setField(edit, shape('user'), 0, { kind: 'fk', nullable: true }))).toBe(false);
    expect(run((edit) => setField(edit, shape('user'), 1, { kind: 'pk' }))).toBe(false);
    expect(fieldsOf(shape('user')).map((field) => field.kind)).toEqual(['pk', 'external-fk', 'fk']);
  });

  it('panneau : avec un champ, ses réglages seulement (kind et nullable masqués pour la clé primaire)', () => {
    const { page, shape } = setup();
    const modes = createDefaultModeRegistry();
    const shown = (part?: string) =>
      modes
        .properties(page(), 'shape', part)
        .filter((property) => !property.hidden?.(page(), shape('user'), part))
        .map((property) => [property.label, property.value?.(page(), shape('user'), part)]);
    expect(shown('1')).toEqual([
      ['Champ', 'email'],
      ['Type', 'string'],
      ['Rôle', 'property'],
      ['Nullable', undefined],
    ]);
    expect(shown('0')).toEqual([
      ['Champ', 'id'],
      ['Type', 'integer'],
    ]);
    expect(shown().map(([label]) => label)).toEqual(['Couleur', 'Table secondaire', 'Clé primaire']);
  });

  it('réglages du champ écrits par le panneau', () => {
    const { run, shape } = setup();
    const property = (key: string) => rdd.shapeProperties!.find((p) => p.key === key)!;
    run((edit) => property('rdd.field.kind').write!(edit, shape('user'), 'fk', '1'));
    run((edit) => property('rdd.field.nullable').write!(edit, shape('user'), '1', '1'));
    run((edit) => property('rdd.field.label').write!(edit, shape('user'), 'mail', '1'));
    expect(fieldsOf(shape('user'))[1]).toEqual({ kind: 'fk', label: 'mail', type: 'string', nullable: true });
  });
});

describe('mode RDD : ajouter un champ (sujet 250)', () => {
  const handle = (page: PageModel, shape: ShapeModel) => rdd.handles!(page, shape)[0]!;

  it('poignée « + » verte au milieu du bas ; plus de poignée de connexion haut et bas', () => {
    const { page, shape } = setup();
    const plus = handle(page(), shape('user'));
    expect([plus.at, plus.offset, plus.color, plus.title]).toEqual([
      { x: 120, y: 246 },
      { x: 0, y: 18 },
      '#2e9e44',
      'Ajouter un champ',
    ]);
    expect(rdd.handles!(page(), shape('accounts'))).toEqual([]);
    expect(createDefaultRegistry().connectSides(shape('user'))).toEqual(['e', 'w']);
    expect(createDefaultRegistry().connectSides(shape('accounts'))).toEqual(['n', 'e', 's', 'w']);
  });

  it('clic : Field1, Field2, Field3 sans type (256), en fin de liste ; la table grandit ; la partie ajoutée est rendue', () => {
    const { run, page, shape } = setup();
    const parts: Array<string | undefined> = [];
    for (let i = 0; i < 3; i += 1) run((edit) => parts.push(rdd.handleClicked!(edit, shape('user'), 'rdd.addField')));
    expect(parts).toEqual(['3', '4', '5']);
    expect(fieldsOf(shape('user')).slice(3)).toEqual([
      { kind: 'property', label: 'Field1', type: '', nullable: false },
      { kind: 'property', label: 'Field2', type: '', nullable: false },
      { kind: 'property', label: 'Field3', type: '', nullable: false },
    ]);
    expect(shape('user').bounds.height).toBe(26 + 6 * 20);
    expect(handle(page(), shape('user')).at.y).toBe(160 + 26 + 6 * 20);
    // Sans type : rien de signalé.
    expect(fieldProblems(shape('user'))).toEqual([]);
    // Poignée inconnue : rien.
    expect(run((edit) => rdd.handleClicked!(edit, shape('user'), 'other'))).toBe(false);
  });

  it('type choisi au panneau (256) : un des sept, ou « Aucun » ; la largeur suit', () => {
    const { run, page, shape } = setup();
    const type = rdd.shapeProperties!.find((p) => p.key === 'rdd.field.type')!;
    expect(type.type === 'select' && type.options(page(), []).map((o) => o.label)).toEqual([
      'Aucun',
      'Nombre entier',
      'Nombre réel',
      'Phrase',
      'Texte',
      'Booléen',
      'Dynamique',
      'Money',
    ]);
    run((edit) => rdd.handleClicked!(edit, shape('user'), 'rdd.addField'));
    run((edit) => type.write!(edit, shape('user'), 'money', '3'));
    expect(fieldsOf(shape('user'))[3]!.type).toBe('money');
    run((edit) => type.write!(edit, shape('user'), 'a_very_long_type_name_here_and_there', '3'));
    expect(shape('user').bounds.width).toBeGreaterThan(widthOf(KEY_ROW, rowWidth('role', 'Nombre entier')));
    run((edit) => type.write!(edit, shape('user'), undefined, '3'));
    expect(fieldsOf(shape('user'))[3]!.type).toBe('');
    expect(shape('user').bounds.width).toBe(widthOf(KEY_ROW, rowWidth('role', 'Nombre entier')));
  });

  it('après le champ sélectionné, jamais avant la clé primaire ; premier numéro libre', () => {
    const { run, shape } = setup();
    let part: string | undefined;
    run((edit) => (part = rdd.handleClicked!(edit, shape('user'), 'rdd.addField', '1')));
    expect([part, labels(fieldsOf(shape('user')))]).toEqual(['2', ['id', 'email', 'Field1', 'role']]);
    expect(run((edit) => addField(edit, shape('user'), 'string', -1))).toBe(true);
    expect(labels(fieldsOf(shape('user')))[1]).toBe('Field2');
    expect(newFieldLabel([{ kind: 'property', label: 'Field2', type: '', nullable: false }])).toBe('Field1');
  });
});

describe('mode RDD : supprimer un champ (sujet 251)', () => {
  it('Suppr retire le champ ; la table rétrécit en hauteur, et en largeur si c’était la plus longue ligne', () => {
    const { run, shape } = setup();
    const long = 'a_very_long_field_name_for_a_table';
    run((edit) => setFields(edit, shape('user'), `email\nrole\n${long}`));
    expect(shape('user').bounds.width).toBe(Math.ceil(rowWidth(long, 'Phrase')));
    run((edit) => fieldParts.remove!(edit, shape('user'), '3'));
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'email', 'role']);
    expect(shape('user').bounds).toEqual({
      x: 40,
      y: 160,
      width: widthOf(KEY_ROW, rowWidth('role', 'Nombre entier')),
      height: 26 + 3 * 20,
    });
    run((edit) => fieldParts.remove!(edit, shape('user'), '1'));
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'role']);
  });

  it('la clé primaire ne se supprime pas ; une partie inconnue non plus', () => {
    const { run, shape } = setup();
    expect(run((edit) => fieldParts.remove!(edit, shape('user'), '0'))).toBe(false);
    expect(run((edit) => fieldParts.remove!(edit, shape('user'), '9'))).toBe(false);
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'email', 'role']);
  });
});

describe('mode RDD : réordonner les champs au glisser (sujet 252)', () => {
  // User : (40, 160), 160 de large ; lignes id (186), email (206), role (226), fin 246 ; plus Field1 (246), fin 266.
  const setupWithField = () => {
    const context = setup();
    context.run((edit) => setFields(edit, context.shape('user'), 'email\nrole\nField1'));
    return context;
  };

  it('place visée : la ligne survolée, jamais devant la clé primaire ni à la place actuelle', () => {
    const { page, shape } = setupWithField();
    const drop = (part: string, y: number) => fieldParts.dropAt!(page(), shape('user'), part, { x: 100, y });
    // Field1 (rang 3) au-dessus de email (206-226) : à sa place.
    expect(drop('3', 210)).toBe('1');
    // Au-dessus de la clé primaire ou de l'entête : juste après elle.
    expect([drop('3', 190), drop('3', 170)]).toEqual(['1', '1']);
    // email (rang 1) sur Field1 (246-266) : après lui, en fin de liste.
    expect(drop('1', 250)).toBe('4');
    // Sur lui-même : aucune.
    expect(drop('2', 230)).toBeUndefined();
    // Hors de la table, ou la clé primaire : aucune.
    expect(fieldParts.dropAt!(page(), shape('user'), '3', { x: 10, y: 210 })).toBeUndefined();
    expect(drop('3', 300)).toBeUndefined();
    expect(drop('0', 240)).toBeUndefined();
  });

  it('aperçu : la table avec le champ à sa nouvelle place, et ce champ désigné ; rien d’écrit', () => {
    const { page, shape } = setupWithField();
    const preview = fieldParts.preview!(shape('user'), '3', '1')!;
    expect(preview.part).toBe('1');
    expect(labels(fieldsOf(preview.shape))).toEqual(['id', 'Field1', 'email', 'role']);
    expect(fieldParts.bounds(page(), preview.shape, preview.part)).toEqual({
      x: 40,
      y: 206,
      width: shape('user').bounds.width,
      height: 20,
    });
    expect(labels(fieldsOf(shape('user')))).toEqual(['id', 'email', 'role', 'Field1']);
    expect(fieldParts.preview!(shape('user'), '0', '2')).toBeUndefined();
  });

  it('lâcher : le champ change de rang et reste désigné à sa nouvelle place ; une étape d’écriture', () => {
    const { run, shape } = setupWithField();
    let part: string | undefined;
    expect(run((edit) => (part = fieldParts.move!(edit, shape('user'), '3', '1')))).toBe(true);
    expect([part, labels(fieldsOf(shape('user')))]).toEqual(['1', ['id', 'Field1', 'email', 'role']]);
    run((edit) => (part = fieldParts.move!(edit, shape('user'), '1', '4')));
    expect([part, labels(fieldsOf(shape('user')))]).toEqual(['3', ['id', 'email', 'role', 'Field1']]);
    // Jamais devant la clé primaire, et la clé primaire ne bouge pas.
    expect(run((edit) => fieldParts.move!(edit, shape('user'), '2', '0'))).toBe(false);
    expect(run((edit) => fieldParts.move!(edit, shape('user'), '0', '3'))).toBe(false);
  });
});

describe('mode RDD : tables ajustées à l’ouverture (sujet 255)', () => {
  it('chaque table prend la taille de son contenu ; une seconde passe ne change rien ; la région reste', () => {
    const { run, shape } = setup();
    const region = shape('accounts').bounds;
    expect(shape('user').bounds.width).toBe(160);
    expect(run((edit) => rdd.opened!(edit))).toBe(true);
    expect(shape('user').bounds).toEqual({
      x: 40,
      y: 160,
      width: widthOf(KEY_ROW, rowWidth('role', 'Nombre entier')),
      height: 26 + 3 * 20,
    });
    expect(shape('timestamped').bounds.width).toBe(widthOf(rowWidth('created_at', 'Phrase')));
    expect(shape('accounts').bounds).toEqual(region);
    expect(run((edit) => rdd.opened!(edit))).toBe(false);
  });
});

describe('mode RDD : entités (sujet 180)', () => {
  it('clé primaire toujours en tête ; un fichier sans elle la retrouve à la première écriture', () => {
    const { run, shape } = setup();
    run((edit) => setField(edit, shape('orphan'), 1, { nullable: true }));
    expect(labels(fieldsOf(shape('orphan')))).toEqual(['id', 'name']);
    expect(fieldsOf(shape('orphan'))[0]!.kind).toBe('pk');
  });

  it('table secondaire et couleur, comme sur le modèle', () => {
    const { run, shape } = setup();
    run((edit) => setSecondary(edit, shape('role'), true));
    expect(shape('role').bounds).toEqual({ x: 240, y: 160, width: widthOf(KEY_ROW) * 0.8, height: 68.8 });
    run((edit) => setHeaderColor(edit, shape('role'), '#d5e8d4'));
    expect(shape('role').style.fillColor).toBe('#d5e8d4');
  });
});

describe('mode RDD : embedded, document et vue (sujets 181, 218)', () => {
  const templates = createDefaultRegistry().templates();
  const style = (id: string) => templates.find((t) => t.id === id)!.style;

  it('palette : entête de 26 px, sans clé primaire ; embedded en trait plein, coins arrondis pour la vue', () => {
    for (const id of ['rdd-embedded', 'rdd-document', 'rdd-view']) {
      expect(style(id)).toContain('startSize=26;');
      expect(style(id)).not.toContain('spatial.fields');
    }
    expect(style('rdd-embedded')).not.toMatch(/dashed|rounded/);
    expect(style('rdd-view')).toContain('rounded=1;');
    expect(style('rdd-document')).not.toMatch(/dashed|rounded/);
  });

  function render() {
    const { page } = setup();
    const texts: TextSpec[] = [];
    const ctx: RenderContext = {
      text: {
        create(spec) {
          texts.push(spec);
          return new Object3D();
        },
      },
    };
    const root = buildPageScene(page(), createDefaultRegistry(), ctx, 'flat').root;
    const object = (id: string) => root.children.find((child) => child.userData.elementId === id)!;
    return { texts, object, page };
  }

  it('sans mention (sujet 218) ; clés du document en italique ; document sans nom : « Document »', () => {
    const { texts } = render();
    expect(texts.filter((t) => t.text.includes('«'))).toEqual([]);
    expect(['theme', 'locale'].map((key) => texts.find((t) => t.text === key)!.italic)).toEqual([true, true]);
    expect(texts.find((t) => t.text === 'street')!.italic).toBeFalsy();
    expect(texts.filter((t) => t.text === 'Document')).toHaveLength(1);
  });

  it('document : coin plié en haut à droite (coin coupé, rabat plus sombre), 10 px', () => {
    const { object, page } = render();
    const settings = object('settings');
    const flap = settings.getObjectByName('fill-fold') as Mesh;
    flap.geometry.computeBoundingBox();
    const box = flap.geometry.boundingBox!;
    expect([box.min.x, box.min.y, box.max.x, box.max.y]).toEqual([390, 300, 400, 310]);
    const color = (mesh: Object3D) => ((mesh as Mesh).material as MeshBasicMaterial).color;
    const header = color(settings.getObjectByName('fill-header')!);
    expect(color(flap).r).toBeLessThan(header.r);
    expect(
      createDefaultRegistry().resolve(page().shapes.find((s) => s.id === 'settings')!).definition.outline!(
        page().shapes.find((s) => s.id === 'settings')!,
      ),
    ).toEqual([
      { x: 240, y: 300 },
      { x: 390, y: 300 },
      { x: 400, y: 310 },
      { x: 400, y: 366 },
      { x: 240, y: 366 },
    ]);
    expect(object('address').getObjectByName('fill-fold')).toBeUndefined();
  });

  it('embedded : bas ondulé dans les bornes, sous le dernier champ ; 4 px de plus pour la vague (sujet 219)', () => {
    const { page } = render();
    const address = page().shapes.find((s) => s.id === 'address')!;
    const path = createDefaultRegistry().resolve(address).definition.outline!(address);
    const bottom = path.filter((p) => p.y > 300 + 26);
    const ys = bottom.map((p) => p.y);
    // Vague entre 366 (sous les deux champs) et 370 (bas des bornes), qui descend d'abord en partant de la gauche.
    expect(Math.min(...ys)).toBeCloseTo(366, 5);
    expect(Math.max(...ys)).toBeCloseTo(370, 5);
    const left = [...bottom].sort((a, b) => a.x - b.x);
    expect(left[1]!.y).toBeGreaterThan(left[0]!.y);
    expect(templates.find((t) => t.id === 'rdd-embedded')!.height).toBe(26 + 20 + 4);
  });

  it('embedded : la hauteur suit les champs, vague comprise', () => {
    const { run, shape } = setup();
    run((edit) => setFields(edit, shape('address'), 'street\ncity\nzip'));
    expect(shape('address').bounds.height).toBe(26 + 3 * 20 + 4);
    run((edit) => setSecondary(edit, shape('address'), true));
    run((edit) => setFields(edit, shape('address'), 'street'));
    expect(shape('address').bounds.height).toBeCloseTo((26 + 20 + 4) * 0.8, 5);
  });

  it('icônes d’entête : jumelles (vue), liste (énumération), prise (embedded, 223), en haut à droite (sujets 220, 222)', () => {
    const { object, page } = render();
    const markOf = (id: string) => object(id).getObjectByName('header-mark');
    expect(['active', 'role', 'address'].map((id) => markOf(id)!.userData.mark)).toEqual([
      'binoculars',
      'list',
      'plug',
    ]);
    expect(['active', 'role', 'address'].map((id) => markOf(id)!.children.length)).toEqual([5, 6, 4]);
    for (const id of ['active', 'role', 'address']) {
      const shape = page().shapes.find((s) => s.id === id)!;
      const { x, y, width } = shape.bounds;
      const box = new Box3().setFromObject(markOf(id)!);
      // Cadre de 21 × 13,5 (14 × 9 agrandi 1,5 fois) à 7 px du bord droit, centré dans l'entête (26 px) ; trait de 1 px.
      expect(box.min.x, id).toBeGreaterThanOrEqual(x + width - 7 - 21 - 0.5);
      expect(box.max.x, id).toBeLessThanOrEqual(x + width - 7 + 0.5);
      expect(box.min.y, id).toBeGreaterThanOrEqual(y + (26 - 13.5) / 2 - 0.5);
      expect(box.max.y, id).toBeLessThanOrEqual(y + (26 + 13.5) / 2 + 0.5);
      // Assez grande pour se lire : au moins 12 px de large.
      expect(box.max.x - box.min.x, id).toBeGreaterThan(12);
    }
    // Couleur de la bordure, pleinement opaque (sujet 221).
    const material = (markOf('active')!.children[0] as Mesh).material as MeshBasicMaterial;
    expect([material.color.getHexString(), material.opacity]).toEqual(['666666', 1]);
    for (const id of ['settings', 'user', 'model']) expect(markOf(id), id).toBeUndefined();
  });

  it('« Icône » décochée : spatial.icon=0, icône masquée, titre sur toute la largeur ; recochée : retirée (222)', () => {
    const { run, page } = setup();
    const icon = rdd.shapeProperties!.find((p) => p.label === 'Icône')!;
    const role = () => page().shapes.find((s) => s.id === 'role')!;
    expect([icon.hidden!(page(), role()), icon.value!(page(), role())]).toEqual([false, '1']);
    run((edit) => icon.write!(edit, role(), undefined));
    expect(spatialValue(role(), ICON)).toBe('0');
    expect(icon.value!(page(), role())).toBeUndefined();
    expect(createDefaultRegistry().textZone(role(), 'flat')).toEqual({
      x: 240,
      y: 160,
      width: widthOf(KEY_ROW),
      height: 26,
    });
    const root = buildPageScene(
      page(),
      createDefaultRegistry(),
      { text: { create: () => new Object3D() } },
      'flat',
    ).root;
    const object = root.children.find((child) => child.userData.elementId === 'role')!;
    expect(object.getObjectByName('header-mark')).toBeUndefined();
    run((edit) => icon.write!(edit, role(), '1'));
    expect(spatialValue(role(), ICON)).toBeUndefined();
  });

  it('zone du titre réduite des deux côtés de la place de l’icône d’entête (sujets 221, 222)', () => {
    const { page } = render();
    const zone = (id: string) =>
      createDefaultRegistry().textZone(
        page().shapes.find((s) => s.id === id)!,
        'flat',
      );
    // 7 (bord) + 21 (icône) + 4 (air) = 32 px de chaque côté.
    expect(zone('active')).toEqual({ x: 672, y: 300, width: 96, height: 26 });
    expect(zone('role')).toEqual({ x: 272, y: 160, width: 96, height: 26 });
    expect(zone('address')).toEqual({ x: 72, y: 300, width: 96, height: 26 });
    expect(zone('user')).toEqual({ x: 40, y: 160, width: 160, height: 26 });
  });

  it('vue : contour arrondi, entête coupé dans ce contour', () => {
    const { object } = render();
    const view = object('active');
    const header = view.getObjectByName('fill-header') as Mesh;
    header.geometry.computeBoundingBox();
    const box = header.geometry.boundingBox!;
    expect([box.min.x, box.min.y, box.max.x, box.max.y]).toEqual([640, 300, 800, 326]);
    // Coin haut-gauche arrondi : pas de sommet au coin exact.
    const corner = [...(header.geometry.getAttribute('position').array as Float32Array)].some(
      (_, i, a) => i % 3 === 0 && a[i] === 640 && a[i + 1] === 300,
    );
    expect(corner).toBe(false);
  });
});

describe('mode RDD : rendu d’une table', () => {
  function render(color?: string) {
    const { run, page, shape } = setup();
    if (color) run((edit) => setHeaderColor(edit, shape('timestamped'), color));
    const texts: TextSpec[] = [];
    const ctx: RenderContext = {
      text: {
        create(spec) {
          texts.push(spec);
          return new Object3D();
        },
      },
    };
    const root = buildPageScene(page(), createDefaultRegistry(), ctx, 'flat').root;
    const object = root.children.find((child) => child.userData.elementId === 'timestamped')!;
    return { texts, object, root };
  }

  it('nom gras italique centré dans l’entête, champs alignés à gauche ligne par ligne', () => {
    const { texts } = render();
    const at = texts.findIndex((t) => t.text === 'Timestamped');
    const [name, first, second] = texts.slice(at, at + 3);
    expect([name!.text, name!.bold, name!.italic, name!.align]).toEqual(['Timestamped', true, true, 'center']);
    // Après la marge, l'icône (12) et son air (4) ; le type suit en gris (sujet 248).
    expect([first!.text, first!.anchorX, first!.x, first!.y]).toEqual(['created_at', 'left', 262, 40 + 26 + 10]);
    const label = approximateMeasure('created_at', { size: 11, bold: false, italic: false });
    expect([second!.text, second!.x, second!.y]).toEqual(['Phrase', 262 + label + 6, 40 + 26 + 10]);
    expect(`#${(second!.color as Color).getHexString()}`).toBe('#999999');
    expect(texts[at + 3]!.text).toBe('updated_at');
    expect(texts[at + 3]!.y).toBe(40 + 26 + 30);
  });

  it('icône de kind devant chaque champ, petit losange blanc si nullable ; plus de soulignement (sujet 248)', () => {
    const { texts, root } = render();
    const icons = (id: string) =>
      root.children
        .find((child) => child.userData.elementId === id)!
        .children.filter((child) => child.name === 'field-icon')
        .map((icon) => [icon.userData.kind, icon.userData.nullable, icon.getObjectByName('field-hole') !== undefined]);
    expect(icons('user')).toEqual([
      ['pk', false, false],
      ['property', false, false],
      ['fk', false, false],
    ]);
    expect(icons('secondary')).toEqual([['fk', true, true]]);
    // Vue : un champ `id` ordinaire ; entité sans clé primaire dans le fichier : `id` ajouté en tête.
    expect(icons('active')[0]).toEqual(['property', false, false]);
    expect(icons('orphan')[0]).toEqual(['pk', false, false]);
    const fill = root.children
      .find((child) => child.userData.elementId === 'user')!
      .children.find((child) => child.name === 'field-icon')!.children[0] as Mesh;
    expect(`#${(fill.material as MeshBasicMaterial).color.getHexString()}`).toBe('#ffd700');
    expect(texts.some((t) => t.underline)).toBe(false);
  });

  it('énumération : sans mention (sujet 216), nom droit', () => {
    const { texts } = render();
    const at = texts.findIndex((t) => t.text === 'Role');
    expect(texts.some((t) => t.text.startsWith('«enum'))).toBe(false);
    expect(texts[at + 1]!.text).toBe('id');
    expect(texts[at]!.italic).toBe(false);
    expect(texts.find((t) => t.text === 'User')!.italic).toBe(false);
  });

  it('énumération : cadre double autour de l’entête, à 3 px dedans ; entité : cadre simple', () => {
    const { run, page, shape } = setup();
    const strokes = (id: string) => {
      const root = buildPageScene(
        page(),
        createDefaultRegistry(),
        { text: { create: () => new Object3D() } },
        'flat',
      ).root;
      return root.children
        .find((child) => child.userData.elementId === id)!
        .children.filter((c): c is Mesh => c.name === 'stroke-table');
    };
    expect(strokes('user')).toHaveLength(2);
    const inner = strokes('role')[2]!;
    inner.geometry.computeBoundingBox();
    const box = inner.geometry.boundingBox!;
    // Trait de 1 px centré sur le rectangle intérieur : bornes ± 0,5.
    expect([box.min.x, box.min.y, box.max.x, box.max.y]).toEqual([242.5, 162.5, 397.5, 183.5]);
    // Table secondaire : écart à l'échelle (2,4 px).
    run((edit) => setSecondary(edit, shape('role'), true));
    const small = strokes('role')[2]!;
    small.geometry.computeBoundingBox();
    expect(small.geometry.boundingBox!.min.x).toBeCloseTo(241.9, 3);
  });

  it("entête de la couleur fillColor, corps blanc ; texte de l'entête blanc sur une couleur sombre", () => {
    const fillHex = (mesh: Object3D | undefined) => ((mesh as Mesh).material as MeshBasicMaterial).color.getHexString();
    const light = render();
    expect(fillHex(light.object.getObjectByName('fill-header'))).toBe('d5e8d4');
    expect(fillHex(light.object.children.find((c) => c instanceof Mesh))).toBe('ffffff');
    expect(light.texts.find((t) => t.text === 'Timestamped')!.color.getHexString()).toBe('000000');
    const dark = render('#1f3a5f');
    expect(dark.texts.find((t) => t.text === 'Timestamped')!.color.getHexString()).toBe('ffffff');
  });
});

describe('mode RDD : région (sujet 182)', () => {
  const templates = createDefaultRegistry().templates();

  it('palette : rectangle léger, label gras en haut à gauche, posé au fond de la pile', () => {
    const region = templates.find((t) => t.id === 'rdd-region')!;
    expect(region.style).toContain('rounded=0;');
    expect(region.style).toContain('fillColor=#fdebef;strokeColor=#969696;');
    // Fond opaque (sujet 232).
    expect(region.style).not.toContain('fillOpacity');
    // Label en 9 px, sans marge ajoutée (sujet 226) ; dans draw.io, posé au-dessus de la région à gauche dans un cadre
    // de la couleur de la bordure, comme l'onglet (sujet 227).
    expect(region.style).toContain('labelBorderColor=#969696;fontColor=#000000;');
    expect(region.style).not.toContain('labelBackgroundColor');
    expect(region.style).toContain('align=left;verticalAlign=bottom;verticalLabelPosition=top;fontStyle=1;fontSize=9;');
    expect(region.style).not.toContain('spacing');
    expect(region.style).toContain('spatial.kind=rdd-region;');
    expect(region.atBack).toBe(true);
    // Taille d'une région neuve (sujet 233).
    expect([region.width, region.height]).toEqual([200, 80]);
  });

  it('contenu : les formes du mode dont le coin haut-gauche est dans la région', () => {
    const { page, shape } = setup();
    expect(regionContent(page(), shape('accounts')).sort()).toEqual(['role', 'user']);
    expect(regionOf(page(), shape('orphan'))).toBeUndefined();
    // Une table n'emporte rien ; le mode déclare le contenu de la région comme emporté.
    expect(regionContent(page(), shape('user'))).toEqual([]);
    expect(rdd.carries!(page(), shape('accounts')).sort()).toEqual(['role', 'user']);
  });

  it('régions imbriquées : une forme appartient à la plus petite, la grande emporte tout', () => {
    const { document } = readDrawio(`<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" />
      <mxCell id="big" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="500" as="geometry" /></mxCell>
      <mxCell id="small" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="200" as="geometry" /></mxCell>
      <mxCell id="twin" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="200" as="geometry" /></mxCell>
      <mxCell id="inner" value="" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="150" width="160" height="46" as="geometry" /></mxCell>
      <mxCell id="outer" value="" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="350" y="350" width="160" height="46" as="geometry" /></mxCell>
      <mxCell id="note" value="" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="20" y="20" width="40" height="40" as="geometry" /></mxCell>
    </root></mxGraphModel></diagram></mxfile>`);
    const page = document.pages[0]!;
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    // Deux régions au même coin et de même taille (sujet 231) : celle de devant (twin) est dans celle de derrière ; la
    // table va à la plus imbriquée.
    expect(regionOf(page, shape('inner'))?.id).toBe('twin');
    expect(regionOf(page, shape('small'))?.id).toBe('big');
    expect(regionOf(page, shape('twin'))?.id).toBe('small');
    // Une forme hors du mode n'est jamais contenue.
    expect(regionOf(page, shape('note'))).toBeUndefined();
    expect(regionContent(page, shape('small')).sort()).toEqual(['inner', 'twin']);
    expect(regionContent(page, shape('big')).sort()).toEqual(['inner', 'outer', 'small', 'twin']);
  });

  it('onglet du nom (sujet 227) : au-dessus du coin haut-gauche, coin carré, fini par un S jusqu’au bord haut', () => {
    const { page, shape } = setup();
    const region = shape('accounts');
    const rect = tabRect(region)!;
    const { height, curve } = REGION.tab;
    expect([rect.x, rect.y, rect.height]).toEqual([20, 130 - height, height]);
    const path = tabPath(region)!;
    // Bord gauche dans le prolongement de la région, coin haut-gauche carré.
    expect(path.slice(0, 2)).toEqual([
      { x: 20, y: 130 },
      { x: 20, y: 130 - height },
    ]);
    // S : part à l'horizontale du haut, finit à l'horizontale sur le bord haut, descend sans jamais remonter.
    const s = path.slice(2);
    expect(s[0]).toEqual({ x: 20 + rect.width, y: 130 - height });
    expect(s.at(-1)).toEqual({ x: 20 + rect.width + curve, y: 130 });
    expect(s.every((p, i) => i === 0 || (p.y >= s[i - 1]!.y && p.x > s[i - 1]!.x))).toBe(true);
    expect(s[1]!.y - s[0]!.y).toBeLessThan(s[6]!.y - s[5]!.y);
    // Même marge des deux côtés du nom : du bord gauche, et jusqu'au milieu du S (sujet 228).
    const nameWidth = approximateMeasure('Comptes', { size: 9, bold: true, italic: false });
    const { padding } = REGION.tab;
    expect(rect.x + rect.width + curve / 2 - (20 + padding + nameWidth)).toBeCloseTo(padding, 6);
    // Éditeur en place exactement sur le nom : sa zone, aligné à gauche, centré en hauteur, sans marge.
    const registry = createDefaultRegistry();
    expect(registry.textZone(region, 'flat')).toEqual({ x: 20 + padding, y: 130 - height, width: nameWidth, height });
    expect(registry.editStyle(region)).toMatchObject({
      align: 'left',
      verticalAlign: 'middle',
      spacing: '0',
      labelBackgroundColor: 'none',
    });
    // Sans nom : pas d'onglet.
    expect(tabPath({ ...region, label: ' ' })).toBeUndefined();
    // Un seul contour, région et onglet : le haut de l'onglet, le S, puis le reste du rectangle.
    const outline = regionOutline(region);
    expect(outline.slice(0, s.length + 1)).toEqual([{ x: 20, y: 130 - height }, ...s]);
    expect(outline.slice(-3)).toEqual([
      { x: 420, y: 130 },
      { x: 420, y: 260 },
      { x: 20, y: 260 },
    ]);
    // L'onglet se clique comme la région.
    const shapes = createDefaultRegistry();
    const options = {
      edgeTolerance: 4,
      edgeRoute: () => undefined,
      contains: (s: ShapeModel, p: Point) => shapes.contains(s, p),
      hitBounds: (s: ShapeModel) => shapes.hitBounds(s),
    };
    expect(pickElement(page(), { x: 25, y: 130 - height / 2 }, options)?.element.id).toBe('accounts');
    expect(pickElement(page(), { x: 300, y: 130 - height / 2 }, options)).toBeUndefined();
  });

  it('couleur de la région : sa palette (sujet 233), bordure grise ; réglages de table masqués', () => {
    const { run, page, shape } = setup();
    const color = rdd.shapeProperties!.find((p) => p.key === 'rdd.regionColor')!;
    expect(rdd.shapeProperties!.filter((p) => !p.part).map((p) => p.hidden!(page(), shape('accounts')))).toEqual([
      true,
      false,
      true,
      true,
      true,
    ]);
    expect(color.type === 'select' && color.options(page(), ['#123456']).map((o) => o.value)).toEqual([
      '#fdebef',
      '#eae4f1',
      '#e7f5fd',
      '#e7f3e7',
      '#fefce8',
      '#feefe3',
    ]);
    expect(REGION_COLORS[0]).toBe('#fdebef');
    run((edit) => color.write!(edit, shape('accounts'), '#e7f3e7'));
    expect(color.value!(page(), shape('accounts'))).toBe('#e7f3e7');
    expect(shape('accounts').style).toMatchObject({
      fillColor: '#e7f3e7',
      strokeColor: '#969696',
      labelBorderColor: '#969696',
    });
    expect(shape('accounts').style.labelBackgroundColor).toBeUndefined();
    // Fond opaque (sujet 232) : texte noir sur une couleur claire, blanc sur une sombre ; un ancien fillOpacity est
    // retiré.
    expect(shape('accounts').style.fontColor).toBe('#000000');
    run((edit) => edit.setElementStyle('accounts', 'fillOpacity', '10'));
    run((edit) => color.write!(edit, shape('accounts'), '#1f3a5f'));
    expect(shape('accounts').style.fontColor).toBe('#ffffff');
    expect(shape('accounts').style.fillOpacity).toBeUndefined();
    // Sur un fond léger (fichier d'avant), le texte se lit sur le fond posé sur du blanc.
    expect(regionTextColor('#1f3a5f', 0.1)).toBe('#000000');
  });
});

describe('mode RDD : la région s’étend quand on y pose une forme qui dépasse (sujet 183)', () => {
  const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />
    <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
    <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="150" as="geometry" /></mxCell>
    <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="120" width="160" height="46" as="geometry" /></mxCell>
    <mxCell id="note" value="" style="rounded=0;" vertex="1" parent="1"><mxGeometry x="450" y="250" width="100" height="100" as="geometry" /></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;
  const setupPage = () => {
    const { document, tree } = readDrawio(xml);
    let page = document.pages[0]!;
    const run = (operation: (edit: ModeEdit) => void) => {
      const changed = applyModeEdit(page, tree.pages[0]!, operation);
      page = documentFromTree(tree).pages[0]!;
      return changed;
    };
    const bounds = (id: string) => page.shapes.find((s) => s.id === id)!.bounds;
    const place = (id: string, x: number, y: number) => {
      run((edit) => edit.setShapeBounds(id, { ...bounds(id), x, y }));
      return run((edit) => rdd.placed!(edit, [id]));
    };
    /** Déplacement : le mode reçoit aussi la page d'avant (sujet 234). */
    const move = (id: string, x: number, y: number) => {
      const before = page;
      run((edit) => edit.setShapeBounds(id, { ...bounds(id), x, y }));
      return run((edit) => rdd.placed!(edit, [id], before));
    };
    const resize = (id: string, width: number, height: number) =>
      run((edit) => edit.setShapeBounds(id, { ...bounds(id), width, height }));
    return { bounds, place, move, resize };
  };

  it('la région s’agrandit vers la droite et le bas, 20 px de marge ; sa région englobante suit', () => {
    const { bounds, place } = setupPage();
    expect(REGION.margin).toBe(20);
    // T dépasse à droite de Small (310 > 300) : Small va jusqu'à 330.
    expect(place('t', 150, 120)).toBe(true);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 230, height: 150 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
    // Coin toujours dans Small, plus bas et à droite : Small passe à 400 × 206 et dépasse Big par le bas, qui
    // s'agrandit à son tour (marge autour de Small).
    place('t', 320, 240);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 400, height: 206 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 520, height: 326 });
    // Coin hors de Small mais dans Big : seule Big s'agrandit.
    place('t', 510, 320);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 400, height: 206 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 690, height: 386 });
  });

  it('une région aussi grande que sa parente y est dès que son coin y est, et l’agrandit (sujet 231)', () => {
    const { bounds, place, resize } = setupPage();
    resize('small', 500, 300);
    // Small, de la taille de Big, posée en mordant sur son bord : son coin est dans Big, qui s'agrandit.
    expect(place('small', 300, 200)).toBe(true);
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 820, height: 520 });
  });

  it('une région posée qui dépasse de sa région parente l’agrandit, comme une table (sujet 231)', () => {
    const { bounds, place } = setupPage();
    // Small (200 × 150) posée à (400, 200) : son coin est dans Big, elle en dépasse à droite et en bas.
    expect(place('small', 400, 200)).toBe(true);
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 620, height: 370 });
    expect(bounds('small')).toEqual({ x: 400, y: 200, width: 200, height: 150 });
  });

  it('sortie par la gauche ou le haut en chevauchant sa région : la région s’agrandit de ce côté (sujet 234)', () => {
    const { bounds, move } = setupPage();
    // T (160 × 46) dans Small (100, 100, 200 × 150) tirée à (80, 90) : coin hors de Small mais dans Big, qui englobe
    // Small ; elle chevauche encore Small, qui s'agrandit à gauche et en haut (marge comprise), pas à droite.
    expect(move('t', 80, 90)).toBe(true);
    expect(bounds('small')).toEqual({ x: 60, y: 70, width: 240, height: 180 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
    // Small sortie à son tour par le haut de Big : Big s'agrandit vers le haut, au-dessus de l'onglet de Small
    // (sujet 237), marge comprise.
    expect(move('small', 60, -10)).toBe(true);
    expect(bounds('big')).toEqual({ x: 0, y: -46, width: 500, height: 346 });
  });

  it('tirée complètement hors de sa région, la forme en sort : rien ne s’agrandit (sujet 234)', () => {
    const { bounds, move } = setupPage();
    expect(move('t', 600, 400)).toBe(false);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 200, height: 150 });
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
  });

  it('ni rétrécie ni changée si la forme tient ; une forme hors du mode ou hors région ne change rien', () => {
    const { bounds, place } = setupPage();
    expect(place('t', 110, 110)).toBe(false);
    expect(bounds('small')).toEqual({ x: 100, y: 100, width: 200, height: 150 });
    expect(place('note', 450, 250)).toBe(false);
    expect(bounds('big')).toEqual({ x: 0, y: 0, width: 500, height: 300 });
    expect(place('t', 700, 700)).toBe(false);
  });
});

describe('mode RDD : le contenu d’une région est devant elle (sujet 230)', () => {
  it('à la pose, les régions passent au fond, les plus englobantes derrière ; draw.io garde l’ordre', () => {
    // Ordre du fichier à l'envers : la table, puis la petite région, puis la grande.
    const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" />
      <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="150" y="120" width="100" height="46" as="geometry" /></mxCell>
      <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="150" as="geometry" /></mxCell>
      <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
      <mxCell id="other" value="Other" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="600" y="0" width="100" height="100" as="geometry" /></mxCell>
    </root></mxGraphModel></diagram></mxfile>`;
    const { document, tree } = readDrawio(xml);
    const page = document.pages[0]!;
    expect(applyModeEdit(page, tree.pages[0]!, (edit) => rdd.placed!(edit, ['t']))).toBe(true);
    const order = () => documentFromTree(tree).pages[0]!.shapes.map((s) => s.id);
    expect(order()).toEqual(['big', 'other', 'small', 't']);
    // Déjà en ordre : rien ne change.
    const again = documentFromTree(tree).pages[0]!;
    expect(applyModeEdit(again, tree.pages[0]!, (edit) => rdd.placed!(edit, ['t']))).toBe(false);
    expect(order()).toEqual(['big', 'other', 'small', 't']);
  });
});

describe('mode RDD : ajuster une région à son contenu, touche « f » (sujet 184)', () => {
  it('trop grande puis trop petite : ramenée autour de ses tables avec 20 px de marge ; vide : inchangée', () => {
    const { run, page, shape } = setup();
    const key = rdd.keys!.f!;
    expect(key.label).toBe('Ajuster la région');
    expect(key.applies(page(), shape('accounts'))).toBe(true);
    expect(key.applies(page(), shape('user'))).toBe(false);
    // Comptes contient User (40, 160, 160 × 86) et Role (240, 160, 160 × 86).
    const fitted = { x: 20, y: 140, width: 400, height: 126 };
    run((edit) => edit.setShapeBounds('accounts', { x: 10, y: 120, width: 425, height: 170 }));
    run((edit) => key.run(edit, shape('accounts'), undefined));
    expect(shape('accounts').bounds).toEqual(fitted);
    run((edit) => edit.setShapeBounds('accounts', { x: 20, y: 140, width: 250, height: 110 }));
    run((edit) => key.run(edit, shape('accounts'), undefined));
    expect(shape('accounts').bounds).toEqual(fitted);
    // Région vide : rien ne change.
    run((edit) => edit.setShapeBounds('accounts', { x: 900, y: 900, width: 100, height: 100 }));
    expect(run((edit) => key.run(edit, shape('accounts'), undefined))).toBe(false);
    expect(shape('accounts').bounds).toEqual({ x: 900, y: 900, width: 100, height: 100 });
  });
});

describe('mode RDD : l’onglet d’une région enfant compte dans sa parente (sujet 237)', () => {
  const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />
    <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
    <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="80" as="geometry" /></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;

  it('« f » sur une région qui ne contient qu’une région : 20 px au-dessus de l’onglet de l’enfant', () => {
    const { document, tree } = readDrawio(xml);
    const page = document.pages[0]!;
    const big = page.shapes.find((s) => s.id === 'big')!;
    applyModeEdit(page, tree.pages[0]!, (edit) => rdd.keys!.f!.run(edit, big, undefined));
    const bounds = documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === 'big')!.bounds;
    expect(bounds).toEqual({ x: 80, y: 100 - REGION.tab.height - 20, width: 240, height: 80 + REGION.tab.height + 40 });
  });

  it('une région posée en sortant par le haut agrandit sa parente au-dessus de son onglet', () => {
    const { document, tree } = readDrawio(xml);
    let page = document.pages[0]!;
    const before = page;
    applyModeEdit(page, tree.pages[0]!, (edit) =>
      edit.setShapeBounds('small', { x: 100, y: 5, width: 200, height: 80 }),
    );
    page = documentFromTree(tree).pages[0]!;
    applyModeEdit(page, tree.pages[0]!, (edit) => rdd.placed!(edit, ['small'], before));
    const bounds = documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === 'big')!.bounds;
    expect(bounds.y).toBe(5 - REGION.tab.height - 20);
  });
});

describe('mode RDD : couleur d’une région neuve selon ses sœurs (sujet 236)', () => {
  it('rose, lavande, bleu… modulo la palette ; dans une région, comptée parmi ses propres sœurs', () => {
    const { tree } = readDrawio(`<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" /></root></mxGraphModel></diagram></mxfile>`);
    const pageTree = tree.pages[0]!;
    /** Ajout depuis la palette : la cellule, puis le mode (sans page d'avant). */
    const add = (x: number, y: number, width = 200, height = 80) => {
      const id = addShapeCell(pageTree, { style: 'spatial.kind=rdd-region;', value: 'R', x, y, width, height });
      applyModeEdit(documentFromTree(tree).pages[0]!, pageTree, (edit) => rdd.placed!(edit, [id]));
      return id;
    };
    const colorOf = (id: string) => documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === id)!.style.fillColor;
    const top = [0, 1, 2, 3, 4, 5, 6].map((i) => add(i * 1000, 0, 800, 600));
    expect(top.map(colorOf)).toEqual([...REGION_COLORS, REGION_COLORS[0]]);
    // Dans la première région : premier de son niveau, rose ; la suivante, lavande.
    const inner = [add(20, 20), add(20, 200)];
    expect(inner.map(colorOf)).toEqual([REGION_COLORS[0], REGION_COLORS[1]]);
    // Un déplacement ne change pas la couleur.
    const page = documentFromTree(tree).pages[0]!;
    applyModeEdit(page, pageTree, (edit) => rdd.placed!(edit, [inner[1]!], page));
    expect(colorOf(inner[1]!)).toBe(REGION_COLORS[1]);
  });
});

describe('mode RDD : règles des régions au redimensionnement, à l’ajustement et au collage (sujet 239)', () => {
  const xml = `<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
    <mxCell id="0" /><mxCell id="1" parent="0" />
    <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="500" height="300" as="geometry" /></mxCell>
    <mxCell id="small" value="Small" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="100" y="100" width="200" height="80" as="geometry" /></mxCell>
    <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="120" y="120" width="160" height="46" as="geometry" /></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;
  const setupPage = () => {
    const { document, tree } = readDrawio(xml);
    let page = document.pages[0]!;
    const run = (operation: (edit: ModeEdit) => void) => {
      const changed = applyModeEdit(page, tree.pages[0]!, operation);
      page = documentFromTree(tree).pages[0]!;
      return changed;
    };
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    return { run, shape, tree, page: () => page };
  };

  it('redimensionnement : un enfant agrandi au-delà de sa parente l’agrandit, contenu en place', () => {
    const { run, shape, page } = setupPage();
    const before = page();
    run((edit) => edit.setShapeBounds('small', { x: 100, y: 100, width: 500, height: 250 }));
    expect(run((edit) => rdd.placed!(edit, ['small'], before))).toBe(true);
    expect(shape('big').bounds).toEqual({ x: 0, y: 0, width: 620, height: 370 });
    expect(shape('t').bounds).toEqual({ x: 120, y: 120, width: 160, height: 46 });
  });

  it('« f » sur une sous-région : elle, puis sa parente, ajustées à leur contenu (grandir ou rétrécir)', () => {
    const { run, shape } = setupPage();
    // T déborde de Small vers la droite et le bas ; Big est juste assez grande pour Small.
    run((edit) => edit.setShapeBounds('t', { x: 120, y: 120, width: 400, height: 200 }));
    run((edit) => edit.setShapeBounds('big', { x: 0, y: 0, width: 320, height: 200 }));
    run((edit) => rdd.keys!.f!.run(edit, shape('small'), undefined));
    const small = { x: 100, y: 100, width: 440, height: 240 };
    expect(shape('small').bounds).toEqual(small);
    // Big autour de Small et de son onglet, 20 px de marge.
    const tab = REGION.tab.height;
    expect(shape('big').bounds).toEqual({ x: 80, y: 100 - tab - 20, width: 480, height: 240 + tab + 40 });
    // Big trop grande : « f » sur Small la ramène aussi autour de Small.
    run((edit) => edit.setShapeBounds('big', { x: -200, y: -200, width: 1200, height: 900 }));
    run((edit) => rdd.keys!.f!.run(edit, shape('small'), undefined));
    expect(shape('big').bounds).toEqual({ x: 80, y: 100 - tab - 20, width: 480, height: 240 + tab + 40 });
  });

  it('collage de deux régions : chacune la couleur suivante de son niveau', () => {
    const { tree } = setupPage();
    const pageTree = tree.pages[0]!;
    const a = addShapeCell(pageTree, {
      style: 'spatial.kind=rdd-region;',
      value: 'A',
      x: 1000,
      y: 0,
      width: 200,
      height: 80,
    });
    const b = addShapeCell(pageTree, {
      style: 'spatial.kind=rdd-region;',
      value: 'B',
      x: 1300,
      y: 0,
      width: 200,
      height: 80,
    });
    applyModeEdit(documentFromTree(tree).pages[0]!, pageTree, (edit) => rdd.placed!(edit, [a, b]));
    const colorOf = (id: string) => documentFromTree(tree).pages[0]!.shapes.find((s) => s.id === id)!.style.fillColor;
    // Big est la seule région de premier niveau déjà là.
    expect([colorOf(a), colorOf(b)]).toEqual([REGION_COLORS[1], REGION_COLORS[2]]);
  });
});

describe('mode RDD : une région ne passe pas sur ses sœurs (sujet 241)', () => {
  it('obstacles d’une région : ses sœurs, onglet compris ; ni sa parente ni son contenu', () => {
    const { document } = readDrawio(`<mxfile><diagram id="p" name="P" spatial.mode="rdd"><mxGraphModel><root>
      <mxCell id="0" /><mxCell id="1" parent="0" />
      <mxCell id="big" value="Big" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="800" height="400" as="geometry" /></mxCell>
      <mxCell id="a" value="A" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="20" y="40" width="200" height="80" as="geometry" /></mxCell>
      <mxCell id="b" value="B" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="300" y="40" width="200" height="80" as="geometry" /></mxCell>
      <mxCell id="inner" value="" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="30" y="60" width="50" height="40" as="geometry" /></mxCell>
      <mxCell id="other" value="O" style="spatial.kind=rdd-region;" vertex="1" parent="1"><mxGeometry x="1000" y="0" width="200" height="80" as="geometry" /></mxCell>
      <mxCell id="t" value="T" style="swimlane;spatial.kind=rdd-entity;" vertex="1" parent="1"><mxGeometry x="300" y="200" width="160" height="46" as="geometry" /></mxCell>
    </root></mxGraphModel></diagram></mxfile>`);
    const page = document.pages[0]!;
    const shape = (id: string) => page.shapes.find((s) => s.id === id)!;
    const found = rdd.obstacles!(page, shape('a'))!;
    // B, sa sœur dans Big, onglet compris ; ni Big (parente), ni Inner (son contenu), ni Other (autre niveau).
    expect(found.rects).toEqual([
      { id: 'b', rect: { x: 300, y: 40 - REGION.tab.height, width: 200, height: 80 + REGION.tab.height } },
    ]);
    expect(found.above).toBe(REGION.tab.height);
    // Premier niveau : Big et Other sont sœurs.
    expect(rdd.obstacles!(page, shape('big'))!.rects.map((r) => r.id)).toEqual(['other']);
    // Une table n'est pas bornée.
    expect(rdd.obstacles!(page, shape('t'))).toBeUndefined();
  });
});
