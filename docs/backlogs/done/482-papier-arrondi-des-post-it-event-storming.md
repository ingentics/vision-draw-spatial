# Papier arrondi des post-it Event storming, ombre qui ne s'additionne pas

> Itération — mode Event storming, post-it typés (reprise de 475)

- Coins arrondis (rayon 8) ; dans le fichier, `rounded=1;absoluteArcSize=1;arcSize=16`.
- Ombre douce dessous, qui ne déborde pas sur les côtés : deux post-it collés côte à côte n'ont plus de bande sombre
  sous leur jointure (les deux ombres ne se recouvrent plus).
- Seuls les post-it du mode changent ; le Post-it général (411) reste tel quel.
- **Fini quand :** sur `eventstorming-commande.drawio`, les post-it sont arrondis, et une rangée de post-it collés
  montre une ombre régulière sans tache sous les jointures ; `make check` vert.
- Fait : papier propre aux post-it du mode, `shapes/common/stickyPaper.ts` (au lieu de celui du Post-it général) :
  coins arrondis de 8 (contour de sélection compris), ombre en 12 couches décalée de 3, floue de 8, noire à 20 % au
  plus foncé, dont le cœur est rentré du flou à gauche, à droite et en haut : la couche la plus large reste dans la
  largeur du papier, seul le bas dépasse. Modèles de la palette et fixtures `eventstorming*.drawio` en
  `rounded=1;absoluteArcSize=1;arcSize=16`. Test dans `tests/engine/plugins/modes/eventstorming/index.test.ts`
  (papier arrondi, ombre dans la largeur). Vérifié à l'œil sur `eventstorming-commande.drawio` : post-it arrondis,
  ombre régulière sous une rangée collée, sans tache aux jointures. Post-it général (411) inchangé.
