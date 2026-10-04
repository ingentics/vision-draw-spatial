# Bus ou queue : point de départ du flux

> Itération — mode Séquences et export PlantUML ; reprise de 94

- Une forme d'une page en mode Séquences a un réglage « Type » (`spatial.participant`) : vide (participant, actor ou
  database selon la forme), `bus` ou `queue`. Dans son panneau : liste « Type » (—, Bus, Queue).
- Export PlantUML : un bus ou une queue est déclaré `queue`. Si la première flèche d'un flux va vers un bus ou une
  queue, elle est lue dans l'autre sens : le bus est le point de départ (consommateur d'événement). Les flèches
  suivantes vers un bus restent des envois.
- **Fini quand :** sur `flows.drawio` avec BUS en `bus`, « Sending flow » donne `queue "BUS" as P1 order 1`,
  `P1 -> P2 ++ : Read`, `P2 -> P3 ++ : Send`, `P3 --> P2 --`, `P2 --> P1 --` ; « Inscription flow » garde
  `Enqueue the email` de Notifications vers BUS ; le réglage s'affiche et s'écrit depuis le panneau de la forme ;
  `make check` vert.
- Fait : `flows.ts` (`PARTICIPANT`, `EVENT_SOURCES`), `sequences/index.ts` (réglage de forme « Type », liste générique
  du panneau), `export/plantuml.ts` (`queue` pour un bus ou une queue ; première flèche d'un flux vers l'un d'eux
  retournée avant la pile). Fixture `flows.drawio` : BUS marqué `spatial.participant=bus`. Tests dans
  `tests/engine/modes/sequencesExport.test.ts`. Vérifié dans l'appli : le panneau d'une forme montre « Type » (—, Bus,
  Queue) ; Base passée en Bus est déclarée `queue` et ses flux partent d'elle (puis annulé).
