# Machine à états : règles de gestion d'une transition

> Itération — transitions du mode Machine à états (reprise de 434, 462, 436)

- **Saisie** : dans la section « Transition » du panneau d'une flèche, champ multiligne « Règles de gestion », une règle
  par ligne (lignes vides ignorées) ; rangé dans `spatial.sm.rules` (texte libre du mode, `modeText`, comme le contenu
  d'un état). Rien n'est dessiné sur la flèche.
- **Encart du commentaire au survol** : les règles s'affichent sous le titre « Règles de gestion », une par puce
  (« • »). Avec un commentaire : après lui, sous un trait ; sans commentaire : seules. Ni l'un ni l'autre : pas
  d'encart. Point d'extension générique du tronc : `edges.note(page, edge)` (titre et texte joints au commentaire
  d'une flèche, comme le commentaire d'une partie, sujet 262).
- **Simulation** : les règles des transitions proposées s'affichent au-dessus de la barre flottante, une ligne par
  transition proposée qui en a : pastille de son numéro, nom de la transition s'il existe, puis ses règles en liste.
  Rien si aucune transition proposée n'a de règle.
- **Export PlantUML** : une transition qui a des règles est suivie de `note on link` … `end note`, une règle par ligne.
- **Fini quand :** sur la fixture, des règles saisies sur une transition sont gardées après rechargement ; au survol
  de la transition, l'encart montre le commentaire puis les règles (ou les règles seules sans commentaire) ; en
  simulation, sur l'état d'où part cette transition, ses règles s'affichent avec son numéro ; l'export PlantUML les
  porte en note sur le lien ; `make check` vert.
- Fait : `transitions/businessRules.ts` (`businessRules`, champ `RULES_PROPERTY` de la section « Transition »,
  `rulesNote` pour l'encart) ; tronc : point d'extension `edges.note` (`core/modes/types.ts`), `PageModes.edgeNote`,
  joint au commentaire au survol par `PointerInput.syncHoverComment` (même affichage que le commentaire d'une partie,
  262). Simulation : `proposedRules` (`simulationView.ts`) et `SimulationRules.tsx` au-dessus de la barre. Export :
  `note on link` dans `export/plantuml.ts`. Doc : SPEC, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli sur `states.drawio` :
  règles saisies sur « Démarrer » gardées après rechargement, encart au survol (règles seules, puis commentaire + trait
  + règles), règles avec la pastille 2 en simulation depuis State1, note dans l'export PlantUML. Test :
  `tests/engine/plugins/modes/states/transitions/businessRules.test.ts`.
