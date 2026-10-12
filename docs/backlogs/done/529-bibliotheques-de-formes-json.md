# Bibliothèques de formes chargées depuis un JSON

> Milestone 2 — Éditeur. Formes « dynamiques » : purement visuelles (rendus 2D, iso, 3D), sans comportement, décrites
> par des données et non par du code. Premier des sujets 529 à 531.

- **API du moteur** (façade `Engine`, réexportée par `src/engine/index.ts`) :
  - `registerShapes(json: unknown): ShapeLibraryResult` : valide le JSON et enregistre la bibliothèque (ses catégories
    et ses formes). Rend `{ ok: true, library }` ou `{ ok: false, errors: string[] }` (messages en français, avec le
    chemin du champ fautif, ex. `shapes[2].render.outline : au moins 3 points`). Un JSON refusé n'enregistre rien.
  - **Pas de version de bibliothèque :** réenregistrer un `library.id` déjà chargé **remplace** la bibliothèque
    entière (catégories et formes), sans erreur.
  - `unregisterShapes(libraryId: string): boolean` : retire la bibliothèque ; faux si elle n'était pas chargée.
  - `shapeLibrary(libraryId)` / `shapeLibraries()` : les bibliothèques chargées, en lecture seule (métadonnées, `meta`
    compris).
  - Après un enregistrement, un remplacement ou un retrait : la page est redessinée et la palette de la page est
    recalculée (événement existant de changement de palette, ou nouvel événement `shapeLibrariesChange`).
- **Format** (`format: "drawio-spatial/shapes"`, `formatVersion: 1`) :
  - `library` : `id` (obligatoire, `PLUGIN_ID_PATTERN`), `name` (obligatoire), `description`, `author`, `license`,
    `homepage`, `tags` (facultatifs), `meta` (objet libre).
  - `categories[]` : `id` (obligatoire, `PLUGIN_ID_PATTERN`, propre à la bibliothèque), `name`, `order` ; au moins une.
  - `shapes[]` (au moins une) : `id` (obligatoire, `PLUGIN_ID_PATTERN`, unique dans la bibliothèque), `category` (une
    des `categories`), `name`, `description`, `keywords`, `size: { width, height }` (> 0), `style` (style draw.io posé
    à la création, défaut `whiteSpace=wrap;html=1;`), `value` (défaut `""`), `icon` (contenu SVG d'un cadre
    `0 0 40 28`, comme les formes intégrées), `modes` (facultatif, ids de modes de page, voir Palette), `meta` (objet
    libre), et `render` :
    - `outline` : contour fermé, points `[x, y]` en fraction des bornes (0 à 1), au moins 3 ;
    - `details` (facultatif) : tracés `{ path: [[x, y], …], closed?, filled? }`, même repère ;
    - `depth` (facultatif) : hauteur du volume en px ; défaut `view.isoDepth`.
  - `formatVersion` inconnu : refusé (« version de format 2 non gérée »). **Clés inconnues ignorées** sans erreur, à
    tous les niveaux : un champ ajouté plus tard ne change pas `formatVersion`. `meta` est gardé tel quel, jamais lu
    par le moteur.
- **Rendu** : chaque forme devient une `ShapeDefinition` construite sur les bases existantes (`generic/stencil` pour
  le contour étiré dans les bornes, orienté par `direction` et les retournements ; `generic/box` pour les détails et le
  prisme en iso / 3D). Contour aussi utilisé au clic, pour les flèches et dans la mini-carte.
- **Identité** : une forme de bibliothèque est désignée par la paire (`library.id`, `shape.id`) ; elle n'entre jamais
  en conflit avec une forme intégrée ni avec une autre bibliothèque. Les catégories d'une bibliothèque sont aussi
  propres à elle (deux bibliothèques peuvent avoir chacune une catégorie `compute`).
- **Palette** : les catégories des bibliothèques s'ajoutent aux catégories des formes, rangées par `order` ; leurs
  formes se cherchent (nom, description, mots-clés, catégorie), se glissent et se cliquent comme les autres.
  - **Modes** : une forme sans `modes` est proposée sur une page sans mode. Une forme avec `modes` est proposée sur
    les pages de ces modes, dans sa catégorie, rangée par `order` avec les catégories du mode ; elle ne l'est plus
    sur une page sans mode, sauf si `modes` contient `"none"`. Une catégorie n'apparaît sur une page que si au moins
    une de ses formes y est proposée.
  - Un id de mode inconnu (mode absent du moteur) n'est pas une erreur : la forme n'apparaît simplement pas pour lui.
  - Les formes d'une bibliothèque se dessinent sur toute page, quel que soit son mode (comme les formes des modes).
- **Fini quand :** dans la console de l'appli, `registerShapes(<json d'exemple>)` fait apparaître sa catégorie dans la
  palette ; la forme se pose, se dessine à plat, en iso et en 3D avec son contour et ses détails ; un second appel
  avec un contour différent la redessine ; `unregisterShapes` fait disparaître la catégorie ; un JSON invalide rend
  ses erreurs sans rien changer. Tests : validation (champs obligatoires, bornes, clés inconnues, version), remplacement,
  retrait.
- Fait : format lu et validé par `core/shapes/library/libraryFormat.ts` (`readShapeLibrary` : erreurs avec le chemin du
  champ, clés inconnues ignorées, `meta` copié, bibliothèque gelée) ; bibliothèques rangées par
  `core/shapes/library/libraryStore.ts`, partagé par les copies du registre (`ShapeRegistry.useLibraryKit`,
  `registerLibrary`, `unregisterLibrary`, `libraryCategories`, `templates()` qui ajoute les leurs) ; dessin fourni par la
  racine de composition (`plugins/shapes/generic/library/` : `libraryShape`, boîte du contour étiré et orienté, tracés
  intérieurs, `render.depth` en hauteur du volume et aperçu du panneau tiré de l'icône). Domaine
  `domains/document/shapeLibraries.ts` (Diagnostics recalculés par `file.shapesChanged`, scènes reconstruites, événement
  `shapeLibrariesChange`) ; façade `registerShapes`, `unregisterShapes`, `shapeLibrary`, `shapeLibraries`, types
  exportés par `src/engine/index.ts` et `src/index.ts`. Palette (`PageModeRegistry.paletteFor`) : une forme de
  bibliothèque suit ses `modes` (`none` = page sans mode, défaut), quelle que soit la liste blanche du mode ; l'appli
  relit palette et « Utilisées » à chaque `shapeLibrariesChange` (`Viewer.tsx`, `useEngineEvents.ts`). Écarts : ids des
  catégories et modèles préfixés `<bibliothèque>:<id>` ; `icon` est une liste de données de tracé SVG (`d`), vérifiées
  (l'icône est injectée telle quelle dans la palette : du SVG libre d'un JSON tiers pourrait porter du script), tirée
  du contour et des tracés si absente ; `order` d'une catégorie facultatif (1000 + rang). Le registre résout déjà ici
  une forme `spatial.library` (forme chargée, ou forme non chargée de 530, dessinée par le même dossier). Validé :
  tests du format (`tests/engine/core/shapes/library/libraryFormat.test.ts`), dans l'appli (console) enregistrement,
  pose depuis la palette et retrait.
