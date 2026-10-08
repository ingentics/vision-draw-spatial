# Mode navigation conservé pendant une plongée

> Itération — contrôles clavier (mode navigation, touche pour suivre un lien)

- Espace maintenue (mode navigation), une plongée dans une zone liée fait perdre le mode : la transition désactive
  les contrôles, ce qui oubliait aussi les touches maintenues. Désormais, la désactivation n'arrête que les
  mouvements en cours (glissade de la vue) ; les touches de modification maintenues restent connues (leur
  relâchement est toujours lu pendant la transition), et la perte du focus continue de tout oublier.
- **Fini quand :** Espace maintenue, plonger dans une zone liée : à l'arrivée, « Mode navigation » est toujours
  affiché et les zones liées de la page d'arrivée sont en évidence, tant qu'Espace reste maintenue ; la relâcher
  pendant la transition fait bien sortir du mode.
- Fait : `KeyboardControls.stopMotion()` (`interaction/controls/keyboard.ts`) arrête seulement la glissade ;
  `CameraController.setEnabled(false)` l'appelle au lieu de `release()`, gardée pour la perte du focus. Effet de
  bord : Espace toujours maintenue à l'arrivée, le glisser déplace encore la vue. Vérifié à l'œil dans l'appli
  (plongée Espace maintenue, puis relâchement pendant la transition) ; pas de test unitaire (environnement de test
  sans DOM).
