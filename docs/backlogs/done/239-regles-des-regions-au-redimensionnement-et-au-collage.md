# RDD : règles des régions au redimensionnement, à l'ajustement et au collage

> Itération — mode RDD (région) ; reprise de 183, 184, 230, 234, 236

Les règles appliquées à la pose d'une forme (déplacement, flèches du clavier, ajout depuis la palette) valent aussi :

- **Redimensionnement aux poignées** (région ou table) : la forme redimensionnée qui dépasse de sa région l'agrandit,
  dans les quatre directions avec la marge de 20 px, et les régions englobantes suivent (sujets 183, 234) ; l'ordre de
  dessin des régions est remis en place (sujet 230). Le redimensionnement ne déplace toujours pas le contenu.
- **Ajustement `f`** : `f` sur une sous-région l'ajuste, puis ajuste sa région parente à son contenu (sous-région
  ajustée comprise), et ainsi de suite jusqu'à la région de premier niveau : chacune grandit ou rétrécit. Une seule
  étape d'annulation « Ajuster la région ».
- **Collage et duplication** : une région collée ou dupliquée prend la couleur au rang de ses sœurs (sujet 236) ;
  toute forme du mode collée qui dépasse de la région où tombe son coin l'agrandit ; ordre de dessin remis en place.
- Chaque fois dans l'étape d'annulation de l'opération.
- **Fini quand :** agrandir une région enfant aux poignées au-delà de sa parente agrandit la parente ; `f` sur une
  sous-région ajuste aussi toutes ses régions parentes, jusqu'au premier niveau ; une région dupliquée prend la couleur suivante de son niveau ; ⌘Z défait
  chaque opération d'un coup ; `make check` vert.
- Fait : `PageModes.shapesPlaced(pageId, ids, previous?)` prend les bornes d'avant d'une forme (déplacement :
  `-applied` ; redimensionnement : `origin`) et sert aussi à `ResizeDrags.commit` (relecture du modèle si le mode a
  écrit) et au collage / à la duplication (`Clipboard.pasteXml`, comme un ajout). `fitRegion` (`rdd/regions.ts`) ajuste
  la région puis ses parentes jusqu'au premier niveau (bornes déjà ajustées reprises plus haut dans la chaîne) ;
  `colorNewRegion` compte les régions ajoutées dans la même opération une à une (collage de plusieurs régions).
  Tests `rdd.test.ts` (enfant redimensionné au-delà de sa parente, `f` sur une sous-région avec parente trop petite puis
  trop grande, collage de deux régions). SPEC §14.5. Vérifié dans l'appli : duplication d'une région dans une autre
  (rose, parentes agrandies), redimensionnement d'une sous-région au-delà de ses parentes (agrandies au lâcher), `f`
  sur une sous-région qui ramène sa parente autour d'elle.
