# Flèche vers un champ en ancrage automatique et Typon

> Itération — cœur (ancrage des flèches) et mode RDD ; reprise de 333 et 269

En ancrage manuel, une flèche document → champ dynamique arrive bien sur la ligne du champ. En automatique et en
Typon, la répartition des bouts sur les côtés (`distributeAnchors`, SPEC §14.1) réécrit juste après le point
d'arrivée posé par le mode : la flèche arrive à 1/(n+1)… du côté, pas sur la ligne du champ.

- **API des modes** : `edges.placedEntries?(page)` — flèches dont le mode place lui-même le point d'arrivée
  (partie visée, sujet 333) ; une seule lecture par répartition, pas une par flèche. L'ancrage automatique et Typon ne répartissent pas ce bout (comme un point fixe
  à l'intérieur d'une forme) ; le tracé qui contourne formes et flèches part bien de ce point.
- **RDD** : les flèches retenues par un champ (`Field.incoming`, relation document → champ dynamique).
- Les autres bouts du même côté restent répartis à (k + 1) / (n + 1) sans tenir compte de ce point.
- **Fini quand :** sur une page en ancrage automatique puis en Typon, une flèche tirée d'un document vers un champ
  « Dynamique » arrive à hauteur du champ et y reste quand on déplace le document, le champ, ou qu'on fait « Autre
  agencement » (F) ; tests de `distributeAnchors` et du mode ; `make check` vert.
- Fait : nouveau point d'entrée de mode `edges.placedEntries(page)` (`core/modes/types.ts`), lu par
  `PageModes.placedEntries` (clés `endKey` des bouts d'arrivée, aucune si le mode est en panne) et passé par
  `EdgeArrangement.tracing` à `arrangeAnchors` / `distributeAnchors` (option `kept` : bouts ni déplacés ni comptés) ;
  vaut pour toutes les répartitions (après édition, aperçu pendant un glisser, Autre agencement, changement d'ancrage).
  RDD : `arrivalEdges` (flèches retenues par un champ, `storedArrivals`). Docs : SPEC §14.1 et §14.5,
  `AJOUTER_UN_MODE.md` (contrat et table des garanties). Tests : `distribute.test.ts`, `pageModes.test.ts`,
  `kinds/document/index.test.ts`. Vu dans l'appli sur `rdd-document.drawio` : en automatique, flèche tirée de
  Legacy vers `payload` de Kind arrivée sur la ligne, qui y reste quand on déplace Legacy ; en Typon, les deux
  flèches arrivent sur `settings` et `payload` ; « Autre agencement » (F) les y laisse. Écart : les autres bouts du
  même côté restent répartis sans tenir compte de ce point (ils peuvent tomber dessus).
