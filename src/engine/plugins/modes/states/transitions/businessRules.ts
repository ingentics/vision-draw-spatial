import { edgeTarget, modeText } from '../../../../core/plugins';
import type { EdgeModel, ModeProperty, PageModel } from '../../../../core/plugins';
import { keys } from '../keys';

/**
 * Règles de gestion d'une transition (sujet 528) : texte libre, une règle par ligne, rangé dans `spatial.sm.rules`
 * (`modeText`, comme le contenu d'un état). Rien n'est dessiné sur la flèche : montrées dans l'encart du commentaire au
 * survol, en simulation, et exportées en note PlantUML.
 */
const RULES_TEXT = modeText(keys, 'rules');

/** Règles de la transition, une par ligne, sans les lignes vides. */
export function businessRules(edge: EdgeModel): string[] {
  return RULES_TEXT.read(edge)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Règles dans l'encart du commentaire au survol (`edges.note`), sous le commentaire s'il y en a un, une par puce. */
export function rulesNote(_page: PageModel, edge: EdgeModel): { title: string; text: string } | undefined {
  const rules = businessRules(edge);
  return rules.length === 0 ? undefined : { title: 'Règles de gestion', text: rules.map((r) => `• ${r}`).join('\n') };
}

/** Champ « Règles de gestion » de la section « Transition » du panneau d'une flèche. */
export const RULES_PROPERTY: ModeProperty = {
  type: 'text',
  key: RULES_TEXT.name,
  section: 'Transition',
  label: 'Règles de gestion',
  title:
    'Règles de gestion de la transition, une par ligne (spatial.sm.rules) : montrées pendant la simulation et exportées en note PlantUML ; ⌘ + Entrée pour valider',
  multiline: true,
  value: (_page, target) => {
    const edge = edgeTarget(target);
    return edge && RULES_TEXT.read(edge);
  },
  write: (edit, target, value) => {
    const edge = edgeTarget(target);
    if (edge) edit.setElementAttribute(edge.id, RULES_TEXT.name, RULES_TEXT.value(value ?? ''));
  },
};
