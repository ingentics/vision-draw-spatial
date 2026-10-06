# RDD : entité et entité énumérative

> Milestone — mode RDD ; dépend de 179 (modèle abstrait)

- **Entité** (`rdd-entity`, étend le modèle) : même rendu que le modèle sans `«abstract»` ni italique. Elle a
  **toujours un champ `id` en tête** : créé avec `spatial.fields=["id"]` ; `id` est affiché en premier, souligné
  (clé primaire), et ne peut être ni retiré ni déplacé (le panneau le montre sans le rendre modifiable) ; s'il manque
  à la lecture (fichier modifié), il est rajouté à l'affichage et signalé dans Diagnostics (`check`).
- **Entité énumérative** (`rdd-enum`, étend l'entité) : mention `«enum»` au-dessus du nom ; champ `id` en tête
  comme l'entité ; les lignes suivantes sont ses valeurs (même stockage `spatial.fields`).
- Couleur d'entête et table secondaire hérités du modèle.
- **Le modèle abstrait n'est plus dans la palette** : il n'est jamais posé tel quel, c'est la base technique dont les
  autres tables héritent (code commun). Un `rdd-model` déjà dans un fichier reste dessiné et réglable.
- Palette RDD : « Entité », « Entité énumérative ».
- **Fini quand :** la palette RDD ne propose que « Entité » et « Entité énumérative » (plus de modèle abstrait) ; les
  deux formes se posent depuis la palette RDD avec `id` en tête (souligné), non supprimable ;
  l'énumération porte `«enum»` ; couleur et table secondaire fonctionnent comme sur le modèle ; un fichier sans
  `id` est signalé dans Diagnostics ; `make check` vert.
- Fait : `TABLE_KINDS` gagne `rdd-entity` (`primaryKey`) et `rdd-enum` (`«enum»`, `primaryKey`) ; formes
  `rdd/shapes/entity/` et `rdd/shapes/enum/` (palette « Entité », « Entité énumérative », nées avec
  `spatial.fields=["id"]`, entête 26 / 38 px) ; `table(id)` sans palette pour le modèle abstrait, qui sort de la
  palette (reste dessiné et réglable dans un fichier). Clé primaire : `tableFields` la ramène en tête (soulignée au
  rendu), `setFields` la garde en tête et « Champs » ne montre que la suite ; champ « Clé primaire » en lecture
  seule (`ModeProperty.readOnly`) ; `check` du mode signale une clé absente ou déplacée (`misplacedPrimaryKey`).
  Fixture `rdd.drawio` : entité, énumération, entité sans `id` (réenregistrée par draw.io 24.7.5). Tests
  `tests/engine/modes/rdd.test.ts`. Docs : SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : palette réduite
  aux deux entités, pose d'une entité avec `id`, `«enum»`, `id` souligné, clé primaire en lecture seule, entité sans
  `id` signalée dans Diagnostics.
