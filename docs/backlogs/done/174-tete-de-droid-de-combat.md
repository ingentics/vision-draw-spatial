# Tête de droid de combat

> Itération — formes (Droid) ; reprise de 173

- Tête du Droid inspirée du droid de combat, en restant simple : tête allongée (dessus arrondi, plus large au
  niveau des yeux, museau qui se rétrécit vers le cou), sans détails du visage.
- L'antenne part du côté droit du visage (à hauteur des yeux), s'en écarte un peu puis monte au-dessus de la tête,
  jusqu'à un petit embout allongé. Elle reste à droite vue de la caméra en iso et en 3D (la silhouette debout était
  vue en miroir : le dessin y est désormais retourné).
- Même rendu dans draw.io (stencil tiré des mêmes points), en 2D, en iso et en 3D ; aperçu et icône de la palette
  mis à jour.
- **Fini quand :** le Droid montre sa tête de droid de combat et son antenne à droite dans l'appli (2D, iso, 3D) et
  dans draw.io ; `make check` vert.
- Fait : `actors/droid/figure.ts` — tête en polygone arrondi (`roundedPolygon`, 10 × 13,5, la plus large aux yeux,
  museau rétréci jusqu'au cou), sans détails du visage ; antenne en coude depuis le côté droit du visage jusqu'à un
  embout allongé au-dessus de la tête. Aperçu et icône de la palette mis à jour (`droid/index.ts`).
  `actors/common/standing.ts` : x de la silhouette retourné (le dessin était vu en miroir en iso / 3D). Tests dans
  `tests/engine/shapes/actor.test.ts`. Vérifié dans draw.io (export PNG) et dans l'appli (2D, iso, 3D : antenne à
  droite, sélection par la tête).
