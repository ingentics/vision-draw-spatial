# Simulateur commun aux modes

`StorySimulator` (`plugins/modes/storytelling/simulation/storySimulator.ts`, sujet 534) reprend le squelette de
`StatesSimulator` (verrou, capture des touches, couche, abonnés, `version`) : en faire une brique de l'API des plugins
que les deux simulations étendent.

- Fait (audit 542) : classe de base `ModeSimulator` (`core/modes/modeSimulator.ts`, API des plugins) : verrou et
  capture des entrées (`start`), `opened`, `version`, `subscribe`, `stop`, abonnés prévenus (`notify`), couche retirée
  quand le verrou est rendu. `StatesSimulator` et `StorySimulator` l'étendent et ne gardent que leurs pas, leurs touches
  et leur couche. Côté appli, le suivi commun est `useOpenedSimulator` (sujet 549). Écart de comportement : aucun
  (tests des deux simulateurs intacts). Test : `core/modes/modeSimulator.test.ts`. Docs : `AJOUTER_UN_MODE.md`
  (prise en main de la page), liste blanche de `guides.test.ts`. Vérifié dans l'appli (`storytelling.drawio`) :
  simulation lancée, pas suivant, arrêt par Échap.
