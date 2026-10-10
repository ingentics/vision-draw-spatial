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
