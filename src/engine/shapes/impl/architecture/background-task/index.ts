import { taggedProcess } from '../../../generic/tagged-process';

/** Tâche de fond : process à tranche « TASK ». */
export const definition = taggedProcess('background-task', 'TASK', {
  name: 'Tâche de fond',
  order: 86,
  keywords: ['tâche', 'fond', 'background', 'worker', 'job', 'daemon', 'asynchrone', 'async'],
});
