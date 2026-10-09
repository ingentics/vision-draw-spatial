# Longues fonctions des plugins découpées

> Itération — plugins (table du mode RDD, acteurs debout) ; dette vue au sujet 387

- `createTable` (`plugins/modes/rdd/shapes/common/table.ts`, 109 lignes) : découpée par sujet (fonds, traits, textes,
  lignes de champs).
- `standingActor` (`plugins/shapes/general/actors/common/standingActor.ts`, 82 lignes) : fonds et traits de la
  silhouette sortis en fonctions.
- Refactor sans changement de rendu.
- **Fini quand :** aucune des deux ne dépasse ~80 lignes ; tables RDD (entité, vue, document, embedded) et acteurs en
  iso (avec et sans pancarte) inchangés dans l'appli ; `make check` vert.
- Fait : `createTable` (17 lignes) appelle `addFills`, `addStrokes`, `addTexts`, `addRows` ; `standingActor` (55 lignes)
  appelle `silhouetteFill` et `silhouetteStrokes`, traits redressés calculés une fois. Sans changement de rendu :
  vérifié à l'œil (`rdd.drawio` : toutes les sortes de tables ; `orientation.drawio` en iso : acteur à pancarte) et par
  les tests.
