# Texte et Titre dans la palette du mode RDB Designer

> Itération — mode RDB Designer (palette)

- Les formes existantes `text` (Texte) et `title` (Titre) sont proposées dans la palette du mode, après les tables et
  la région.
- **Fini quand :** sur une page RDB Designer, la palette propose Texte et Titre et on peut les poser ; leur rendu et
  leur style dans le fichier sont inchangés.
- Fait : `text` et `title` ajoutés à `palette.shapes` du mode (`rdd/index.ts`, test `rdd/index.test.ts`). Ils restent dans la catégorie « general », qui apparaît donc dans la palette du mode. Validé à l'œil dans l'appli.
