# Zone de clic de l'Actor en iso et en 3D : sa silhouette

> Itération — interaction (clic, survol) ; reprise de 41 et 168

- En iso et en 3D, l'Actor se prenait comme un volume : son emprise au sol extrudée sur toute sa hauteur, une grande
  zone carrée autour de la tête. Un clic à côté de la tête sélectionnait l'Actor au lieu de la forme derrière lui.
- La zone de clic devient la silhouette dessinée, telle qu'elle fait face à la caméra : le disque de la tête, et les
  traits du corps, des bras et des jambes à la tolérance de clic des flèches (`edit.edgePickTolerance`, pixels
  écran). Ailleurs, le clic passe à ce qui est derrière.
- **Fini quand :** en iso et en 3D, un clic juste à côté de la tête (hors du cercle) sélectionne la forme derrière ;
  un clic sur la tête ou sur un trait du corps sélectionne l'Actor ; en 2D rien ne change ; `make check` vert.
- Fait : la silhouette expose aussi ses traits (`userData.strokes`, `actor/standing.ts`) ; `pickElement` prend une
  option `standingHit` qui remplace le test des bornes et du volume (`interaction/pick.ts`) ; `Picking.standingHit`
  (`core/selection/picking.ts`) projette à l'écran la tête et les traits, tournés face à la caméra, et renvoie la
  hauteur touchée (disque de la tête, ou trait à `edit.edgePickTolerance` px). Test dans
  `tests/engine/shapes/actor.test.ts`. Vérifié dans l'appli sur `flows.drawio` en iso : un clic à côté de la tête ne
  sélectionne plus l'Actor, un clic sur la tête ou une jambe le sélectionne.
