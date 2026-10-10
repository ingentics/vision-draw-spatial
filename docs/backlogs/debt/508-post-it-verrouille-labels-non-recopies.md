# Post-it verrouillé : réglage « Labels » jamais recopié

> Dette vue à l'audit 500 (reprise de 475) — mode Event storming

- `syncLabels` (`labels/pageLabels.ts:18`) recopie `spatial.es.labels` par `setElementAttribute`, que
  `modeEditWriter.ts:117` ignore sur un élément verrouillé : un post-it verrouillé garde son label quand la page les
  masque, et l'export (`showsLabel`) suit cette copie fausse. Choix à faire : écriture d'une clé du mode permise sur
  un élément verrouillé, ou dessin qui lit le réglage de la page.
