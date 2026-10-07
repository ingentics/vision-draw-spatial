# RDD : ajouter un champ par une poignée verte

> Milestone — mode RDD (comportements des modèles) ; dépend de 247, 249

- Table sélectionnée : une **poignée verte « + »** sous la table, au milieu ; un clic ouvre un **petit menu** : les
  sept types de 246 (libellés français) ; « Séparateur » s'y ajoutera au 253. Échap ou clic ailleurs ferme le menu
  sans rien ajouter.
- Les poignées de connexion du haut et du bas sont masquées sur les tables (le « + » prend la place de celle du bas) ;
  celles de gauche et de droite restent.
- Choisir un type ajoute un champ `property` de ce type, non nullable, nommé `Field1`, `Field2`… (premier numéro libre
  dans la table), après le champ sélectionné, sinon en fin de liste (jamais avant la clé primaire) ; il est
  sélectionné et son label passe en édition. Le type ne se modifie plus ensuite.
- La table grandit d'une ligne (247) ; une étape d'annulation.
- Le champ texte « Champs » du panneau disparaît (remplacé par l'édition sur la forme).
- **Fini quand :** trois ajouts depuis le menu donnent `Field1`, `Field2`, `Field3` avec le type choisi (en gris),
  la table grandit, ⌘Z les retire un à un ; le panneau n'a plus de zone « Champs » ; `make check` vert.
- Fait : cadre des **poignées de mode** : `PageModeDefinition.handles` / `handleChosen`, `ModeHandle` (point de page
  et décalage en pixels écran, couleur, titre, choix) ; domaine `core/modes/modeHandles.ts` (poignées de la forme
  sélectionnée seule et modifiable, poignée sous le pointeur, clic → événement `modeHandleMenu`, choix →
  `Engine.chooseModeHandle` : opération du mode au titre de la poignée, puis sélection de la partie renvoyée et
  édition de son texte) ; dessin `modeHandleMeshes` (`render/handleMeshes.ts`, disque de la couleur, « + » blanc) ;
  clic pris avant la sélection, curseur main et aide au survol (`PointerInput`). Appli : `HandleMenu.tsx` (menu sous
  la poignée, flèches haut / bas, Échap et clic ailleurs le ferment), branché dans `Viewer`. Côtés des poignées de
  connexion par forme : `ShapeDefinition.connectSides` (`registry.connectSides`, suivi au dessin et au clic) ; tables
  RDD `['e', 'w']`. RDD : `rdd/fieldHandles.ts` (« + » vert `#2e9e44` au milieu du bas, 18 px dessous, menu des sept
  types), `addField` et `newFieldLabel` (`operations.ts`). Zone « Champs » du panneau retirée, avec `setFields` et
  `fieldsText` (les tests posent leurs champs par un utilitaire local). L'entrée « Séparateur » du menu est reportée
  au 253. Tests `rdd.test.ts` (poignée, choix, côtés de connexion, Field1…3 du type choisi, insertion après le champ
  sélectionné et jamais avant la clé primaire, premier numéro libre ; réglages du panneau sans « Champs »). SPEC
  §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : Orphan sélectionnée → poignées de connexion gauche et droite
  seulement, « + » vert en bas au milieu ; menu des sept types ; « Booléen » → `Field1` en édition, renommé
  `is_active` (type en gris) ; « Money » → `Field1` de nouveau (numéro libéré) ; « Nombre réel » → `Field2`, ⌘Z le
  retire. Pendant l'édition qui suit un ajout, les textes de la page disparaissent environ une seconde (le temps de
  redessiner les textes de la scène reconstruite).
