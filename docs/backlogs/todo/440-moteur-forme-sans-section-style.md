# Moteur : une forme peut se passer de la section Style

> Moteur et appli ; demandé par le mode Machine à états (433 : point de sortie, couleur imposée par « Attendue » /
> « En erreur »)

- Une forme déclare qu'elle n'a pas de style à choisir (ex. `ShapeDefinition.styleable: false`) : son panneau ne montre
  ni la section Style ni la section Bordure ; en sélection multiple, elle ne reçoit pas le style appliqué.
- Les points d'entrée et de sortie du mode Machine à états le déclarent.
- **Fini quand :** un point de sortie (ou d'entrée) sélectionné n'a ni Style ni Bordure dans son panneau ; les autres
  formes gardent les leurs ; `make check` vert.
