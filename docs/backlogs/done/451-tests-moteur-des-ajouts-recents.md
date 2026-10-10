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
- Fait : tests seuls, sans changement de code.
  - `tests/engine/core/domains/selection/highlight.test.ts` (nouveau) : style imposé par `edges.selectionStyle`
    selon la taille de la sélection ; repli sur le paramètre sans réponse, sans le point d'entrée, pour une forme, ou
    mode en panne (avec la panne signalée).
  - `tests/engine/core/domains/selection/selection.test.ts` (nouveau) : `withContent`, un groupe avec ses enfants,
    les formes emportées par le mode et les flèches entre elles seulement.
  - Formes d'états, dans `tests/engine/plugins/modes/states/shapes/` (nouveau) :
    - `composite.test.ts` : prise (onglet compris, bande vide exclue), `hitBounds`, `movedHandles`, `textZone` ;
    - `state.test.ts` : dessin avec et sans contenu (traits, textes, partie du contenu) ;
    - `final.test.ts` : sortie noire ou rouge en erreur, ni style ni redimensionnement.
  - `compositeLayout.test.ts` : coins égaux (le plus grand contient, à taille égale celui de derrière), forme sortie
    par la gauche qui garde son ensemble (`before`), ordre de dessin des ensembles imbriqués.
  - La touche `x` de Séquences était déjà testée (`sequences.test.ts`, sujet 429). Le constat de l'audit sur ce point
    était faux.

  Aucune erreur révélée. `make check` vert. Ces sujets ne sont vérifiés que par les tests.
