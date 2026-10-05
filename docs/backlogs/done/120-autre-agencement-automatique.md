# Autre agencement en ancrage automatique (touche F, graine)

> Itération — interaction (flèches, ancrage automatique) ; reprise de 116 et 117, pendant de 119

- Sur une page en ancrage automatique, **F** propose un autre agencement : une **graine** propre à la page
  (`spatial.anchorSeed` sur `<diagram>`, absente = 0, l'agencement actuel) est augmentée, puis les flèches
  concernées sont réparties et retracées avec elle :
  - **une flèche sélectionnée** : seulement autour d'elle, c'est-à-dire les deux formes à ses bouts et leurs
    voisines (comme après une édition, `affectedShapes`), leurs flèches et celles qui les traversent ; le reste de
    la page ne bouge pas ;
  - **rien de sélectionné** : toute la page.
- **Une seule entrée dans l'historique par appui** (« Autre agencement »), quel que soit le nombre de flèches
  modifiées et la graine écrite : Ctrl+Z retire tout le groupe de modifications et revient à l'agencement d'avant,
  Ctrl+Maj+Z le rétablit.
- La graine départage ce qui est aujourd'hui à égalité ou arbitraire, sans changer les côtés choisis : ordre de
  tracé des flèches, choix entre détours de même coût (par le haut ou par le bas…), ordre des flèches d'un faisceau
  quand plusieurs sont équivalents. Un agencement proposé n'a pas plus de croisements ni de superpositions que
  celui de la graine 0 ; s'il est identique au précédent, on passe à la graine suivante (quelques essais au plus).
- La graine reste écrite sur la page : les éditions suivantes (création, déplacement…) la reprennent pour les flèches
  qu'elles recalculent.
- Même touche que 119 (réglable) ; sans effet pendant l'édition d'un texte.
- **Fini quand :** sur une page en Automatique, F avec une flèche sélectionnée ne change que les flèches autour
  d'elle, F sans sélection réagence toute la page ; appuis successifs = agencements différents quand il en existe,
  sans croisement ajouté ; chaque appui est une seule entrée d'historique (Ctrl+Z / Ctrl+Maj+Z) ; la graine est
  conservée par draw.io ; `make check` vert.
- Fait : `src/engine/edit/seed.ts` (`seededUnit`), `src/engine/edit/arrange.ts` (`arrangeAnchors` : répartition
  puis tracés pour une graine ; `arrangementChanges`, `arrangementConflicts`), `src/engine/edit/distribute.ts`
  (graine dans les égalités, `withNeighbours`, `anchorSeedOf`), `src/engine/edit/avoid.ts` (graine : ordre de tracé
  perturbé, léger biais par couloir), `src/engine/spatial.ts` (`spatial.anchorSeed`), `src/engine/Engine.ts`
  (`writeDistribution` passe par `arrangeAnchors` / `writeArrangement` ; `otherArrangement` : zone autour de la
  sélection ou page entière, graines essayées, une étape d'annulation, pas de répartition derrière), `docs/SPEC.md`,
  `tests/engine/edit/arrange.test.ts`. La graine 0 garde l'agencement d'avant (fixtures inchangées). Vérifié dans
  l'appli (`simple.drawio` en Automatique, sans sélection) : deux appuis sur F = deux agencements différents des
  flèches qui contournent Service B ; Ctrl+Z revient au précédent, Rétablir s'active ; `make check` vert.
