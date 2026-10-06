# Un mode choisit ses formes et ses modes d'affichage

> Thème — comportements de page (cadre) ; reprise de 69 (modes de page) ; préalable au mode RDD (179 et suivants)

Aujourd'hui un mode ajoute des données, des réglages et un habillage, mais la palette et les vues restent celles
d'une page normale. Un mode doit pouvoir **remplacer les formes proposées**, **apporter ses propres formes** et
**restreindre les modes d'affichage**. Le moteur ne connaît toujours aucun mode en particulier.

- **Formes propres à un mode** : `src/engine/modes/<id>/shapes/<forme>/index.ts`, même contrat `ShapeDefinition`
  que `shapes/impl/<catégorie>/<forme>/` (exporte `definition`), collectées par le registre du mode
  (`import.meta.glob`) et enregistrées dans le registre des formes. Déposer le dossier suffit.
  - Leur `id` est préfixé par celui du mode (`rdd-entity`…) pour ne jamais masquer une forme générale.
  - Elles se dessinent sur toute page (une forme collée sur une page normale reste lisible) ; seule la palette
    les réserve aux pages du mode.
- **Formes proposées (liste blanche)** : `PageModeDefinition.shapes?: string[]` (ids de formes, générales ou du
  mode). Absent = palette normale + formes du mode. Présent = la palette de la page n'affiche que ces formes ; la
  recherche de la palette aussi. Les formes déjà sur la page ne sont pas touchées, le collage n'est pas filtré.
- **Catégories de palette d'un mode** : `PaletteCategoryId` n'est plus une union fermée ; un mode déclare ses
  catégories (`id`, nom, rang) — ex. « RDD ». Une catégorie vide pour la page n'est pas affichée.
- **Modes d'affichage permis** : `PageModeDefinition.viewModes?: ViewMode[]` (`'top' | 'iso' | '3d'`). Absent = tous.
  Sur une page qui n'en permet qu'une partie : l'arrivée sur la page (ouverture, changement de page, passage dans
  le mode) bascule sur le premier mode permis ; les raccourcis `i` / `p` et les boutons des modes interdits sont
  sans effet / désactivés (avec une aide au survol « non disponible dans ce mode »). En quittant la page, la vue
  revient à celle choisie par l'utilisateur. La caméra restaurée au rechargement (`devSession.ts`) respecte la
  restriction.
- Registre : `PageModeRegistry.paletteFor(page)`, `allowsViewMode(page, mode)` sur le modèle de `allowsEffect`.
- Docs : `AJOUTER_UN_MODE.md` (dossier `shapes/`, `shapes`, catégories, `viewModes`), SPEC §14.
- **Fini quand :** un mode de test (tests) déclare une forme dans son dossier `shapes/`, une liste blanche de deux
  formes et `viewModes: ['top']` : sur une page de ce mode, la palette ne montre que ces formes dans sa catégorie,
  `i` / `p` ne changent pas la vue et la page s'ouvre en 2D même si on venait de l'iso ; une page normale garde sa
  palette et ses vues ; `make check` vert.
- Fait : formes des modes collectées par `modes/shapes.ts` (`MODE_SHAPE_DEFINITIONS`, glob `./*/shapes/*/index.ts`),
  enregistrées dans le registre des formes par défaut et réservées à la palette de leur mode ; `PageModeDefinition`
  gagne `shapes`, `paletteCategories`, `viewModes` ; `PaletteCategoryId` devient une chaîne et les catégories ont un
  rang (`order`). Registre : `paletteFor(page)` (catégories non vides, formes proposées), `allowsViewMode`,
  `viewModeFor`. Moteur : la vue appliquée est ramenée au premier mode permis (`ViewModes.constrain`, dans
  `applyCamera` et à l'arrivée d'une transition), `setViewMode` / `I` / `P` sans effet sur un mode interdit, passage
  dans le mode suivi d'un retour au mode permis (`enforce` après `documentChanged`) ; arrivée sur une page sans vue
  mémorisée dans le mode choisi par l'utilisateur (`arrivalOrientation`, retenu sur les pages sans restriction).
  Appli : palette alimentée par `paletteFor`, boutons de vue désactivés (« non disponible dans ce mode »).
  Docs : `AJOUTER_UN_MODE.md` §6, SPEC §14.5. Tests : mode de test avec sa forme dans
  `tests/engine/modes/fixtures/test/shapes/test-box/`, liste blanche de deux formes, `viewModes: ['top']`. Vérifié
  dans l'appli (Séquences restreint temporairement : palette réduite, I / P sans effet, Iso et 3D désactivés, page
  passée dans le mode ramenée en 2D, nouvelle page et page normale revenues en iso).
