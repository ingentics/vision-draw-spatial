import { table } from '../common/table';

/**
 * Document (sujets 181, 218) : document JSONB, déstructuré mais nommé ; coin plié en haut à droite, clés connues en
 * italique (indicatives). Le nom est obligatoire : vide, la forme affiche « Document » et Diagnostics le signale.
 */
export const definition = table('rdd-document', {
  name: 'Document',
  order: 4,
  keywords: ['document', 'jsonb', 'json', 'clés'],
  value: 'Document',
  icon: '<path d="M6 3h22l6 6v16H6zM6 10h28M28 3v6h6"/><path d="M10 15h12M10 20h9" stroke-dasharray="2 1.5"/>',
});
