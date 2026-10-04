# Copier, couper, coller et dupliquer

> Itération — édition (sélection) ; s'appuie sur la sélection multiple (SPEC §11.1) et la pile d'annulation (`edit/undo.ts`)

- **Raccourcis**, comme draw.io : ⌘/Ctrl + C copie la sélection, ⌘/Ctrl + X la coupe, ⌘/Ctrl + V colle,
  ⌘/Ctrl + D duplique (copier + coller sans toucher au presse-papier). Inactifs pendant l'édition d'un texte (le
  copier-coller du texte reste celui du navigateur) et sur une page non modifiable.
- **Ce qui est copié** : les éléments sélectionnés avec leurs descendants (un conteneur emporte son contenu), et les
  flèches dont les deux extrémités sont copiées. Une flèche sélectionnée dont une extrémité n'est pas copiée garde
  ce bout en point libre, à sa position actuelle (comme draw.io).
- **Ce qui est collé** : de nouvelles cellules (nouveaux `id` uniques dans le fichier), styles, textes, liens et
  points de passage conservés ; les flèches internes sont rebranchées sur les copies. Collées sur la page
  courante, dans le même parent que l'original s'il existe sur cette page, sinon à la racine.
- **Position** : décalée de la taille de grille (`gridSize`, 10 par défaut) par rapport à l'original, et d'un pas de
  plus à chaque collage successif du même contenu (comme draw.io). Après le collage, la sélection devient les
  éléments collés.
- **Presse-papier système** : le contenu est écrit au format draw.io (`<mxGraphModel>` XML) pour qu'un collage dans
  draw.io fonctionne, et un `<mxGraphModel>` copié depuis draw.io se colle dans l'appli. Repli sur un presse-papier
  interne si l'API presse-papier est refusée. Fonctionne aussi d'une page à l'autre du même fichier.
- **Annulation** : un collage, une coupe ou une duplication = une seule étape d'annulation (libellé « Coller »,
  « Couper », « Dupliquer »).
- **Fini quand :** dans l'appli, copier-coller une forme, un groupe de formes reliées et un conteneur avec son
  contenu crée des copies décalées de 10, reliées entre elles et sélectionnées ; un deuxième collage décale encore ;
  couper retire la sélection et la recolle ; ⌘ + Z annule en un pas ; coller sur une autre page marche ; un
  copier depuis l'appli se colle dans draw.io et inversement (`make drawio-check` sur le fichier enregistré) ; tests
  (nouveaux `id`, flèches rebranchées, bout libre, décalage) ; `make check` vert.
- Fait : `src/engine/format/clipboard.ts` (`copyCells` : sélection + descendants + flèches entre éléments
  copiés, cellules du haut sur le calque en coordonnées absolues, bout non copié → `sourcePoint` / `targetPoint`
  à sa position dessinée ; `readClipboardModel` : XML en clair, encodé en URI, compressé ou `<mxfile>` ;
  `pasteCells` : nouveaux id, parents / source / cible remappés, décalage des seules cellules du haut, recollage
  dans le conteneur d'origine sur la même page). `Engine` : `copySelection`, `cutSelection`, `paste`,
  `duplicateSelection` (une étape d'annulation « Coller », « Couper », « Dupliquer » ; éléments collés
  sélectionnés ; décalage d'un pas de grille de plus à chaque collage, 0 au premier collage après une coupe).
  `Viewer.tsx` : événements `copy` / `cut` / `paste` (texte `text/plain` au format `<mxGraphModel>`), ⌘/Ctrl + D,
  repli sur le presse-papier interne si le navigateur n'émet pas l'événement natif ; rien n'est intercepté dans un
  champ ou sur un texte sélectionné. Tests : `tests/engine/format/clipboard.test.ts`. Vérifié dans l'appli :
  collages successifs décalés de 10, ⌘D, ⌘X puis ⌘V à la place d'origine, ⌘Z en un pas, contenu draw.io externe
  (deux formes + flèche) collé puis recopié sur une autre page avec la flèche rebranchée ; un fichier contenant
  les cellules collées est relu et exporté en SVG par draw.io. Non vérifié : un collage interactif dans
  l'éditeur draw.io (le format écrit est celui que draw.io lit au collage, XML en clair).
