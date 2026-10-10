# Tronc : contrat de l'aimantation, pas au clavier, menus

> Audit 500 — tronc et appli (reprise de 476, 477, 481)

- Constats :
  - `gestures.snapTargets` renvoie un type anonyme `Array<{ id; rect }>` (`core/modes/types.ts:205`), alors que
    `obstacles` et `dragPlaces` ont un type nommé ; « 8 px » écrit dans la doc du contrat (`types.ts:202`) en plus de
    `EDGE_SNAP_PIXELS`.
  - `nudgeSelection` (`core/domains/edit/drag/gesture.ts:325-336`) appelle `snapTargets` du mode par `moveDrag`, puis
    jette le résultat (`drag.snapping = undefined`) : un appel au mode à chaque flèche.
  - `switchPlan` (`move.ts:119`) ne recalcule pas `snapping` quand Ctrl change les formes emportées : une forme laissée
    en place reste exclue des cibles (latent : Event storming n'emporte rien).
  - `modeEditWriter.ts:253` : `shapes.some(s => s.id === … && isLocked(s))` au lieu de `shapeOf` ;
    `spatialValue(…, SPATIAL.kind)?.trim() || resolveShapeKind(…)` recopié (`format/parse.ts:106`, `:133`) ;
    `rectPath` calculé deux fois par place (`render/decorations.ts:222-230`) ; `gesture.ts` fait 416 lignes.
  - Commentaire périmé `core/plugins/index.ts:100-101` : `roundedRectPath` et `darken` ont maintenant des appelants
    (`stickyPaper.ts`, `simulationMarks.ts`).
  - Appli : `editorFontFamily` (`src/app/fonts.ts:28-29`) teste la chasse fixe avant la police nommée ; le moteur
    (`troikaText.ts:75-77`) fait l'inverse.
- Ce qu'on veut :
  - Type nommé `ModeSnapTarget` (réexporté), doc du contrat renvoyant à `EDGE_SNAP_PIXELS`.
  - `moveDrag` ne demande pas les cibles pour un pas au clavier (option, au lieu de les jeter après).
  - Cibles recalculées pour chaque plan (`snapping` dans `MovePlan`).
  - Menus corrigés ; `shapeKindOf` commun dans `parse.ts` ; `gesture.ts` sous 400 lignes (le calcul des cibles et des
    places sort dans un module voisin) ; commentaire à jour ; `editorFontFamily` dans l'ordre du moteur.
- Écart de comportement : aucun visible (le mode n'est plus appelé pour un pas au clavier).
- Tests : `gesture.test.ts`, pas au clavier sans appel à `snapTargets` ; existants intacts.
- Docs : `AJOUTER_UN_MODE.md` (type nommé).
- **Fini quand :** les constats ci-dessus ont disparu, l'aimantation marche comme avant sur `eventstorming.drawio` ;
  `make check` vert.
