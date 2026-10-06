# Icône prise électrique pour l'embedded

> Itération — mode RDD (tables) ; reprise de 222

- L'icône d'entête de l'embedded n'est plus une pièce de puzzle mais une **prise électrique avec son câble**, d'après
  le modèle fourni : câble en S partant du haut à gauche, qui entre dans le corps de la prise en bas à droite, deux
  broches vers la droite. Même cadre, même trait, même couleur que les autres icônes d'entête.
- **Fini quand :** l'embedded montre sa prise, lisible à l'échelle normale ; le réglage « Icône » la masque comme
  avant ; `make check` vert.
- Fait : `HeaderMark` `puzzle` remplacé par `plug` (posé sur `rdd-embedded`) ; dans `MARK_PATHS` : câble en S
  (`plugCable()` : deux demi-cercles), corps rétréci côté câble, deux broches. `puzzlePiece()` supprimé. Test
  `rdd.test.ts` ; SPEC §14.5. Aperçu agrandi comparé au modèle, puis vérifié dans l'appli sur un embedded posé (pose
  annulée ensuite).
