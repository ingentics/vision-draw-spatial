# Rendu PlantUML par kroki.io

> Itération — fenêtre d'export des flux ; reprise de 90

- Le rendu SVG passe par kroki.io (`https://kroki.io/plantuml/svg/<code>`, même encodage que PlantUML) au lieu de
  plantuml.com, dont la version bêta mesure par moments le texte à zéro (participants écrasés, texte qui déborde).
- Le lien « Ouvrir sur plantuml.com » vers l'éditeur en ligne reste.
- **Fini quand :** le rendu de « Sending flow » (`flows.drawio`) vient de kroki.io, boîtes à la largeur de leur texte ;
  `make check` vert.
- Fait : `app/modes/sequences/plantumlServer.ts` — rendu par `KROKI_SERVER` (`/plantuml/svg/<code>`), éditeur toujours
  sur `PLANTUML_SERVER` ; test d'URL mis à jour (`tests/app/plantumlServer.test.ts`). Vérifié dans l'appli sur
  `flows.drawio` : « Sending flow » rendu par kroki.io, boîtes à la largeur de leur texte.
