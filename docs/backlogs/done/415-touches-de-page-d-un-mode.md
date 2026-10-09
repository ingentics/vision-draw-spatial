# Moteur : touches de page d'un mode (zone de dessin, sans sélection)

> Itération — moteur, modes de page (`src/engine/core/modes/`, clavier). Nécessaire à 414 (Tab bascule la couche RDD).

- Aujourd'hui, un mode ne peut prendre une touche (`keys`, `ModeKey`) que sur l'élément sélectionné seul
  (`modePanel.modeKey`, appelé par `runEditKey` dans `interaction/controls/keyboard.ts`).
- Nouveau : `pageKeys?: Record<string, ModePageKey>` sur `PageModeDefinition`, par `KeyboardEvent.key` (ex. `Tab`).
  Une touche de page est prise quand la zone de dessin a le focus, qu'aucun texte n'est en édition et que **rien
  n'est sélectionné** sur la page courante. Sans Ctrl, Cmd ni Alt ; une répétition (touche maintenue) est ignorée.
- `ModePageKey` : `label` ; `applies?(page, current)` (la touche est-elle prise ? défaut : oui) ;
  `run(page, current)` renvoie le nouveau courant du mode (`ModeCurrent`) ou rien. Pas d'écriture dans le fichier ni
  d'étape d'annulation : le courant est un état de session. Marche aussi sur une page en lecture seule.
- Touche prise : `preventDefault` (Tab ne fait plus sortir le focus de la zone de dessin). Touche non prise : rien
  ne change (le navigateur garde son comportement).
- Un raccourci de l'appli réglé sur la même touche passe avant la touche du mode.
- Doc : `docs/AJOUTER_UN_MODE.md` et SPEC (touches d'un mode).
- **Fini quand :** testé dans le moteur (touche prise sans sélection, ignorée avec une sélection, en édition de texte,
  avec Ctrl/Cmd/Alt ou en répétition ; le courant change) ; à l'œil dans l'appli avec 414 (Tab sur une page RDD sans
  sélection bascule la couche, avec une forme sélectionnée Tab ne fait rien de plus qu'aujourd'hui).
- Fait : `pageKeys` (`ModePageKey` : `label`, `applies?`, `run`) sur `PageModeDefinition` (`core/modes/types.ts`,
  exporté par `core/plugins`). `ModePanel.modePageKey(key, run)` : mode de la page courante, rien de sélectionné,
  `applies` puis `run` (via `pageModes.call`, pannes signalées), le courant renvoyé est choisi
  (`setModeCurrent`) ; rien n'est écrit ni annulable. Clavier (`interaction/controls/keyboard.ts`) :
  `isPageKeyCandidate` (focus sur la zone de dessin, sans Ctrl/⌘/Alt, ni raccourci de l'appli ni touche de
  mouvement de la vue — déplacement, rotation, Espace — sur la même touche : ceux-ci passent avant) puis
  `host.modePageKey` (`CameraHost`, branché dans `cameraControls.ts`) ; touche prise : `preventDefault` ; maintenue
  (`repeat`) : prise sans être refaite. Doc : `docs/AJOUTER_UN_MODE.md` (définition, règles, tableau des points
  d'entrée) et SPEC (touches d'un mode). Validé par les tests (`modePageKeys.test.ts` : prise sans sélection,
  ignorée avec une sélection ou une touche non concernée, maintenue, panne ; `controls.test.ts` : focus, édition
  de texte, Ctrl/⌘/Alt, raccourci et touches de mouvement prioritaires) ; la vérification à l'œil se fera avec 414
  (aucun mode n'a encore de touche de page).
