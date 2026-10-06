# Pancarte de l'Actor en iso et en 3D

> Itération — formes (Actor debout) ; reprise de 41

- En iso et en 3D, l'Actor tient devant lui, entre ses mains, une pancarte qui porte son texte (à la place du texte
  posé au sol) : panneau rectangulaire face à la caméra comme la silhouette, fond de la forme (`fillColor`, blanc par
  défaut) et bordure (`strokeColor`, `strokeWidth`), bras étendus jusqu'aux bords du panneau. Le texte s'ajuste au
  panneau (taille réduite s'il ne tient pas, retour à la ligne entre les mots).
- Réglage propre à l'Actor, case à cocher « Pancarte en iso / 3D » dans la section Forme du panneau : attribut
  spatial `spatial.sign` (`0` = pas de pancarte, texte au sol comme avant) ; absent = pancarte (par défaut).
- Sans texte, pas de pancarte. En 2D rien ne change. La pancarte se clique comme le reste de la silhouette.
- **Fini quand :** en iso et en 3D, un Actor avec un texte tient une pancarte lisible portant ce texte ; décocher la
  case remet le texte au sol ; `make check` vert.
- Fait : `actor/standing.ts` — `signFrame` (panneau 1,4 × la largeur, 0,35 × la hauteur, bord haut un peu au-dessus
  des mains) et `createSign` (fond, bordure, texte de la forme centré avec `fitText` et retour à la ligne), dans un
  repère au x retourné (sinon le texte est en miroir) ; bras tendus jusqu'aux bords. Attribut `spatial.sign`
  (`spatial.ts`, SPEC §14.3) ; réglage `properties` de l'Actor, case cochée par défaut (option `checkedByDefault`
  des cases, `shapes/types.ts`, `app/ShapeProperties.tsx`). La pancarte se clique (`core/selection/picking.ts`).
  Tests dans `tests/engine/shapes/actor.test.ts`. Vérifié dans l'appli sur `flows.drawio` : en iso et en 3D,
  « Actor » lisible sur la pancarte, section « Acteur » du panneau avec la case cochée.
