# RDD : région qui emporte son contenu

> Milestone — mode RDD ; dépend de 179

- **Région** (`rdd-region`, palette « Région ») : rectangle à fond très léger (couleur de la palette de l'appli,
  réglable, ≈ 10 % d'opacité) et bordure fine, **label en haut à gauche** (gras, hors des tables) ; dessinée
  derrière les tables (posée au fond de la pile).
- **Contenu** d'une région : les formes du mode dont le **coin haut-gauche** est dans la région (calculé, rien
  d'écrit dans le fichier ; pas de parent draw.io, pour garder des coordonnées absolues et un fichier simple). Une
  région peut en contenir une autre (même règle) ; une forme dans deux régions imbriquées appartient à la plus
  petite.
- **Déplacer la région déplace son contenu** (tables, régions incluses et flèches entre elles, comme un groupe),
  en une étape d'annulation ; redimensionner ne déplace rien.
- Dans draw.io, la région est un rectangle (`rounded=0;fillColor=…;opacity=…;align=left;verticalAlign=top;
  spatial.kind=rdd-region`) : son contenu n'y suit pas ses déplacements.
- **Fini quand :** une région posée sous trois tables les emporte quand on la déplace (flèches comprises), puis
  l'annulation remet tout en place ; une table dont le coin haut-gauche est hors de la région ne suit pas ;
  `make check` vert.
- Fait : forme `rdd/shapes/region/` (`rdd-region`, palette « Région » après les tables, 400 × 260) : rectangle
  `fillColor` de la palette à `fillOpacity=10` (plutôt que `opacity`, qui estomperait aussi label et bordure dans
  draw.io), bordure de la couleur assombrie (× 0,6, `strokeColor`), label gras en haut à gauche ; posée au fond de la
  pile (`PaletteEntry.atBack`, `reorderCells`). Contenu calculé dans `rdd/regions.ts` (`regionOf` : plus petite
  région contenant le coin haut-gauche, une région n'étant contenue que dans une plus grande ; `regionContent` de
  proche en proche). Cadre : `PageModeDefinition.carries(page, shape)`, que le glisser et les flèches du clavier
  ajoutent aux formes déplacées (`DragGesture.moveDrag`, `MoveDrag.carried`), avec les flèches entre les formes
  déplacées ; la sélection met le contenu en valeur sous le voile. « Couleur » du panneau sur une région : fond et
  bordure. Tests `rdd.test.ts` (contenu, imbrication, couleur, palette), fixture `rdd.drawio` (région « Comptes »
  autour de User et Role, réenregistrée par draw.io : rectangle, attributs conservés). Docs : SPEC §14.5,
  `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : région posée derrière les tables ; déplacée, elle emporte ses deux
  tables et la flèche entre elles, une table hors de la région reste en place ; ⌘Z remet tout en une fois.
