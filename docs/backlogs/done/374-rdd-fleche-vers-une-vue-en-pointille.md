# RDD : toute flèche vers une vue en pointillé

> Itération — mode RDD (relations) ; reprise de 272 et 278

- Règle générale : une flèche de relation qui arrive sur une vue (`rdd-view`) est en pointillé
  (`dashed=1;dashPattern=1 2`, le bouton « Pointillés » de draw.io), quelle que soit sa sorte. C'est l'écriture de la
  flèche (`writeEdgeLook`) qui l'impose, pas chaque sorte : une sorte future vers une vue n'a rien à déclarer.
- La relation source → vue (sujet 272) ne déclare plus ses tirets elle-même : elle passe des tirets au pointillé.
- **Fini quand :** sur une page RDD, une flèche entité → vue ou vue → vue est en pointillé, et l'est encore après
  rechargement ; une sorte de test vers une vue, sans `dashed`, est écrite en pointillé ; ouverte dans draw.io, la
  flèche y est en pointillé ; `make check` vert.
- Fait : `writeEdgeLook` (`relations/edgeLook.ts`) écrit `dashed=1` et `dashPattern=1 2` sur toute flèche de relation
  dont l'arrivée est une vue, et retire `dashPattern` des autres ; la sorte source → vue (`kinds/viewSource`) ne
  déclare plus `dashed`. Changement visible : les flèches source → vue passent des tirets au pointillé (réécrites à
  l'ouverture de la page). Tests dans `relations/index.test.ts` (sorte de test vers une vue, source → vue, flèche
  entre tables non touchée). Vérifié par les tests seulement ; pas de contrôle à l'œil ni dans draw.io.
