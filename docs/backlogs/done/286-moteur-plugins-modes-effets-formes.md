# Moteur : modes, effets et formes rangés en plugins

> Architecture du moteur — étanchéité des plugins. Dépend de 285 ; précède 287.

- Nouveau dossier `src/engine/plugins/` : les extensions du moteur, chacune dans son dossier, découvertes toutes
  seules.
  - `plugins/modes/<id>/` : l'actuel `modes/rdd/`, `modes/sequences/` (avec leurs formes `shapes/<forme>/`).
  - `plugins/effects/<id>/` : l'actuel `effects/forest/`.
  - `plugins/shapes/<catégorie>/<forme>/` : l'actuel `shapes/impl/` ; les bases communes de l'actuel
    `shapes/generic/` (box, building, cylinder, stencil, tagged-process) vont dans `plugins/shapes/generic/`, sans
    `definition` exportée (ce ne sont pas des formes), comme `rdd/shapes/common/`.
- Une forme peut en étendre une autre : une forme de `plugins/shapes/` peut importer une autre forme ou une base de
  `plugins/shapes/` (déjà le cas : `circle` → `ellipse`, `title` → `text`, `rounded-rectangle` → `rectangle`). Une
  forme d'un mode peut aussi étendre une forme de `plugins/shapes/`. Rien n'importe les formes d'un mode.
