# RDD : rangement des fichiers du mode

> Itération — mode RDD (organisation du code) ; après 278.

- À la racine de `src/engine/modes/rdd/`, seul le point d'entrée `index.ts` (lu par le moteur) ; le reste rangé par
  domaine : `tables/` (`fieldModel`, `tableKinds`, `tableLayout`, `tableColors`, `operations`), `editing/`
  (`tableTargets`, `fieldParts`, `fieldHandles`, `fieldProperties`, `tableProperties`), `regions/` (`regions.ts` coupé
  en `regionLayout.ts` et `regionProperties.ts`) ; `shapes/` inchangé. Noms de fichiers gardés.
- `relations/` rangé de même : `index.ts` ne fait qu'exporter ce que le mode utilise ; `relationKinds.ts` (liste des
  sortes, recherche, flèches non permises), `relationFields.ts` (`syncRelations`), `relationProperties.ts`
  (formulaires), `edgeLook.ts` (écriture de la flèche) ; un dossier par sorte dans `kinds/` (`table/`, `embedded/`),
  comme `shapes/`, les types communs dans `kinds/kind.ts`.
- Tests en miroir, déplacés tels quels ; la phrase de `docs/AJOUTER_UN_MODE.md` qui cite les fichiers suit.
- **Fini quand :** la racine du mode ne contient que `index.ts` et des dossiers, celle de `relations/` que son
  `index.ts` d'exports et un fichier par rôle ; aucun test modifié hors imports et déplacement ; même nombre de tests ;
  l'appli charge le mode sur `rdd.drawio` comme avant ; `make check` vert.
- Fait : racine de `src/engine/modes/rdd/` réduite à `index.ts` ; `tables/`, `editing/` et `regions/` comme ci-dessus
  (`regionLayout.ts` : contenu, agrandissement, ajustement, ordre, couleurs ; `regionProperties.ts` : réglage de
  couleur et touche « f »). `relations/` : `index.ts` d'exports (10 lignes) ; `relationKinds.ts` reçoit
  `isRelationEdge`, `forbiddenLinks` et garde `relationIndex` (une recherche) ; `writeRelationEdge` passe dans
  `edgeLook.ts`, seul fichier qui écrit la flèche ; `kinds/table/` (`index.ts` : `tableRelation`, `cardinalities.ts`)
  et `kinds/embedded/index.ts`. Les fichiers hors de `relations/` passent par son `index.ts`, sauf `operations.ts` qui
  importe `edgeLook.ts` directement (l'index le ramènerait par `relationFields.ts`). Tests en miroir (`tables/`,
  `editing/`, `regions/`, `relations/kinds/table/`, `relations/kinds/embedded/`), déplacés tels quels ; le test du
  réglage de couleur d'une région passe dans `regions/regionProperties.test.ts`. `docs/AJOUTER_UN_MODE.md` suit.
  Aucun changement de comportement : mêmes 115 tests du mode, 2018 au total ; dans l'appli, le mode se charge sur
  `rdd.drawio` (définition, réglages de forme et de flèche, touches lus dans la page).
