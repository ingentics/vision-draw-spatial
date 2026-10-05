# Tracé automatique qui contourne les formes et ne superpose pas les flèches

> Itération — flèches (ancrage automatique) ; reprise de 114 et 115

- En ancrage automatique, si possible : le tracé orthogonal ne passe pas par-dessus les formes (écart de 10 px),
  et deux flèches ne se superposent pas (voies parallèles à 10 px).
- Le tracé est calculé par l'appli (plus court chemin sur une grille tirée des formes et des flèches déjà tracées,
  coudes et superpositions pénalisés) et écrit en points intermédiaires : draw.io dessine le même tracé. Pas de
  chemin : la flèche garde le tracé par défaut.
- Recalculé avec la répartition (formes touchées et voisines, flèches qui les traversent), boucles comprises ; la
  répartition ne s'appuie plus sur les points intermédiaires (générés), une boucle garde l'ordre de ses bouts.
- Fixture `anchor-auto-routing.drawio` régénérée, avec des cas d'obstacles ; ses tracés ne traversent aucune forme
  et ne se superposent pas.
- **Fini quand :** en automatique, une flèche entre deux formes séparées par une troisième la contourne ; des
  flèches qui partagent un couloir y passent côte à côte ; mêmes tracés dans draw.io ; `make check` et
  `make drawio-check` verts.
- Fait : `src/engine/edit/avoid.ts` (`routeAround` : plus court chemin orthogonal sur grille, état nœud × direction,
  coudes / superpositions / croisements pénalisés, voies à 10 px des flèches tracées ; `avoidRoutes`,
  `edgesThrough`), `src/engine/edit/distribute.ts` (référence sans points intermédiaires, boucle sur sa propre
  place), `src/engine/Engine.ts` (`writeDistribution` écrit aussi les tracés), `docs/SPEC.md` ; fixture
  `anchor-auto-routing.drawio` régénérée (70 flèches, 5 cas d'obstacles : mur, mur percé, B à gauche de A, couloir
  partagé, cible au-dessus du départ) avec les vérifications « aucune forme traversée » et « pas de superposition ».
  Les 70 tracés tombent au pixel près sur ceux de draw.io ; dans l'appli (`three-rectangles.drawio` en
  Automatique), déplacer B fait contourner A aux trois flèches ; `make check` et `make drawio-check` verts.
