# Flèches dans la palette « Général »

> Milestone — Palette. Catégorie « Général » (`plugins/shapes/categories.ts`). Voir aussi 321 (réglages des flèches créées).

- Aujourd'hui, une flèche ne se crée qu'en la tirant depuis une forme. On veut aussi la **poser depuis la palette**,
  dans la catégorie « Général », comme dans la barre latérale de draw.io (flèche libre : aucune extrémité attachée,
  `edge="1"` avec `sourcePoint` et `targetPoint`).
- **Par défaut** (clic sur l'entrée de la palette, ou Entrée) : la flèche est posée **au centre de la vue**, c'est-à-dire
  à l'endroit visible à l'écran, comme les formes (« clic = centre de la vue »). Le glisser-déposer la dépose au point
  visé, au sol (vue de dessus comme iso).
- Style et taille : ceux des flèches créées d'ordinaire (`shapes.edgeEndTextSize` pour les textes, tracé par défaut,
  bout de fin en flèche pleine) ; longueur par défaut à fixer en suivant draw.io (flèche libre horizontale de 100 px
  environ, alignée sur la grille).
- La flèche posée est sélectionnée, ses deux bouts sont libres et se rattachent à une forme en les déplaçant dessus
  (comportement actuel des bouts de flèche).
- Elle est cherchable (recherche de la palette) et apparaît dans « Utilisées » une fois sur la page.
- **Fini quand :** dans l'appli, un clic sur la flèche de « Général » en pose une au centre de la vue, un
  glisser-déposer la pose au point visé, et on peut la rattacher à des formes ; fixture avec une flèche libre ;
  `make drawio-check` : le fichier enregistré s'ouvre et s'exporte dans draw.io avec la flèche au même endroit.
- Fait : nouvelle forme-modèle `plugins/shapes/general/arrow/` (« Flèche », après l'Actor), dont l'élément de palette
  porte `edge: true` (`PaletteEntry`, `core/shapes/types.ts`) : ce n'est pas une forme (`matches` ne reconnaît aucun
  sommet), donc elle n'apparaît pas dans « Utilisées ». `ElementCommands.addShape` crée alors une arête libre
  (`addFreeEdge`, `domains/edit/commands/elements.ts`) : `addEdgeCell` accepte des bouts sans cellule, puis
  `setEdgeTerminal` écrit `sourcePoint` et `targetPoint` (100 px, horizontale, centrée sur le point de dépôt, aimantée
  à la grille) ; style `endArrow=classic;` + tracé du réglage `shapes.edgeLineStyle` (celui des flèches créées), puis
  la flèche est sélectionnée. Clic = centre de la vue, glisser-déposer = point visé (chemin existant).
  Tests : `create.test.ts` (flèche libre), tests de palette adaptés (une entrée `edge` n'est pas une forme).
  Fixture `tests/fixtures/free-arrow.drawio`. Vérifié à l'œil sur le serveur partagé : clic sur « Flèche » → flèche
  au centre, sélectionnée. **Non fait : `make drawio-check` (draw.io non lancé ici).**
