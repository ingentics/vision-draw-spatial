# Barre du flux masquée dès le début de la transition

> Itération — mode Séquences (barre du flux courant) ; reprise de 80

- En quittant une page en mode Séquences (bouton « Retour », lien vers une autre page : transition « zoom + fondu »,
  SPEC §11.2), la barre du flux courant (en haut de la zone de dessin, choix du flux) reste affichée jusqu'à la fin
  de la transition et disparaît seulement à l'arrivée.
- Elle doit être masquée **au départ de la transition** (au plus tard pendant), pas à la fin : elle disparaît en même
  temps que la page qu'on quitte commence à s'effacer.
- Dans l'autre sens (arrivée sur une page en mode Séquences), la barre n'apparaît qu'à la fin de la transition.
- **Effet de glissement** : en partant, la barre remonte et sort par le haut de la zone de dessin (bas → haut) ; en
  arrivant, elle descend depuis le haut jusqu'à sa place (haut → bas). Animation courte (`ease-out` en entrée,
  `ease-in` en sortie), sans décaler le reste de l'interface.
- **Durée réglable** : nouveau paramètre `shapes.modeBarSlideDuration` (ms, 200 par défaut, de 0 à 1000 ; 0 = pas
  d'animation), dans Paramètres › Modes › Séquences › Flux courant, curseur « Glissement de la barre du flux »
  sous « Opacité hors du flux courant » ; limites dans `SETTINGS_LIMITS`, documenté dans SPEC (§ paramètres et
  flux courant).
- **Fini quand :** sur une page en mode Séquences, un clic sur « Retour » fait remonter la barre du flux hors de la
  vue dès le début du zoom, elle n'est plus visible pendant la transition, et en arrivant sur une page en mode
  Séquences elle descend à sa place à la fin de la transition ; changer le réglage de durée change la vitesse du
  glissement (0 = la barre disparaît et apparaît sans animation) ; `make check` vert.
- Fait : la barre (`SlidingModeBar`, `src/app/ModeBar.tsx`) part sur l'événement `transitionStart` et revient sur
  `transitionEnd` (état `transitioning` dans `src/app/Viewer.tsx`) ; sortie par transition CSS (`ease-in`), entrée
  par animation CSS (`ease-out`), durée en variable `--mode-bar-slide` (`src/app/main.css`) ; la barre garde son
  dernier flux pendant la sortie et ne reçoit pas de clic (`inert`). Paramètre `shapes.modeBarSlideDuration`
  (`src/engine/settings.ts`, 0–1000 ms par 10, défaut 200) et curseur dans Paramètres › Modes › Séquences ; SPEC
  mise à jour. Vérifié dans l'appli (`fixtures/sequences.drawio`) : la barre remonte en 200 ms dès le début de la
  transition, reste absente pendant, et redescend en 200 ms à la fin.
