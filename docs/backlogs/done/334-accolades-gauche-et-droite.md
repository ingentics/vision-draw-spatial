# Accolades gauche et droite dans « Général »

> Itération — formes (palette « Général »)

- Deux nouveaux éléments dans la catégorie « Général », comme dans la palette Général de draw.io : « Accolade gauche »
  et « Accolade droite » (`shape=curlyBracket`), 20 × 120 px, tracé ouvert (sans fond), coins arrondis.
  - gauche : `shape=curlyBracket;whiteSpace=wrap;html=1;rounded=1;labelPosition=left;verticalLabelPosition=middle;align=right;verticalAlign=middle;`
  - droite : même style avec `flipH=1;labelPosition=right;align=left;` (texte à droite de l'accolade).
- Tracé de draw.io (`mxCurlyBracket`) : polyligne ouverte (bord droit, tige verticale à `size` × largeur du bord droit,
  `size` = 0,5 par défaut, pointe au milieu du bord gauche), coins arrondis par `rounded=1` (`mxShape.addPoints`).
  `flipH=1` la retourne. Le rendu reconnaît les deux selon `flipH`.
- Fixture `tests/fixtures/curly-brackets.drawio` : gauche, droite avec texte, et une grande accolade `size=0.3`.
- **Fini quand :** les deux accolades se posent depuis la palette, se redimensionnent et se retrouvent à la
  réouverture dans le même sens ; elles s'ouvrent identiques dans draw.io (`make drawio-check`) ; `make check` vert.
- Fait : formes `curly-bracket-left` et `curly-bracket-right` (`shapes/general/`), catégorie « Général », ordres 120 et
  121 ; tracé de `mxCurlyBracket` (polyligne ouverte, coins arrondis par `rounded=1`, `size` réglable), reconnues selon
  `flipH`, rendu à plat seulement (pas d'iso ni de volume). Fixture `tests/fixtures/curly-brackets.drawio` ;
  `palette.test.ts` mis à jour (kind `curlyBracket`, catégorie Général). Vérifié dans l'appli (gauche, droite avec
  texte, grande accolade `size=0.3`) et par `make drawio-check` (draw.io réenregistre le style sans changement, tracé
  comparé à l'export SVG) ; `make check` vert.
