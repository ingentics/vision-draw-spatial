# Tronc : décor des calques dans `view/`, règles de `LayersSection` au moteur, registre, contrat

> Audit 542 — tronc et appli (reprise de 519, 523, 529, 537, 540)

- Constats :
  - `core/domains/document/pageLayers.ts` mêle écritures des calques et décor Three.js de la scène (`decorate`,
    `redecorate`, l.71-92, imports `three` et `render/meshes`).
  - `src/app/context/LayersSection.tsx:42-44` compte les éléments par calque ; l.176-181 lit et borne l'élévation
    (redit `Math.max(0, …)` de `pageLayers.ts:142`).
  - `core/shapes/registry.ts` (463 → 534 lignes) : une dizaine de délégations vers `libraryStore`.
  - `ModeParts.comment(shape, part, page)` (`core/modes/types.ts:321`) n'a pas l'ordre `(page, shape, part)` de
    `at` / `bounds` / `text`.
  - Commentaires : doc de `hasLayers` au-dessus de `showsGrid` (`core/modes/registry.ts:134-138`) ; phrase coupée
    (`core/modes/types.ts:437-439`).
  - `PageLayersView`, rendu par `Engine.getPageLayers`, absent de `src/index.ts`.
- Ce qu'on veut : décor des plans de calque dans un module de `view/` (à côté de `layerSpreads`) ; nombre d'éléments
  par calque dans `PageLayersView` et lecture de l'élévation dans une règle pure du moteur ; bibliothèques exposées
  par le registre sous un seul accès (le store) ; `comment(page, shape, part)` ; commentaires remis ;
  `PageLayersView` exporté.
- Écart de comportement : aucun. `comment` change l'ordre de ses paramètres pour les modes (rdd, states, eventstorming).
- Tests : tests existants intacts ; test de la lecture d'élévation.
- Docs : `AJOUTER_UN_MODE.md` (`parts.comment`), SUMMARY §3.
- **Fini quand :** calques et palette des bibliothèques inchangés à l'œil ; `registry.ts` sous 480 lignes ;
  `make check` vert.
