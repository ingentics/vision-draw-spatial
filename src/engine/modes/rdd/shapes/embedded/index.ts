import { table } from '../common/table';

/** Embedded (sujet 181) : objet incorporé dans une entité, sans table propre ; mention `«embedded»`, bordure en tirets. */
export const definition = table('rdd-embedded', {
  name: 'Embedded',
  order: 3,
  keywords: ['embedded', 'incorporé', 'objet', 'value object'],
  value: 'Embedded',
  icon: '<path d="M6 3h28v22H6zM6 12h28M10 17h12M10 22h9M15 7.5h10" stroke-dasharray="3 2"/>',
});
