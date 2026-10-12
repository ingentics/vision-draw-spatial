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
- Fait :
  - Plans des calques dans la scène : nouveau domaine `core/domains/view/layerDecor.ts` (`decorate`, `redecorate`) ;
    `pageLayers.ts` n'importe plus Three.js et lui demande de refaire les plans quand le calque courant change.
  - `edit/layerChoice.ts` : `layerCounts(page)` (rendu par `PageLayersView.counts`) et `readElevation(texte)`
    (exporté par `src/engine/index.ts`) ; `LayersSection.tsx` ne calcule plus rien et ne reçoit plus la page.
  - Registre des formes : les dix délégations vers les bibliothèques remplacées par `registry.libraryStore` (lecture
    seule) ; 534 → 504 lignes (pas sous 480 : le reste, un accès protégé par point d'entrée des formes, n'est pas du
    sujet).
  - Contrat des modes : `parts.comment(page, shape, part)`, dans l'ordre de `at`, `bounds` et `text` (rdd,
    eventstorming, `shapeParts.ts`).
  - Commentaires remis : `hasLayers` (`core/modes/registry.ts`), `clearable` (`core/modes/types.ts`).
  - `PageLayersView` exporté par `src/index.ts`.
  - Écart de comportement : aucun. Changements d'API internes : `registry.libraryStore.*` au lieu de
    `registry.registerLibrary` et des autres ; ordre des paramètres de `parts.comment`.
  - Tests : `layerChoice.test.ts` (nombre d'éléments, élévation saisie) ; `libraryStore.test.ts`,
    `metamorphs.test.ts`, `fieldParts.test.ts`, `stickyWarnings.test.ts` suivent les nouveaux noms et l'ordre de
    `comment` ; faux cœur de `pageLayers.test.ts` complété par `layerDecor`.
  - Docs : `AJOUTER_UN_MODE.md` (`comment(page, shape, part)`).
  - Vérifié dans l'appli (`layers.drawio`, iso) : nombre d'éléments par calque, élévation saisie « 40,5 », calque
    courant changé et son plan refait en couleur d'accent, puis annulé.
