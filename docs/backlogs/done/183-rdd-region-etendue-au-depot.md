# RDD : la région s'étend quand on y dépose une forme qui dépasse

> Milestone — mode RDD ; dépend de 182 (région)

- En fin de déplacement (ou de pose depuis la palette) d'une forme du mode, si son **coin haut-gauche** tombe dans
  une région et que la forme **dépasse** de la région, la région s'agrandit vers la droite et / ou le bas pour la
  contenir avec une **marge de sécurité de 20 px** ; dans la même étape d'annulation que le déplacement.
- Les régions englobantes s'étendent à leur tour si la région étendue les dépasse.
- La région ne rétrécit jamais à cette occasion (le resserrement est au sujet 184).
- **Fini quand :** déposer une table dont le coin est dans la région mais qui en dépasse agrandit la région de
  façon à la contenir avec 20 px de marge ; une annulation défait le déplacement et l'agrandissement ensemble ;
  `make check` vert.
- Fait : `growRegions` (`rdd/regions.ts`, marge `REGION.margin` = 20) : pour chaque forme posée, la région qui la
  contient (`regionOf`, sur les bornes d'origine) est agrandie vers la droite et le bas si la forme en dépasse, puis
  sa région englobante avec la région agrandie, de proche en proche ; jamais rétrécie. Cadre :
  `PageModeDefinition.placed(edit, shapeIds)`, appelé par `PageModes.shapesPlaced` sur la page relue de l'arbre, dans
  la même étape d'annulation : fin d'un déplacement (glisser, flèches du clavier ; formes saisies, sans le contenu
  emporté) et ajout depuis la palette. Tests `rdd.test.ts` (agrandissement, région englobante, rien si la forme tient
  ou est hors région / hors mode). SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : ActiveUsers posée au bord
  de la région la fait grandir à droite et en bas ; ⌘Z défait déplacement et agrandissement ensemble.
