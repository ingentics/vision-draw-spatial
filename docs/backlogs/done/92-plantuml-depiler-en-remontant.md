# PlantUML : ne dépiler qu'en remontant

> Itération — export PlantUML des flux ; reprise de 91

- Un aller ne referme les allers ouverts que s'il part d'un participant déjà dans la pile (cible d'un aller ouvert, ou
  source du premier) : on remonte jusqu'à lui, avec des retours générés. Un aller qui part d'un participant absent de
  la pile ne referme rien : il s'empile par-dessus. À la fin du flux, tout se referme, du plus récent au plus ancien.
- **Fini quand :** API → Base puis Client → API donne `API -> Base ++`, `Client -> API ++`, `API --> Client --`,
  `Base --> API --` ; A → B, B → C, A → D donne toujours `C --> B --`, `B --> A --` avant `A -> D ++` ;
  `make check` vert.
- Fait : `engine/modes/sequences/export/plantuml.ts` — un aller ne dépile que si sa source est la cible d'un aller
  ouvert ou la source du premier ; sinon il s'empile. Deux tests ajoutés dans
  `tests/engine/modes/sequencesExport.test.ts` (remontée jusqu'à la source du premier aller, aller parti hors de la
  pile). Vérifié dans l'appli : sur le flux « Connexion » (API → Base puis Client → API), Base reste activé pendant le
  login et les retours sortent en fin de flux.
