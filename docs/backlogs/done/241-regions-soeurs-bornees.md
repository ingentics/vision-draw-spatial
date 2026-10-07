# RDD : une région ne passe pas sur ses sœurs (borne en pointillé rouge)

> Itération — mode RDD (région) ; reprise de 182, 231

- Quand on déplace ou redimensionne une région, ses **sœurs** (régions du même niveau : même région parente, ou
  premier niveau de la page, au début du geste) la bornent : elle ne peut pas s'en approcher à moins de **20 px**
  (onglets compris). Cet écart est un paramètre global : « Paramètres › Modes › RDD › Écart entre régions sœurs ». Sa région parente ne la borne pas (elle s'agrandit, sujets 183, 234) ; son contenu bouge avec
  elle.
- Arrivée à la borne, une **ligne rouge en pointillé** apparaît le long de la limite (à 20 px du bord de la sœur), le
  temps du geste ; le déplacement continue sur l'autre axe (on glisse le long de la sœur).
- La borne suit le chemin du geste (calculée pas à pas depuis la dernière position permise) : on peut contourner une
  sœur par n'importe quel côté et finir au-dessus, à côté ou en dessous d'elle.
- **Ctrl maintenu** pendant le geste désactive la borne : la région peut entrer dans une autre (et s'y emboîte au
  lâcher, sujet 231) ; relâché, la borne reprend depuis la position atteinte. Sans Ctrl, on n'emboîte plus une région
  dans une sœur en la faisant mordre dessus ; les tables, elles, ne sont pas bornées.
- Mêmes bornes pour un déplacement au clavier.
- **Fini quand :** une région tirée vers sa voisine s'arrête à 20 px avec la ligne rouge, et glisse le long d'elle ; en la contournant, on peut la dépasser par chaque côté ;
  redimensionnée vers sa voisine, son bord s'arrête de même ; sa parente ne la bloque pas ; avec Ctrl, elle entre dans sa voisine ; `make check` vert.
- Fait : bornes génériques `edit/obstacles.ts` (`clampMove` : un axe puis l'autre, l'ordre le plus proche du pointeur,
  limites touchées en segments ; `clampResize` : bords qui avancent vers un obstacle). Crochet de mode
  `obstacles(page, shape)` (`ModeObstacles` : emprises, `above`) ; RDD : `regionObstacles` (sœurs onglet compris).
  Glisser (`MoveDrag.bounded`, calcul pas à pas depuis `applied`, clavier compris) et redimensionnement
  (`ResizeDrag.bounded`, depuis les bornes courantes) bornés ; ligne rouge en pointillé `ConnectorPreview.showLimits`
  (épaisseur et tirets constants à l'écran), effacée à la fin du geste. Ctrl maintenu (`moveTo` `free`) : sans borne.
  Paramètre global `shapes.modeObstacleGap` (« Modes › RDD › Écart entre régions sœurs », 20 px, 0 à 80). Tests
  `tests/engine/edit/obstacles.test.ts` (arrêt, limite, glissement, chemins autour d'un obstacle, redimensionnement),
  `rdd.test.ts` (sœurs seulement). SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli (événements de pointeur
  simulés, bouton maintenu) : arrêt à 20 px sous « Comptes » avec la ligne rouge, redimensionnement arrêté de même,
  contournement d'une sœur par le haut, entrée dans une sœur avec Ctrl puis emboîtement au lâcher.
