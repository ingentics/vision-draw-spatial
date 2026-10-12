# Formes de bibliothèque posées et non chargées

> Milestone 2 — Éditeur. Dépend de 529.

- **Écrit dans le fichier** : une forme posée depuis une bibliothèque garde le `style` de son JSON, plus
  `spatial.library=<library.id>;spatial.kind=<shape.id>`. Pas de version de bibliothèque écrite. L'export draw.io
  montre le style seul (forme par défaut du style, un rectangle pour le style par défaut) ; rien d'autre n'est écrit.
- **Lecture** : une forme avec `spatial.library` est résolue sur la bibliothèque chargée de cet id et la forme
  `spatial.kind` qu'elle contient. Trois états :
  - **chargée** : la bibliothèque et la forme sont enregistrées, la forme se dessine comme le décrit son JSON ;
  - **non chargée** : la bibliothèque n'est pas enregistrée, ou elle l'est sans cette forme ;
  - **introuvable** : l'hôte a déclaré la bibliothèque (ou la forme) introuvable (sujet 531).
- **Rendu d'une forme non chargée**, distinct du placeholder des formes non supportées (gris, pointillés) :
  - contour = bornes de la forme ; texte (`value`) dessiné comme sur un rectangle ;
  - fond hachuré (traits à 45°, écart 8 px) sur un fond clair, bordure en tirets longs (8 / 4) ; couleurs réglables
    dans Paramètres › Formes : `shapes.unloadedFill` (défaut `#eef2f7`), `shapes.unloadedStroke` (défaut `#5b7db1`) ;
  - badge dans le coin haut-droit (pièce de puzzle, 16 px à l'échelle 1) ;
  - en iso / 3D : prisme des bornes de hauteur `view.isoDepth`, hachures et badge sur le dessus ;
  - mini-carte : bornes remplies de `shapes.unloadedFill`.
- **Rendu d'une forme introuvable** : idem, mais badge d'avertissement (triangle, `#d97706`) et bordure de cette
  couleur ; une entrée par paire (bibliothèque, forme) dans les Diagnostics (« Bibliothèque `infra-aws` introuvable :
  forme `serveur`, N occurrences »).
- **Édition** : une forme non chargée ou introuvable se sélectionne, se déplace, se redimensionne, se copie et se
  supprime comme un rectangle ; flèches attachées sur ses bornes. Le style n'est pas modifié tant qu'on ne le règle pas.
- **Panneau de la forme** : en tête, « Forme `serveur` de la bibliothèque `infra-aws` : non chargée » (ou
  « introuvable »).
- **Changement d'état à chaud** : enregistrer, remplacer ou retirer une bibliothèque (529) fait passer ses formes
  posées d'un état à l'autre sans recharger le fichier ; enregistrer une bibliothèque déclarée introuvable lève cet état.
- **Fini quand :** une fixture `tests/fixtures/shape-library.drawio` (formes avec `spatial.library` d'une bibliothèque
  absente) s'ouvre avec les formes hachurées et badgées, en vue de dessus, en iso et en 3D ; enregistrer la bibliothèque
  dans la console les dessine pour de vrai, la retirer les remet hachurées. Tests : résolution des trois états, écriture
  des attributs à la pose, Diagnostics de l'état introuvable.
- Fait : `SPATIAL.library` (`spatial.library`) ; modèle de palette dont le style porte `spatial.library` et
  `spatial.kind` (ceux du JSON retirés). États `loaded` / `unloaded` / `unavailable` (`registry.libraryStatus`, aussi
  dans la vue de l'appli), résolus avant toute autre règle ; une forme non chargée n'est pas une forme non supportée.
  Rendu `plugins/shapes/generic/library/unloadedShape.ts` : bornes, hachures à 45° (écart 8, opacité 0,35), tirets
  8 / 4, badge puzzle de 16 px (réduit dans une forme plus petite), triangle d'avertissement `#d97706` et bordure de
  cette couleur pour une forme introuvable ; prisme et marques sur le dessus en iso ; mini-carte. Paramètres
  `shapes.unloadedFill` / `unloadedStroke` (Paramètres › Formes, sous-section « Formes de bibliothèque non chargées »,
  sans aperçu), transmis par `ctx.unloaded` et les couleurs de la mini-carte. Diagnostics : catégorie `library`
  (« Bibliothèque introuvable », nom `<bibliothèque>/<forme>`). Panneau de la forme : « Forme `kind` de la bibliothèque
  `library` : chargée / non chargée / introuvable ». Fixture `tests/fixtures/shape-library.drawio`. Validé : tests
  (`tests/engine/core/shapes/library/libraryStore.test.ts` : états, remplacement, retrait, introuvable, modèles, palette
  par mode, dessin, Diagnostics) ; dans l'appli sur la fixture, en 2D et en iso : formes chargées, introuvables (orange)
  puis non chargées après `unregisterShapes('demo')`.