- Restent dans le tronc (`core/`) ce qui fait tourner les plugins sans en être un :
  - formes : `registry.ts`, `types.ts`, `minimapOutline.ts`, `placeholder.ts` (repli d'une forme inconnue) →
    `core/shapes/`. Le groupe (`impl/internal/group`) reste aussi dans `core/shapes/` : sans lui, un groupe draw.io ne se
    lit plus.
  - modes : `registry.ts`, `types.ts`, `modeEdits.ts`, `modeShapes.ts` → `core/modes/` ;
  - effets : `registry.ts`, `types.ts`, `room.ts` → `core/effects/`.

  Le sujet 287 en fait l'API des plugins.
- **Racine de composition** `src/engine/plugins.ts` : elle seule fait les `import.meta.glob` des plugins
  (`plugins/shapes/**/index.ts`, `plugins/modes/*/index.ts`, `plugins/modes/*/shapes/*/index.ts`,
  `plugins/effects/*/index.ts`) et construit les registres par défaut (`defaultShapeRegistry`,
  `defaultModeRegistry`, `defaultEffectRegistry`). `core/` ne cite plus aucun chemin de `plugins/`.
- Effets découverts comme les modes : la liste en dur `PAGE_EFFECT_DEFINITIONS = [forest]` disparaît ; déposer le
  dossier suffit.
- `edit/palette.ts` ne calcule plus `SHAPE_TEMPLATES` au chargement du module depuis le registre par défaut : les
  modèles de palette viennent du registre que la racine de composition construit (exportés par `engine/index.ts` sous
  les mêmes noms).
- Miroir côté appli : `src/app/modes/` → `src/app/plugins/modes/` (`<id>/index.tsx`, `registry.ts`, `ModeFields.tsx`).
  L'API d'un mode pour sa partie appli devient `engine/plugins/modes/<id>/api.ts`.
- Miroir des tests : `tests/engine/modes|effects|shapes` → `tests/engine/plugins/...` pour les plugins,
  `tests/engine/core/...` pour le tronc ; fixtures de test (mode et forme de test) déplacées avec eux.
- Lint (`.eslintrc.cjs`) : chemins mis à jour. Le contenu des règles change seulement pour les effets, qui reçoivent
  les mêmes interdits que les modes. Les formes de `plugins/shapes/` peuvent s'importer entre elles. La liste blanche
  arrive au sujet 287.
- Mis à jour : `AJOUTER_UNE_FORME.md`, `AJOUTER_UN_MODE.md`, `SUMMARY.md` §3 et §5, SPEC §4, `coding.md` §2.
- Comportement inchangé.
- **Fini quand :** l'arborescence est celle décrite. Un dossier d'effet de test déposé dans `plugins/effects/` est pris
  sans toucher au registre (test). `make check` vert. Dans l'appli, les formes de chaque catégorie de la palette, une
  page RDD, une page Séquences et la forêt en iso s'affichent comme avant.
- Fait :
  - Arborescence :
    - `src/engine/plugins/` : `shapes/` (l'ancien `shapes/impl/`, plus `shapes/generic/`), `modes/rdd/`,
      `modes/sequences/`, `effects/forest/` ;
    - tronc dans `src/engine/core/` : `shapes/` (`types`, `registry`, `placeholder`, `minimapOutline`, et `group.ts`
      qui exporte `groupShape`), `modes/` (`types`, `registry`, `modeEdits`, `modeShapes`), `effects/` (`types`,
      `registry`, `room`) ;
    - côté appli : `src/app/plugins/modes/`.
  - Imports réécrits par script (125 fichiers déplacés, 149 réécrits).
  - Écart au sujet : la racine de composition est `src/engine/plugins/index.ts`, et non `src/engine/plugins.ts` (pas de
    fichier et de dossier de même nom, `coding.md` §2). Elle seule fait les `import.meta.glob`, avec
    `!./shapes/generic/**` pour exclure les bases. Elle construit `defaultShapeRegistry` (le groupe d'abord),
    `defaultModeRegistry`, `defaultEffectRegistry`, `SHAPE_TEMPLATES` et `usedTemplates(page)`. Les registres de
    `core/` ne gardent que leurs classes.
  - Le tronc ne connaît plus les registres par défaut :
    - `EngineCore` reçoit les registres résolus (`PluginRegistries`) ; c'est la façade `Engine.ts` qui prend ceux
      donnés, sinon ceux par défaut ;
    - `core/edit/palette.ts` ne calcule plus `SHAPE_TEMPLATES` ; `usedTemplatesIn(page, registry)` remplace
      `templateOfShape` (les tests appellent `registry.templateOf`) ;
    - `PageModeRegistry.paletteFor` demande ses modèles : l'appli passe `SHAPE_TEMPLATES`.
  - Effets découverts comme les modes : la liste `[forest]` a disparu.
  - Lint (`.eslintrc.cjs`) :
    - `core/` n'importe rien de `plugins/` ;
    - un mode n'importe ni un autre mode, ni un effet, ni l'état ou les couches internes du moteur ;
    - un effet, pareil, et ni mode ni forme ;
    - une forme n'importe ni mode ni effet, mais peut étendre une autre forme, et une forme de mode une forme de
      `plugins/shapes/`.

    Les motifs portent sur le texte de l'import : ils nomment les dossiers (`**/modes/**`, `**/<autre mode>/**`).
    Vérifié par des imports d'essai : refusés pour effet → mode, mode → mode, mode → effet, forme → mode, forme →
    `core/domains`, `core/` → plugin ; acceptés pour forme → base `generic/` et forme de mode → forme générale.
  - Tests en miroir :
    - `tests/engine/core/{shapes,modes}/registry.test.ts` (avec `fixtures/`) ;
    - `tests/engine/plugins/{shapes,modes,effects}/` ;
    - nouveau `tests/engine/plugins/index.test.ts` : un effet par dossier, id = dossier, enregistré sans liste ; les
      bases `generic/` ne sont pas des formes.

    Le contrat des dossiers de formes ne liste plus `internal/group` ; il vérifie à la place que le registre par
    défaut résout `group` en `groupShape`.
  - Doc mise à jour : `AJOUTER_UNE_FORME.md` (arborescence, collecte), `AJOUTER_UN_MODE.md`, `SUMMARY.md` §3 et §5,
    SPEC §4.2, §8.2 et modes, `coding.md` §2. Commentaires du code et `Makefile` (`drawio-check`) suivis.
  - Comportement inchangé.
  - Validation :
    - `make check` vert (103 fichiers, 2024 tests, dont les 2 nouveaux) ;
    - dans l'appli : aucune requête en erreur et 40 modules servis depuis `plugins/`. La palette normale montre ses
      trois catégories. La page Séquences a sa barre de flux courant, sa section FLUX et l'export PlantUML. La page RDD
      a sa palette réduite à « RDD », toutes ses formes sont reconnues et ses contrôles de diagnostic sont là. La forêt
      pousse en iso sur la fixture des formes.
    - Le serveur partagé a dû être redémarré : son observateur de fichiers avait perdu des changements pendant les
      déplacements et servait l'ancienne `palette.ts`.
