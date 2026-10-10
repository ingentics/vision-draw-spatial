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
- Fait : `SUMMARY.md` : Event storming résumé avec l'aimantation, les cases et l'échange, l'ordre de dessin et le nom
  du type enregistré ; « Où regarder », ligne « Nouveau mode » : `plugins/modes/eventstorming/`, avec le fichier
  d'exemple de chaque point d'entrée de 477, 478 et 481 et la police nommée (la carte de `core/format/` cite
  `fileLabels` depuis 503). `AJOUTER_UN_MODE.md` : ligne `gestures.dragPlaces` du tableau des garanties avec le survol
  et le dépôt depuis la palette (page du modèle, forme que le modèle créerait) ; paragraphe de `dragPlaces` replié.
  `AJOUTER_UNE_FORME.md` : `description` d'un élément de palette (479) et police nommée (`fontFamily`, mesure avec
  `family`, repli en Roboto si l'hôte ne la fournit pas). SPEC §14.5 : ordre de dessin d'une colonne (502). Chemins
  cités vérifiés (tous présents) ; `guides.test.ts` vert. Écart : aucun (docs seules).
