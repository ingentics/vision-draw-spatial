# Couche de la simulation des états : clic pendant le franchissement, pointillés

> Audit 464 — mode Machine à états (reprise de 462) ; après 467 (couche et horloge du tronc)

- Constats :
  - `hit` (`simulationLayer.ts:101-105`) teste les pastilles du pas suivant, encore cachées pendant les 250 ms du
    franchissement, au lieu des pastilles visibles.
  - La couche anime toujours (`animate` rend vrai, `:93`). À chaque image, elle refait et libère la géométrie des
    pointillés de chaque transition proposée (`animateStep`, `:112-120`).
  - `animate(0)` refait des pointillés que `drawStep` vient de construire.
- Ce qu'on veut :
  - Pendant le franchissement, un clic ne franchit rien : on attend le pas suivant.
  - Les pointillés défilent sans refaire de géométrie (décalage par matériau ou par attribut). Le halo reste
    inchangé.
- Écart de comportement : aucun visible, sauf le clic ignoré pendant le franchissement.
- Tests : `simulationLayer.test.ts`. On ajoute :
  - `hit` pendant le franchissement (aucun), puis après ;
  - une animation qui ne crée pas de géométrie à chaque image.
- **Fini quand :**
  - Dans l'appli, les pointillés défilent et le point parcourt la flèche comme avant.
  - Les Diagnostics montrent moins de géométries créées par seconde pendant une simulation.
  - `make check` est vert.
- Fait :
  - `simulationMarks.ts` : `proposedRouteFrames(route)` construit une fois les pointillés d'une transition proposée en
    14 décalages, un par pixel du motif 8 + 6. `dashFrame(elapsed)` dit lequel montrer. `crossingDot()` est centré sur
    l'origine, et sa position le place. `proposedRoute` est retiré.
  - `simulationLayer.ts` :
    - l'animation ne fait plus que montrer ou cacher des objets et déplacer le point : aucune géométrie créée à chaque
      image, et plus de reconstruction au premier `animate(0)` ;
    - `hit` ne vise rien pendant les 250 ms du franchissement.
  - Le second clic d'un double-clic et l'horloge dans l'image du rendu étaient déjà réglés par 467.
  - Écarts de comportement :
    - un clic pendant le franchissement ne franchit rien ;
    - les tirets avancent par pas d'un pixel de page (24 px/s, comme avant).
  - Tests : `simulationLayer.test.ts`.
    - Ajoutés : `hit` pendant puis après le franchissement ; une animation qui ne crée aucun objet.
    - Adapté : le point reste dans la couche, caché une fois arrivé.
  - `make check` vert.
  - Vérifié dans l'appli sur `states.drawio`, après la touche 1 :
    - halo, pastilles et pointillés comme avant ;
    - le décalage visible des pointillés change d'une image à l'autre (14 décalages par transition) ;
    - les géométries du moteur restent à 150 sur 2 s.
