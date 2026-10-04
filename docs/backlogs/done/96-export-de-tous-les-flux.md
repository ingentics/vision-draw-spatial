# Export de tous les flux d'une page

> Itération — export des flux ; reprise de 90 à 94

- Moteur : un exporteur sans flux donné exporte tous les flux de la page dans un seul diagramme. En PlantUML : titre =
  nom de la page ; participants de tous les flux déclarés en tête (ordre de première apparition, alias et `order`
  communs) ; chaque flux, dans l'ordre de la liste, commence par `== Titre du flux ==` et suit les règles de pile des
  sujets 91 à 94 ; ses allers encore ouverts sont refermés avant le flux suivant.
- Appli : la liste déroulante de la fenêtre d'export commence par « Tout » ; le flux courant reste choisi à
  l'ouverture.
- **Fini quand :** sur `flows.drawio`, « Tout » donne `title Page-1`, les quatre participants, `== Inscription flow ==`
  puis ses messages, `== Sending flow ==` puis les siens, rendus par plantuml.com ; `make check` vert.
- Fait : `engine/modes/sequences/export/` — `SequenceExporter.export(page, flowId?)` : sans flux, toute la page ;
  `plantuml.ts` sépare la pile d'un flux (`messages`) de l'assemblage (participants communs, une section `== … ==` par
  flux, ligne vide entre deux). `ExportViewer.tsx` : option « Tout » en tête de la liste. Tests sur `flows.drawio` et
  sur la fixture `sequences.drawio` (flux vide). Vérifié dans l'appli : « Tout » rend les quatre flux avec leurs
  séparateurs, titrés « Séquences ».
