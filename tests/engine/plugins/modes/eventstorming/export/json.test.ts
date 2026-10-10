import { describe, expect, it } from 'vitest';
import { rewriteLabels } from '../../../../../../src/engine/core/format/fileLabels';
import { documentFromTree, readDrawio } from '../../../../../../src/engine/core/format/parse';
import {
  eventStormingExporter,
  normalizedText,
  wallExport,
} from '../../../../../../src/engine/plugins/modes/eventstorming/export/json';
import { fixture } from '../../../../../helpers';
import { modeHost } from '../../../../modeHost';
import { sticky, stormingXml } from '../helpers';

/** Page du fichier `xml` ouverte comme dans l'appli (en-têtes des labels retirés). */
function opened(xml: string) {
  const { document, tree } = readDrawio(xml);
  const labelOf = modeHost().host.fileLabels(document.pages, 'import');
  if (labelOf) rewriteLabels(document, tree, labelOf);
  return documentFromTree(tree).pages[0]!;
}

/** Export d'une page faite de ces post-it. */
const exported = (cells: string) => wallExport(opened(stormingXml(cells)));

/** Liens écrits `from type to rule`. */
const links = (cells: string) => exported(cells).links.map((l) => `${l.from} ${l.type} ${l.to} ${l.rule}`);

/** Avertissements écrits `code elements`. */
const warnings = (cells: string) => exported(cells).warnings.map((w) => `${w.code} ${w.elements.join(' ')}`);

