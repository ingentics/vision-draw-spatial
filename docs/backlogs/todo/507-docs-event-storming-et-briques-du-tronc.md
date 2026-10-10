# Docs : SUMMARY, garanties de `dragPlaces`, guide d'une forme

> Audit 500 — docs (reprise de 475 à 484)

- Constats :
  - `SUMMARY.md:96` résume Event storming en « post-it typés, contacts bord à bord », sans aimantation, places, en-tête
    exporté ni ordre de dessin ; « Où regarder », ligne « Nouveau mode » (`:119`), ne cite pas
    `plugins/modes/eventstorming/`, seul exemple de `snapTargets`, `dragPlaces`, `exportedLabel` et `importedLabel` ;
    carte `core/modes/` (`:49`) sans le fichier des labels.
  - `AJOUTER_UN_MODE.md:404` : la ligne `gestures.dragPlaces` du tableau des garanties oublie le survol et le dépôt
    depuis la palette, où le mode reçoit la page du modèle et une forme construite par `shapeFromStyle`.
  - `AJOUTER_UNE_FORME.md:418` : `PaletteEntry.description` (479) absent ; rien sur un texte en police nommée
    (`fontFamily`, mesure avec `family`, repli en Roboto quand l'hôte ne fournit pas la police).
- Ce qu'on veut : ces trois docs alignées sur le code final des sujets 501 à 506.
- Écart de comportement : aucun.
- **Fini quand :** chaque chemin et nom cité existe, et un agent trouve depuis SUMMARY l'exemple de chaque point
  d'entrée ajouté par 477, 478 et 481 ; `make check` vert.
