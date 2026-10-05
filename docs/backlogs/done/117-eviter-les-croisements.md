# Éviter les croisements en ancrage automatique

> Itération — flèches (ancrage automatique) ; reprise de 114 et 116

- Deux flèches entre les mêmes côtés de deux formes se croisaient (ex. droite d'une forme → gauche d'une autre) :
  chaque côté était ordonné d'après le point d'attache de l'autre bout, qui dépend lui-même de cet ordre (les deux
  côtés s'inversaient).
- L'ordre sur un côté s'appuie sur le centre de la forme à l'autre bout ; les flèches qui relient les deux mêmes
  côtés (faisceau) gardent un ordre cohérent aux deux bouts : la gauche du faisceau reste à gauche (même ordre
  entre côtés face à face, ordre inversé pour un tracé en L).
- Le tracé évite les croisements plus fortement (un croisement coûte plus qu'un coude).
- **Fini quand :** deux flèches de la droite d'une forme vers la gauche d'une autre sont parallèles ; un faisceau en
  L est emboîté sans croisement ; la fixture `anchor-auto-routing.drawio` n'a plus de croisement évitable ;
  `make check` et `make drawio-check` verts.
- Fait : `src/engine/edit/distribute.ts` (ordre par le centre de la forme à l'autre bout ; faisceaux ordonnés par la
  « gauche » du parcours ; boucle d'un seul côté rangée en fin de côté, boucle de deux côtés d'après son autre
  bout), `src/engine/edit/avoid.ts` (croisement à 500, compté aussi sur un nœud de la grille ; les plus longues
  d'abord, coudes attirés vers le bout chargé ; reprise des flèches en conflit ensemble, dans les deux ordres),
  `docs/SPEC.md`, `tests/engine/edit/distribute.test.ts` (cas croisé remis parallèle et stable, faisceau en L),
  fixture `anchor-auto-routing.drawio` régénérée avec la vérification « aucun croisement » (8 croisements avant,
  0 après). Tracés identiques à draw.io ; dans l'appli (`simple.drawio` en Automatique), deux flèches de la droite
  de « Service A » vers la gauche de « Ligne 1 » ne se croisent pas ; `make check` et `make drawio-check` verts.
