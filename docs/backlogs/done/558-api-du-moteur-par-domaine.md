# API du moteur regroupée par domaine

> Itération — façade du moteur (reprise de la dette 555, audit 542 ; numéro 557 pris par un autre sujet)

- Constat : `src/engine/Engine.ts` fait 943 lignes et environ 130 méthodes publiques à plat (délégation seule).
- Ce qu'on veut : composition. `Engine` garde le cycle de vie, le document, les paramètres et les métriques, et un
  objet par domaine, chacun une petite classe de `src/engine/facade/` qui délègue au cœur : `history`, `pages`,
  `view`, `graph`, `navigation`, `selection`, `edit`, `text`, `layers`, `shapes`, `generation`, `modes`, `effects`,
  `takeover` (exactement `PageTakeover`, remis aux modes de l'appli à la place du moteur entier).
- Écart de comportement : aucun. Changement cassant de l'API publique (`feat(engine)!`), renommages listés dans le
  commit.
- Tests : tests existants (imports et appels suivent) ; l'appli et le composant React suivent.
- Docs : COMPOSANT (API), SPEC (façade), SUMMARY §3.
- **Fini quand :** `Engine.ts` sous 400 lignes, aucune classe de `facade/` au-dessus non plus ; l'appli marche à
  l'œil (pages, vues, calques, édition, modes, simulation) ; `make check` vert.
- Fait :
  - `src/engine/facade/` : un objet par domaine (`HistoryApi`, `PagesApi`, `ViewApi`, `GraphApi`, `NavigationApi`,
    `SelectionApi`, `EditApi`, `TextApi`, `LayersApi`, `ShapesApi`, `GenerationApi`, `ModesApi`, `EffectsApi`,
    `TakeoverApi`), chacun délègue au cœur avec la documentation des anciennes méthodes ; `Engine.ts` passe de 943 à
    148 lignes (cycle de vie, document, métriques, paramètres, et les quatorze objets). Le plus long : `textApi.ts`,
    116 lignes.
  - `engine.takeover` implémente `PageTakeover` (avec `setModeCurrent`) : l'appli le remet aux modes à la place du
    moteur entier.
  - Appli, composant React, exemple `examples/basic`, hôte des Metamorph et bibliothèque d'exemple suivent ; faux moteur
    de `metamorphHost.test.ts` et liste blanche de `guides.test.ts` aussi.
  - Docs : SPEC §4.3 (façade par domaine) et passages qui citaient l'API, COMPOSANT (méthodes utiles, bibliothèques,
    formes générées), `AJOUTER_UN_PLUGIN.md`, `AJOUTER_UN_MODE.md`, `AJOUTER_UNE_FORME.md`, SUMMARY §3.
  - Écart de comportement : aucun ; API publique renommée (liste dans le commit). La dette 555 passe dans `done/`.
  - Vérifié dans l'appli : fichier ouvert, vue Iso, sélection et suppression, annuler / rétablir, panneau des calques,
    simulation des histoires (prise en main de la page) lancée et arrêtée, vue graphe.
