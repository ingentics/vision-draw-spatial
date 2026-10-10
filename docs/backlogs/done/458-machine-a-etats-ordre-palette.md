# Machine à états : ordre des formes dans la palette

> Itération — palette du mode Machine à états

- Ordre des formes de la catégorie « États » : état, ensemble, point d'entrée, point de sortie (l'ensemble passe de la
  4e à la 2e place).
- **Fini quand :** sur une page en mode Machine à états, la palette montre état, ensemble, point d'entrée, point de
  sortie dans cet ordre.
- Fait : `palette.order` des formes du mode passé à état 1, ensemble 2, point d'entrée 3, point de sortie 4
  (`states/shapes/*/index.ts`) ; liste blanche de la palette (`states/index.ts`) et son test remis dans le même ordre.
  `make check` vert ; ordre validé dans l'appli par l'utilisateur.
