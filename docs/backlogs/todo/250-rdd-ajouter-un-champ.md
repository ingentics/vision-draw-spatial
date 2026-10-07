# RDD : ajouter un champ par une poignée verte

> Milestone — mode RDD (comportements des modèles) ; dépend de 247, 249

- Table sélectionnée : une **poignée verte « + »** sous la dernière ligne ; un clic ouvre un **petit menu** : les sept
  types de 246 (libellés français), un trait, puis « Séparateur » (253). Échap ou clic ailleurs ferme le menu sans
  rien ajouter.
- Choisir un type ajoute un champ `property` de ce type, non nullable, nommé `Field1`, `Field2`… (premier numéro libre
  dans la table), après le champ sélectionné, sinon en fin de liste (jamais avant la clé primaire) ; il est
  sélectionné et son label passe en édition. Le type ne se modifie plus ensuite.
- La table grandit d'une ligne (247) ; une étape d'annulation.
- Le champ texte « Champs » du panneau disparaît (remplacé par l'édition sur la forme).
- **Fini quand :** trois ajouts depuis le menu donnent `Field1`, `Field2`, `Field3` avec le type choisi (en gris),
  la table grandit, ⌘Z les retire un à un ; le panneau n'a plus de zone « Champs » ; `make check` vert.
