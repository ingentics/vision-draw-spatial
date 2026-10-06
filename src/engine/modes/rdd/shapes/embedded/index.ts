import { table } from '../common/table';

/** Embedded (sujet 181) : objet incorporé dans une entité, sans table propre ; bordure en tirets. */
export const definition = table('rdd-embedded', {
  name: 'Embedded',
  order: 3,
  keywords: ['embedded', 'incorporé', 'objet', 'value object'],
  value: 'Embedded',
  icon: '<path d="M6 3h28v22H6zM6 10h28M10 15h12M10 20h9" stroke-dasharray="3 2"/>',
});
