# Pas du déplacement au clavier dans les paramètres

> Itération — paramètres (édition) ; reprise de 123

- Paramètres globaux, section Édition, sous-section « Déplacement au clavier » :
  - `edit.nudgeStep` : pas d'une flèche du clavier, en pixels de page (1 à 50, défaut 1) ;
  - `edit.nudgeCoarseStep` : pas avec Maj (0 à 100, défaut 0 = un pas de grille, calé sur la grille ; sinon en
    pixels, sans calage).
- **Fini quand :** les deux réglages apparaissent dans les paramètres, changent le pas des flèches (et de Maj +
  flèche) aussitôt, et sont gardés au rechargement ; `make check` vert.
- Fait : `EditSettings.nudgeStep` / `nudgeCoarseStep` (défauts, bornes et relecture dans `settings.ts`, SPEC §16)
  lus par `Engine.nudgeSelection()` ; sous-section « Déplacement au clavier » de la section Édition des paramètres
  (`SettingsPanel.tsx`, « grille » affiché à 0). Vérifié dans l'appli : pas réglé à 50 px → deux appuis sur →
  déplacent « DB » d'environ 100 px, réglage retrouvé après rechargement, remis à 1 px.
