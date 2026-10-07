# PlantUML : une flèche pleine qui ferme un aller ouvert est son retour

> Itération — export PlantUML des flux ; reprise de 91

- Une flèche B → A, pleine ou en pointillés, qui ferme un aller A → B encore ouvert est son retour (`B --> A --`), les
  allers ouverts au-dessus étant refermés d'abord. Seuls les retours absents du dessin sont générés : plus de retour
  en double.
- Une flèche pleine B → A sans aller A → B ouvert reste un nouvel aller (rappel) ; une flèche en pointillés sans aller
  reste un message simple.
- **Fini quand :** les flux A → B, B → C, C → B, B → A et A → B, B → C, B → A (flèches pleines) donnent tous deux
  `P1 -> P2 ++`, `P2 -> P3 ++`, `P3 --> P2 --`, `P2 --> P1 --` ; `make check` vert.
- Fait : `engine/modes/sequences/export/plantuml.ts` — la recherche de l'aller ouvert à fermer vaut pour toute flèche
  (sauf une flèche pleine vers l'extérieur, qui reste `->]`) ; un retour dessiné s'écrit `-->` comme un retour généré,
  si bien que les deux schémas donnent le même export. Écart : une flèche pleine B → A qui ferme A → B n'est plus un
  rappel (`B -> A ++`) mais son retour. Tests dans `tests/engine/modes/sequencesExport.test.ts` (flux complet, flux à
  trou, rappel sans aller à fermer). Vérifié par les tests seulement.
