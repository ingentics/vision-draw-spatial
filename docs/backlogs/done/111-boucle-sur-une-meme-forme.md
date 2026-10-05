# Flèche qui boucle sur sa propre forme

> Itération — flèches (points d'ancrage) ; reprise de 108 et 109

- Une flèche peut partir d'une forme et y revenir (« self reference ») : depuis une poignée de connexion, la
  lâcher sur la forme elle-même (sur un point d'ancrage, ou dedans : point libre le plus proche du départ).
- Départ d'une boucle : point libre du côté de la poignée le plus proche de son milieu ; il compte comme pris sur
  la forme pendant le glisser (l'arrivée ne peut pas être le même point).
- La boucle **tourne hors de la forme** : le routeur de draw.io longe le bord (même côté) ou traverse la forme
  (côtés opposés), donc ses coudes sont écrits en points intermédiaires (`<Array as="points">`), à 20 px du cadre :
  même côté = U ; côtés voisins = par le coin ; côtés opposés = par le côté le plus proche des deux points.
  Même rendu dans draw.io. Aperçu identique pendant le glisser.
- Déplacer le bout d'une flèche pour en faire une boucle (deux points fixes) recalcule ces coudes.
- **Fini quand :** une flèche tirée du bas d'une forme vers elle-même (même côté, côté voisin, côté opposé) sort
  de la forme et y revient sans la traverser ni longer son bord ; `make check` vert.
- Fait : `src/engine/edit/loops.ts` (`loopWaypoints`), `src/engine/Engine.ts` (connecteur : la forme de départ est
  une cible, départ de boucle compté comme pris, coudes en aperçu puis écrits par `setEdgePoints` ; bout déplacé
  qui referme une boucle : coudes recalculés, points d'origine remis sinon), `src/engine/render/handles.ts`
  (aperçu en ligne brisée), `tests/engine/edit/loops.test.ts`, `docs/SPEC.md`. Vérifié dans l'appli
  (`sequences.drawio`) : bas → bas de « Client » = U sous la forme ; haut → bas = contour par la gauche ;
  `make check` vert.
