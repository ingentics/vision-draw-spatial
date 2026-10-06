# Découpage du tracé des arêtes

> Refactorisation — moteur (`src/engine/render/edges/route.ts`, ≈ 1 340 lignes) ; suite de 162

- `route.ts` mêle trois responsabilités : périmètres des formes, bouts de l'arête, routeurs portés de draw.io.
- `route.ts` devient la façade (mêmes exports, mêmes chemins
  d'import) du dossier `route/` : `perimeters/` (choix et point du contour, périmètres calculés, polygonaux), `terminals.ts`,
  `routers/` (un fichier par routeur, état partagé), `routeEdge.ts` (enchaînement), `routingKind.ts`,
  `simplify.ts`, `types.ts`, `util.ts`.
- Code déplacé tel quel ; aucun changement de comportement.
- **Fini quand :** plus aucun fichier du dossier au-delà de ≈ 350 lignes ; les tests de tracé (fixtures draw.io)
  passent sans modification ; les flèches s'affichent comme avant dans l'appli ; `make check` vert.
- Fait : `route.ts` (26 lignes) ne garde que la façade ; le code est déplacé tel quel dans `route/` (16 fichiers, le
  plus gros : `routers/orthogonal.ts`, 330 lignes) : `perimeters/` (`index.ts` choix et point du contour,
  `shapes.ts` rectangle / losange / triangle / ellipse, `polygons.ts` étape / parallélogramme / hexagone),
  `terminals.ts`, `routers/` (`state.ts`, `orthogonal.ts`, `segment.ts`, `elbow.ts`, `entityRelation.ts`,
  `loop.ts`, `index.ts` choix du routeur), `routeEdge.ts`, `routingKind.ts`, `simplify.ts`, `types.ts`, `util.ts`.
  Façade en fichier voisin du dossier (et non `route/index.ts`) : le serveur de dev garde l'ancien chemin en cache.
  Tests de tracé (fixtures draw.io) inchangés et verts ; appli rechargée sans erreur. SPEC §4.2 et §8.3 à jour.
