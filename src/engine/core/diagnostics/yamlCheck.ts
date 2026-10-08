import { parseDocument } from 'yaml';

/**
 * Contrôle d'un texte YAML (sujet 269, ex. corps d'un document RDD) : première erreur du parseur, avec sa position,
 * pour les Diagnostics ; undefined pour un YAML valide (ou vide). Le message du parseur est gardé tel quel (anglais).
 */
export function yamlProblem(text: string): string | undefined {
  const error = parseDocument(text).errors[0];
  if (!error) return undefined;
  // « … at line 2, column 1: » suivi d'un extrait : la position est redite en tête, l'extrait retiré.
  const message = error.message.split('\n')[0]!.replace(/ at line \d+, column \d+:?$/, '');
  const at = error.linePos?.[0];
  return at ? `ligne ${at.line}, colonne ${at.col} : ${message}` : message;
}
