import { taggedProcess } from '../../generic/tagged-process';

/** Event consumer : process à tranche « CONSUMER ». */
export const definition = taggedProcess('event-consumer', 'CONSUMER', {
  name: 'Event consumer',
  order: 84,
  keywords: ['event', 'événement', 'consumer', 'consommateur', 'listener', 'subscriber', 'message'],
});
