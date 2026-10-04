# PlantUML : participants ordonnés, activations et retours

> Itération — export PlantUML des flux ; reprise de 90

- Les participants sont tous déclarés en tête, dans leur ordre de première apparition, avec un alias et leur rang :
  `participant "Client" as P1 order 1`. Les messages, retours générés compris, n'utilisent que les alias.
- Chaque aller active sa cible (`A -> B ++`), la première flèche comprise. Un aller vers l'extérieur (`A ->]`) n'active
  rien.
- Une flèche en pointillés B → A qui ferme un aller A → B encore ouvert est son retour : `B --> A --`. Les allers
  ouverts au-dessus de lui sont d'abord refermés. Une flèche en pointillés qui ne ferme aucun aller reste un message
  simple (`B --> A`). Une flèche pleine B → A est toujours un nouvel aller.
- Retours générés (sans texte), du plus récent au plus ancien : quand un aller part d'un autre participant que la
  dernière cible activée, les allers ouverts sont refermés jusqu'à celui dont la cible est la source ; à la fin du
  flux, tous ceux qui restent. Retour vers l'extérieur : `[<-- B --`.
- **Fini quand :** sur un flux Client → API, API → Base, API → Cache, l'export déclare `P1` à `P4` avec `order 1` à `4` puis donne `Client -> API ++`,
  `API -> Base ++`, `Base --> API --`, `API -> Cache ++`, `Cache --> API --`, `API --> Client --` ; le rendu
  plantuml.com montre les barres d'activation ; `make check` vert.
- Fait : `engine/modes/sequences/export/plantuml.ts` — participants avec `order`, messages construits sur une pile
  d'appels (allers ouverts) : `++` sur chaque aller vers une forme, retour en pointillés reconnu sur la pile, retours
  générés en refermant la pile ; flèches vers l'extérieur par `message()`. Tests dans
  `tests/engine/modes/sequencesExport.test.ts` (fixture, scénario Client / API / Base / Cache, retours en pointillés,
  aller plein en sens inverse, extrémités libres). Vérifié dans l'appli : barres d'activation et retours dans le rendu
  plantuml.com.
