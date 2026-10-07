# Rangement et nommage des dossiers du moteur

> Idée — dette technique du moteur (lisibilité) ; après 207

- La séparation logique pure (`edit/`, `interaction/`, `format/`, `render/`) / état (`core/`, un dossier par
  domaine) est bonne mais les noms ne la disent pas. Homonymes :
  - `interaction/camera` / `core/view/camera`, `interaction/minimap` / `core/view/minimap` / `shapes/minimap` ;
  - `interaction/history` / `core/navigation/history`, `interaction/transitions` / `core/navigation/transition` ;
  - `interaction/selection` / `core/selection/selection`, `interaction/controls/` + `controls.ts` /
    `core/input/controls` ;
  - `edit/handles` / `core/edit/handles` / `core/edit/edges/handles` / `render/handles` ;
  - `edit/undo` / `core/document/undo`, `edit/move` / `core/edit/drag/move`, `edit/styles` /
    `core/edit/commands/styles`, `format/clipboard` / `core/edit/commands/clipboard` ;
  - `edit/edgePoints` / `core/edit/drag/edgePoints` / `core/edit/edges/points`, `render/edges/jumps` /
    `core/edit/edges/jumps` ;
  - `edit/labelPosition` / `render/labelPosition`, `render/highlight` / `core/selection/highlight` ;
  - `modes/` (registre et modes RDD, séquences) / `core/modes/pageModes`, `modes/edit.ts` / `edit/`.
- `interaction/camera.ts` (628 lignes) est de la géométrie de caméra, pas de l'interaction.
- Fichiers mal placés : `pageGeometry` (dans `edit/anchoring/auto/distribute.ts`, utilisé par `core/document/file`,
  `core/document/undo` et `core/edit/drag/gesture`) ; `persistence/` et `edit/autosave.ts`, utilisés seulement par
  `react/`, `app/` et l'API publique, jamais par le moteur.
- Au minimum, une ligne d'en-tête par dossier (pur ou avec état) ; au mieux, renommer pour refléter le rôle.
