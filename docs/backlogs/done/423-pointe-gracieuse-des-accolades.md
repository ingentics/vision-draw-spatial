# Pointe gracieuse des accolades

> Itération — formes générales (accolades gauche et droite)

- Aujourd'hui, la pointe de l'accolade est un aller-retour horizontal de la tige au bord (épi en T, arrondi seulement
  à sa base). Avec `rounded=1`, la remplacer par deux courbes (Bézier cubiques en quart d'ellipse) qui partent
  verticalement de la tige et arrivent horizontalement à la pointe, où elles se rejoignent en pointe fine, comme une
  accolade typographique. Hauteur de chaque courbe : `max(arc, retrait de la tige)`, au plus un quart de la hauteur.
- Sans `rounded`, le tracé anguleux actuel reste inchangé. Export draw.io inchangé (le style n'est pas touché).
- **Fini quand :** dans l'appli, les accolades de la palette (et de `tests/fixtures/orientation.drawio`) ont une pointe
  courbe et fine, à l'endroit comme retournées ou tournées.
- Fait : `plugins/shapes/general/curly-bracket-left/index.ts` (l'accolade droite en hérite) : avec `rounded=1`, le
  haut et le bas restent des coins arrondis (`roundedPolygon`), la pointe est faite de deux `cubicTo` en quart
  d'ellipse (coefficient 0,5523) qui se rejoignent horizontalement en pointe fine ; hauteur `max(arc, retrait)`, au
  plus h/4 (quart de cercle à la taille par défaut 20×120). Sans `rounded`, tracé anguleux inchangé. Vérifié à l'œil
  en 2D sur l'accolade couchée de `fixtures/orientation.drawio` ; `make check` vert.
