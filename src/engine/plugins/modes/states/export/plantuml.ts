import { PLANTUML_FORMAT, byId, plantUmlLine, plantUmlQuoted } from '../../../../core/plugins';
import type { EdgeModel, PageModel, ShapeModel } from '../../../../core/plugins';
import { compositeOf } from '../composites/compositeLayout';
import { ERROR_COLOR, isErrorExit } from '../exits/exitKind';
import { isComposite, isFinal, isInitial, isStateLike } from '../kinds';
import { bodyLines } from '../state/stateLayout';
import { stateBody } from '../state/bodyText';
import { transitionEnds } from '../transitions/transitionRules';

/**
 * Page du mode Machine à états en diagramme d'états PlantUML (sujet 436).
 *
 * Chaque état et ensemble a un alias `S1`, `S2`… dans l'ordre de dessin ; un titre qui est un identifiant simple et
 * unique sert de nom, sinon l'état est déclaré `state "Titre" as Sn`. Un ensemble est un bloc `state … { … }` qui
 * contient ses états, ses ensembles et les transitions écrites à son niveau. Points d'entrée et de sortie s'écrivent
 * `[*]` au niveau de l'ensemble qui les contient (PlantUML lie `[*]` au bloc où il est écrit) : plusieurs points de
 * sortie d'un même niveau ne font qu'un. Une transition entre deux états est écrite au niveau du plus petit ensemble qui
 * contient ses deux bouts, en rouge vers une sortie en erreur. Une transition refusée ou à bout libre (Diagnostics, sujet 434) n'est pas écrite.
 */

/** Indentation d'un niveau d'ensemble. */
const INDENT = '  ';

/** Identifiant PlantUML écrit sans guillemets ; `S<n>` est réservé aux alias. */
const SIMPLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ALIAS = /^S\d+$/;

/** Niveau d'écriture : un ensemble (son id), ou la page (undefined). */
type Level = string | undefined;

interface Transition {
  level: Level;
  /** Depuis un point d'entrée : écrite avant les autres de son niveau. */
  initial: boolean;
  /** États et ensembles qu'elle nomme. */
  nodes: string[];
  line: string;
}

/** Ensembles qui contiennent `shape`, du plus proche au plus lointain. */
function ancestorsOf(page: PageModel, shape: ShapeModel): string[] {
  const chain: string[] = [];
  for (let parent = compositeOf(page, shape); parent && !chain.includes(parent.id); parent = compositeOf(page, parent))
    chain.push(parent.id);
  return chain;
}

/** Plus petit ensemble qui contient les deux bouts (un bout n'est pas son propre contenant : boucle sur un ensemble). */
function commonLevel(page: PageModel, a: ShapeModel, b: ShapeModel): Level {
  const outer = new Set(ancestorsOf(page, b));
  return ancestorsOf(page, a).find((id) => outer.has(id));
}

export function statesPlantUml(page: PageModel): string {
  const nodes = page.shapes.filter(isStateLike).sort((a, b) => a.z - b.z);
  const titles = new Map<string, number>();
  for (const node of nodes) titles.set(node.label.trim(), (titles.get(node.label.trim()) ?? 0) + 1);
  /** Alias de chaque état, et le nom qui le désigne dans les transitions (son titre s'il est simple). */
  const aliases = new Map(nodes.map((node, i) => [node.id, `S${i + 1}`]));
  const simple = (node: ShapeModel) => {
    const title = node.label.trim();
    return SIMPLE_NAME.test(title) && !ALIAS.test(title) && titles.get(title) === 1;
  };
  const ref = (node: ShapeModel) => (simple(node) ? node.label.trim() : aliases.get(node.id)!);
  const levelOf = (shape: ShapeModel): Level => compositeOf(page, shape)?.id;

  const transitions: Transition[] = [...page.edges]
    .sort((a, b) => a.z - b.z)
    .flatMap((edge) => {
      const ends = transitionEnds(page, edge);
      if (!ends) return [];
      const { source, target } = ends;
      const initial = isInitial(source);
      const level = initial ? levelOf(source) : isFinal(target) ? levelOf(target) : commonLevel(page, source, target);
      const from = initial ? '[*]' : ref(source);
      const to = isFinal(target) ? '[*]' : ref(target);
      const nodes = [source, target].filter(isStateLike).map((node) => node.id);
      // Vers une sortie en erreur : flèche rouge.
      const arrow = isErrorExit(target) ? `-[${ERROR_COLOR}]->` : '-->';
      return [{ level, initial, nodes, line: `${from} ${arrow} ${to}${transitionName(edge)}` }];
    });
  /** États nommés par une transition : un état de la page au nom simple et sans contenu n'a pas à être déclaré. */
  const named = new Set(transitions.flatMap((transition) => transition.nodes));
  /**
   * Cibles d'un point d'entrée d'un autre niveau (sujet 446) : PlantUML crée un état à sa première mention, dans le bloc
   * où il la lit ; déclarées avant (elles et les ensembles qui les contiennent), elles restent à leur niveau.
   */
  const early = new Set(
    transitions
      .filter((transition) => transition.initial)
      .flatMap((transition) => transition.nodes.filter((id) => levelOf(byId(nodes, id)!) !== transition.level)),
  );
  const comesEarly = (node: ShapeModel) =>
    [...early].some((id) => id === node.id || ancestorsOf(page, byId(nodes, id)!).includes(node.id));

  const declaration = (node: ShapeModel): string[] => {
    const name = ref(node);
    const header = simple(node) || !node.label.trim() ? name : `${plantUmlQuoted(node.label)} as ${name}`;
    if (isComposite(node)) {
      const inner = levelLines(node.id);
      return inner.length === 0 ? [`state ${header}`] : [`state ${header} {`, ...inner.map((l) => INDENT + l), '}'];
    }
    const content = bodyLines(stateBody(node))
      .filter((line) => line.trim())
      .map((line) => `${name} : ${plantUmlLine(line)}`);
    // Au nom simple, une ligne de contenu le déclare ; sans contenu, une transition de la page suffit. Dans un
    // ensemble, il est toujours déclaré : sinon PlantUML le créerait au niveau de sa première transition.
    // Visé depuis un point d'entrée d'un autre niveau, il est déclaré ici, avant d'y être nommé.
    const namedHere = levelOf(node) === undefined && named.has(node.id) && !early.has(node.id);
    if (simple(node) && (content.length > 0 || namedHere)) return content;
    return [`state ${header}`, ...content];
  };

  /**
   * Lignes d'un niveau : déclarations (cibles d'un point d'entrée d'un autre niveau d'abord), transitions depuis les
   * points d'entrée, puis les autres.
   */
  function levelLines(level: Level): string[] {
    const here = transitions.filter((transition) => transition.level === level);
    const declared = nodes.filter((node) => levelOf(node) === level);
    return [
      ...[...declared.filter(comesEarly), ...declared.filter((node) => !comesEarly(node))].flatMap(declaration),
      ...here.filter((transition) => transition.initial).map((transition) => transition.line),
      ...here.filter((transition) => !transition.initial).map((transition) => transition.line),
    ];
  }

  return ['@startuml', ...levelLines(undefined), '@enduml', ''].join('\n');
}

/** ` : nom` d'une transition nommée (texte du milieu de la flèche), rien sinon. */
function transitionName(edge: EdgeModel): string {
  const name = plantUmlLine(edge.label);
  return name ? ` : ${name}` : '';
}

/** Export PlantUML de la page, pour la fenêtre d'export commune de l'appli (format et texte). */
export const statesExporter = { ...PLANTUML_FORMAT, export: statesPlantUml };
