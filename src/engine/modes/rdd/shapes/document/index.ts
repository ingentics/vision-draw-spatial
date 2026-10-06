import { table } from '../common/table';

/**
 * Document JSONB (sujet 181) : document déstructuré mais nommé (colonne JSONB) ; mention `«jsonb»`, clés connues en
 * italique (indicatives). Le nom est obligatoire : vide, la forme affiche « Document » et Diagnostics le signale.
 */
export const definition = table('rdd-document', {
  name: 'Document JSONB',
  order: 4,
  keywords: ['document', 'jsonb', 'json', 'clés'],
  value: 'Document',
  icon: '<path d="M6 3h28v22H6zM6 12h28M15 7.5h10"/><path d="M10 17h12M10 22h9" stroke-dasharray="2 1.5"/>',
});
