import { taggedProcess } from '../../generic/tagged-process';

/** Tâche récurrente : process à tranche « CRON ». */
export const definition = taggedProcess('recurring-task', 'CRON', {
  name: 'Tâche récurrente',
  order: 88,
  keywords: ['tâche', 'récurrente', 'recurring', 'cron', 'planifiée', 'scheduled', 'batch', 'périodique'],
});
