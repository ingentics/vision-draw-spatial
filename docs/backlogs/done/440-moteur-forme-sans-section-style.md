# Moteur : une forme peut se passer de la section Style

> Moteur et appli ; demandé par le mode Machine à états (433 : point de sortie, couleur imposée par « Attendue » /
> « En erreur »)

- Une forme déclare qu'elle n'a pas de style à choisir (ex. `ShapeDefinition.styleable: false`) : son panneau ne montre
  ni la section Style ni la section Bordure ; en sélection multiple, elle ne reçoit pas le style appliqué.
- Les points d'entrée et de sortie du mode Machine à états le déclarent.
- **Fini quand :** un point de sortie (ou d'entrée) sélectionné n'a ni Style ni Bordure dans son panneau ; les autres
  formes gardent les leurs ; `make check` vert.
- Fait : `ShapeDefinition.styleable` (`core/shapes/types.ts`), `ShapeRegistry.isStyleable` et `styleable` de la vue
  du registre ; panneau d'une forme sans Style ni Bordure (`ShapeSections.tsx`) ; en sélection multiple, Style et
  Bordure seulement si une forme en a un, aperçu sur la dernière (`MultiSections.tsx`) ; style de la palette non appliqué
  à ces formes (`StyleCommands.applyStylePreset`). Points d'entrée et de sortie du mode Machine à états
  `styleable: false`, point d'entrée toujours noir. Écart : en sélection mixte, la section Bordure écrit encore le style
  des points (pour draw.io ; leur dessin ne change pas). Doc : `AJOUTER_UNE_FORME.md`. Tests : registre, commande de
  style. Vérifié dans l'appli : ni Style ni Bordure sur un point d'entrée ou de sortie.
