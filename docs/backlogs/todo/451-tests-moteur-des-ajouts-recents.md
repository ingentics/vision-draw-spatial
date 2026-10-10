# Tests moteur des ajouts récents

> Audit 444 — tests (reprises de 427, 428, 429, 432, 433 à 435)

- Mise en valeur imposée par `edges.selectionStyle`, côté hôte (`selection/highlight.ts:54-66`) : contour, sans
  voile, repli quand le mode ne répond pas ou lève une erreur.
- `Selections.withContent` (`selection/selection.ts:26`) : contenu emporté, flèches entre formes emportées.
- Formes de `states` : de l'ensemble, `contains`, `hitBounds`, `movedHandles` et `textZone` ; de l'état, le dessin
  (trait, contenu) ; le point de sortie en erreur.
- `compositeLayout.ts` : `placed` avec `before` (forme sortie par la gauche ou le haut, `:168-175`), coins égaux
  (`canContainComposite`), `orderComposites`.
- Séquences : la touche `x` (`keys.x`) bascule le sens d'une flèche de flux.
- Écart de comportement : aucun (tests seuls). Un test qui révèle une erreur devient un ticket.
- **Fini quand :** ces tests existent et passent, `make check` vert.
