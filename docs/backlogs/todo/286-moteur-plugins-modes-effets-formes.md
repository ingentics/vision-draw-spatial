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
