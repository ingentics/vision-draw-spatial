import { taggedProcess } from '../../generic/tagged-process';

/** Process étiqueté : process à tranche, mot « PROCESS » par défaut, à saisir dans le panneau (`spatial.tag`). */
export const definition = taggedProcess('labeled-process', 'PROCESS', {
  name: 'Process étiqueté',
  order: 89,
  keywords: ['process', 'étiquette', 'tranche', 'label', 'tag', 'composant', 'générique'],
});
