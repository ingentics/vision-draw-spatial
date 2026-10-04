# PlantUML : un appel à soi-même n'ouvre pas de niveau

> Itération — export PlantUML des flux ; reprise de 92

- Une flèche pleine d'un participant vers lui-même est un message simple (`P2 -> P2 : Create`) : ni `++`, ni retour
  généré, la pile ne change pas.
- Les tests d'export utilisent la fixture `flows.drawio` (acteur, base, appel à soi-même, forme sans texte).
- **Fini quand :** sur `flows.drawio`, le flux « Inscription flow » donne `P2 -> P2 : Create` puis
  `P2 -> P3 ++ : Notify` sous le même niveau que `send form`, et un seul `P2 --> P1 --` à la fin ; `make check` vert.
- Fait : `engine/modes/sequences/export/plantuml.ts` — un aller vers soi-même (comme vers l'extérieur) n'a pas de
  `++` et ne s'empile pas ; il remonte toujours la pile s'il part d'un participant plus bas. Fixture
  `tests/fixtures/flows.drawio` (fournie par l'utilisateur) ajoutée ; tests sur ses deux flux et sur un appel à
  soi-même après un aller imbriqué, dans `tests/engine/modes/sequencesExport.test.ts`.
