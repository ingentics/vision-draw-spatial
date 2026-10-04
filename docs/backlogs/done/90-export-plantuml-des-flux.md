# Exporter un flux en PlantUML

> Milestone — mode Séquences ; reprise de 70. Premier exporteur d'une série (d'autres formats suivront).

- Le moteur fournit le texte : un exporteur de séquence (`engine/modes/sequences/export/`) a un id, un nom et une
  fonction `(page, flowId) → texte`. Le premier, PlantUML, écrit un diagramme de séquence par flux :
  - `title` : titre du flux ;
  - participants dans l'ordre de première apparition, déclarés avec leur label (alias `P1`, `P2`…) : `actor` pour une
    forme `umlActor`, `database` pour un cylindre, `participant` sinon ;
  - un message par flèche, dans l'ordre des rangs : `->` (`-->` si la flèche est en pointillés), label de la flèche
    après `:` ; extrémité sans forme : `[->` / `->]`.
- Côté appli, la section « Flux » a un bouton « Exporter en PlantUML » (flux courant) qui ouvre une fenêtre de rendu :
  choix du flux, source PlantUML (copiable) et rendu SVG du serveur en ligne plantuml.com, avec un lien pour l'ouvrir
  dans l'éditeur en ligne. Le code existant du mode n'est pas modifié au-delà du bouton.
- **Fini quand :** sur la fixture `sequences.drawio`, le bouton ouvre la fenêtre avec le diagramme du flux courant
  rendu par plantuml.com ; changer de flux dans la fenêtre change le rendu ; tests de l'exporteur et de l'encodage
  d'URL ; `make check` vert.
- Fait : moteur — `engine/modes/sequences/export/index.ts` (interface `SequenceExporter`, liste
  `SEQUENCE_EXPORTERS` où s'ajouteront les prochains formats) et `export/plantuml.ts` (`sequencePlantUml`). Appli —
  `app/modes/sequences/ExportViewer.tsx` (fenêtre modale : choix du flux, texte copiable, rendu par format connu),
  `plantumlServer.ts` (deflate brut + base64 PlantUML, `CompressionStream`), un bouton « Exporter en … » par
  exporteur sous la liste des flux ; styles `.export-dialog`. Tests : `tests/engine/modes/sequencesExport.test.ts`,
  `tests/app/plantumlServer.test.ts` (code de l'exemple officiel). Vérifié dans l'appli : le bouton ouvre le flux
  courant rendu par plantuml.com, le choix d'un autre flux change texte et rendu.
