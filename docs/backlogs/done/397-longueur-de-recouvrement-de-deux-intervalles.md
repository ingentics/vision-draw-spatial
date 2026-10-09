# Brique « longueur commune de deux intervalles »

> Itération — géométrie du tronc (`model/geometry.ts`) ; dette vue au sujet 382

- `overlapLength(a0, a1, b0, b1)` dans `model/geometry.ts` : longueur commune de deux intervalles dont les bornes sont
  données dans n'importe quel ordre (0 s'ils sont disjoints). Testée dans `geometry.test.ts`.
- Remplace le calcul écrit à la main dans `edit/anchoring/auto/routeAround.ts` (`overlap`) et
  `edit/anchoring/pcb/octilinear.ts` (`segmentsOverlap`) ; ajoutée à la liste des briques de `coding.md` §4.
- Aucun changement de comportement (mêmes valeurs).
- **Fini quand :** plus de `Math.max(0, Math.min(…) - Math.max(…))` écrit à la main ; tracés automatique et Typon
  inchangés dans l'appli ; `make check` vert.
- Fait : `overlapLength` dans `src/engine/core/model/geometry.ts`, testé dans `geometry.test.ts` ; utilisé par `overlap`
  (`routeAround.ts`) et `segmentsOverlap` (`octilinear.ts`, intervalle [0, longueur]) ; ajouté à `coding.md` §4. Mêmes
  valeurs qu'avant : vérifié par les tests du tracé automatique et Typon.