describe('mode Event storming : export JSON du mur (sujet 518)', () => {
  it('mur d’exemple : 38 éléments, 3 groupes, 37 liens, 5 avertissements', () => {
    const wall = wallExport(opened(fixture('eventstorming-commande.drawio')));
    expect(wall.groups).toEqual([
      { id: 'G1', label: 'Paiement accepté' },
      { id: 'G2', label: 'Paiement refusé' },
      { id: 'G3', label: 'Rupture de stock' },
    ]);
    expect(wall.elements).toHaveLength(38);
    expect(wall.links).toHaveLength(37);
    const label = (id: string) => wall.elements.find((element) => element.id === id)!.label;
    expect(wall.warnings.map((w) => `${w.code} ${w.elements.map(label).join(' / ')}`)).toEqual([
      'W1 Quand une commande est passée, demander le paiement / Prestataire de paiement',
      'W1 Prestataire de paiement / Quand le paiement est effectué, préparer le colis',
      'W1 Prestataire de paiement / Quand le paiement échoue, prévenir le client',
      'W1 Pas plus que le stock disponible / Commande passée',
      'W2 Quand le stock est réservé, demander le paiement',
    ]);
    // R3 : « Commande passée » mène à « Payer » par la policy, sans lien direct.
    expect(wall.links).toContainEqual({ from: 'G1.P1', to: 'G1.C2', type: 'issues', rule: 'R3' });
    expect(wall.links.filter((link) => link.type === 'causes')).toEqual([]);
    // R5 : la branche de « Passer commande ».
    expect(wall.links.filter((link) => link.from === 'G3.C1' && link.type === 'produces')).toEqual([
      { from: 'G3.C1', to: 'G3.E1', type: 'produces', rule: 'R1' },
      { from: 'G3.C1', to: 'G3.E2', type: 'produces', rule: 'R5' },
    ]);
    expect(wall.elements.find((element) => element.id === 'G1.C2')).toEqual({
      id: 'G1.C2',
      type: 'command',
      label: 'Payer',
      group: 'G1',
      concept: 'command:payer',
    });
  });

  it('type lu sur le kind, préfixes, rangs de haut en bas puis de gauche à droite', () => {
    const wall = exported(
      sticky('q', 'query', 0, 0, 'Q') +
        sticky('a', 'actor', 0, 160, 'A') +
        sticky('c1', 'command', 160, 160, 'C1') +
        sticky('c2', 'command', 160, 0, 'C2') +
        sticky('k', 'constraint', 320, 0) +
        sticky('h', 'hotspot', 320, 160) +
        sticky('s', 'system', 480, 160, '', 160, 160, 'fillColor=#ffb74d;'),
    );
    expect(wall.elements.map((element) => `${element.id} ${element.type} ${element.label}`)).toEqual([
      'G1.R1 read_model Q',
      'G1.C1 command C2',
      'G1.K1 constraint ',
      'G1.A1 actor A',
      'G1.C2 command C1',
      'G1.H1 hotspot ',
      'G1.S1 system ',
    ]);
  });

  it('concept : minuscules, sans accents ni ponctuation ; label sur une ligne', () => {
    expect(normalizedText('  S’abonner au « retour » en stock !  ')).toBe('s abonner au retour en stock');
    expect(normalizedText('Commande refusée : rupture')).toBe('commande refusee rupture');
    const [element] = exported(
      sticky('c', 'command', 0, 0, 'Passer&lt;br&gt;commande') + sticky('a', 'actor', -160, 0),
    ).elements.filter((e) => e.type === 'command');
    expect(element).toMatchObject({ label: 'Passer commande', concept: 'command:passer commande' });
  });

  it('groupes de haut en bas, libellé null sans libellé écrit ; post-it isolé sans groupe (W7)', () => {
    const wall = exported(
      sticky('a', 'actor', 0, 500) +
        sticky('b', 'command', 160, 500, '', 160, 160, 'spatial.es.group=Bas;') +
        sticky('c', 'actor', 0, 0) +
        sticky('d', 'command', 160, 0) +
        sticky('e', 'command', 1000, 1000),
    );
    expect(wall.groups).toEqual([
      { id: 'G1', label: null },
      { id: 'G2', label: 'Bas' },
    ]);
    expect(wall.elements.at(-1)).toMatchObject({ id: 'C1', group: null });
    expect(wall.warnings.filter((w) => w.code === 'W7')).toEqual([
      { code: 'W7', level: 'info', elements: ['C1'], message: 'Post-it isolé' },
    ]);
  });

  it('pivot sur les Domain Events seulement', () => {
    const wall = exported(
      sticky('e1', 'event', 0, 0, '', 160, 160, 'spatial.es.pivot=1;') +
        sticky('e2', 'event', 160, 0, '', 160, 160, 'spatial.es.pivot=0;') +
        sticky('e3', 'event', 320, 0, '', 160, 160, 'spatial.es.pivot=unknown;') +
        sticky('e4', 'event', 480, 0) +
        sticky('c', 'command', 640, 0),
    );
    expect(wall.elements.map((element) => element.pivot)).toEqual([true, false, 'unknown', null, undefined]);
  });

  it('R1 : séquence de gauche à droite ; l’ordre compte', () => {
    expect(links(sticky('a', 'actor', 0, 0) + sticky('c', 'command', 160, 0))).toEqual(['G1.A1 performs G1.C1 R1']);
    expect(links(sticky('e', 'event', 0, 0) + sticky('r', 'query', 160, 0))).toEqual(['G1.E1 feeds G1.R1 R1']);
    // Une Command à gauche d'un Event : produit ; un Event à gauche d'une Command : la cause.
    expect(links(sticky('e', 'event', 0, 0) + sticky('c', 'command', 160, 0))).toEqual(['G1.E1 causes G1.C1 R1']);
    // Policy à droite d'une Command : aucune règle.
    expect(warnings(sticky('c', 'command', 0, 0) + sticky('p', 'policy', 160, 0))).toContain('W1 G1.C1 G1.P1');
  });

  it('R2 : attache de n’importe quel côté, sens donné par les types', () => {
    expect(links(sticky('c', 'command', 0, 0) + sticky('a', 'actor', 0, 160))).toEqual(['G1.A1 performs G1.C1 R2']);
    expect(links(sticky('s', 'system', 0, 0) + sticky('c', 'command', 160, 0))).toEqual(['G1.C1 calls G1.S1 R2']);
    expect(links(sticky('e', 'event', 0, 0) + sticky('s', 'system', 0, 160))).toEqual(['G1.E1 involves G1.S1 R2']);
    expect(links(sticky('r', 'query', 0, 0) + sticky('k', 'constraint', 0, 160))).toEqual(['G1.K1 checks G1.R1 R2']);
    // Actor à droite de la Command : pas de séquence, mais une attache.
    expect(links(sticky('c', 'command', 0, 0) + sticky('a', 'actor', 160, 0))).toEqual(['G1.A1 performs G1.C1 R2']);
  });

  it('seuil de 20 % : en dessous, aucun lien et un W1 ; une demi-hauteur passe', () => {
    expect(links(sticky('a', 'actor', 0, 0) + sticky('c', 'command', 160, 80))).toEqual(['G1.A1 performs G1.C1 R1']);
    expect(links(sticky('a', 'actor', 0, 0) + sticky('c', 'command', 160, 140))).toEqual([]);
    expect(warnings(sticky('a', 'actor', 0, 0) + sticky('c', 'command', 160, 140))).toContain('W1 G1.A1 G1.C1');
    // 20 % du plus petit : un post-it de 40 de haut recouvert sur 10 (25 %).
    expect(links(sticky('a', 'actor', 0, 0) + sticky('c', 'command', 160, 150, '', 160, 40))).toEqual([
      'G1.A1 performs G1.C1 R1',
    ]);
  });

  it('R3 : policy sous son Event, elle émet la Command à droite de l’Event, sans lien direct', () => {
    const cells = sticky('e', 'event', 0, 0) + sticky('p', 'policy', 0, 160) + sticky('c', 'command', 160, 0);
    expect(links(cells)).toEqual(['G1.E1 triggers G1.P1 R2', 'G1.P1 issues G1.C1 R3']);
    // Policy qui a sa Command à droite : rien de plus, le lien direct de l'Event reste s'il ne passe pas par elle.
    expect(links(sticky('e', 'event', 0, 0) + sticky('p', 'policy', 160, 0) + sticky('c', 'command', 320, 0))).toEqual([
      'G1.E1 triggers G1.P1 R1',
      'G1.P1 issues G1.C1 R1',
    ]);
  });

  it('R4 : un hotspot vise un seul voisin, au-dessus d’abord, puis dessous, gauche, droite', () => {
    const around = (hotspot: string) =>
      sticky('n', 'command', 160, 0) +
      sticky('w', 'event', 0, 160) +
      sticky('e', 'policy', 320, 160) +
      sticky('s', 'actor', 160, 320) +
      hotspot;
    expect(links(around(sticky('h', 'hotspot', 160, 160)))).toEqual(['G1.H1 concerns G1.C1 R4']);
    expect(links(sticky('h', 'hotspot', 0, 0) + sticky('e', 'event', 160, 0))).toEqual(['G1.H1 concerns G1.E1 R4']);
    expect(links(sticky('e', 'event', 0, 0) + sticky('h', 'hotspot', 0, 160))).toEqual(['G1.H1 concerns G1.E1 R4']);
    // Ses autres contacts ne donnent pas de W1.
    expect(warnings(around(sticky('h', 'hotspot', 160, 160))).filter((w) => w.includes('H1'))).toEqual([]);
  });

  it('R5 : deux Events empilés, issues de la même Command, sans lien entre eux', () => {
    const cells = sticky('c', 'command', 0, 80) + sticky('e1', 'event', 160, 0) + sticky('e2', 'event', 160, 160);
    expect(links(cells)).toEqual(['G1.C1 produces G1.E1 R1', 'G1.C1 produces G1.E2 R5']);
    // Ni lien ni W1 entre les deux Events (la Command, sans déclencheur, a son W6).
    expect(warnings(cells)).toEqual(['W6 G1.C1']);
    // Deux Events côte à côte : aucune règle.
    expect(
      warnings(sticky('c', 'command', 0, 0) + sticky('e1', 'event', 160, 0) + sticky('e2', 'event', 320, 0)),
    ).toContain('W1 G1.E1 G1.E2');
  });

  it('W2 à W6 et W8', () => {
    expect(warnings(sticky('p', 'policy', 0, 0) + sticky('r', 'query', 160, 0))).toEqual([
      'W1 G1.P1 G1.R1',
      'W2 G1.P1',
      'W3 G1.P1',
    ]);
    expect(warnings(sticky('h', 'hotspot', 0, 0))).toEqual(['W4 H1']);
    expect(warnings(sticky('e', 'event', 0, 0) + sticky('r', 'query', 160, 0))).toEqual(['W5 G1.E1']);
    expect(warnings(sticky('c', 'command', 0, 0) + sticky('s', 'system', 0, 160))).toEqual(['W6 G1.C1']);
    expect(warnings(sticky('a', 'actor', 0, 0) + sticky('c', 'command', 100, 0))).toEqual([
      'W6 C1',
      'W7 A1',
      'W7 C1',
      'W8 A1 C1',
    ]);
  });

  it('exporteur : format JSON, texte indenté de 2', () => {
    expect(eventStormingExporter).toMatchObject({ id: 'json', name: 'JSON' });
    const page = opened(stormingXml(sticky('a', 'actor', 0, 0) + sticky('c', 'command', 160, 0)));
    expect(JSON.parse(eventStormingExporter.export(page))).toEqual(wallExport(page));
    expect(eventStormingExporter.export(page)).toContain('\n  "groups": [');
  });
});
