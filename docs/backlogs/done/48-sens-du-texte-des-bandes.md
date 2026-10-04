# Sens du nom sur les bandes des barres repliées

> Milestone 2 — Editor (interface de l'appli de démo) ; reprise des barres latérales repliables (47)

- Le nom écrit sur la bande d'une barre repliée se lit **de bas en haut** par défaut (il se lisait de haut en bas).
- Le sens fait partie des paramètres : `panels.stripText` (`'up'` = de bas en haut, défaut ; `'down'` = de haut en
  bas), réglable dans le panneau Paramètres, section « Barres latérales » ; valeur invalide = défaut.
- **Fini quand :** repliées, les deux bandes se lisent de bas en haut ; le réglage les passe de haut en bas et c'est
  retenu après rechargement ; test de fusion du réglage et `make check` vert.
- Fait : `engine/settings.ts` : `stripText` dans `PanelsSettings` (défaut `'up'`, liste `STRIP_TEXT`). `Sidebar` reçoit
  le sens et pose `sidebar-strip-up` / `sidebar-strip-down` ; en CSS, le texte vertical (`vertical-rl`) est retourné
  (`rotate(180deg)`) pour `up`. Panneau Paramètres : section « Barres latérales » (choix du sens, rappel des gestes de
  repli et de largeur). Tests dans `tests/engine/settings.test.ts` ; SPEC §13 et §14.1. Vérifié dans l'appli : bandes
  de bas en haut, bascule par le réglage, enregistrée dans les paramètres.
