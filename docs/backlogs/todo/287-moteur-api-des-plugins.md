# Moteur : API des plugins (`core/plugins`), seule porte d'entrée des extensions

> Architecture du moteur — étanchéité des plugins. Dépend de 286.

- `src/engine/core/plugins/index.ts` est le seul fichier du tronc qu'un plugin (forme, mode, effet) peut importer. Il
  ne contient pas de code : il réexporte ce que le tronc offre aux plugins. En faire partie est une décision visible
  dans un diff.
  - Contrats : `ShapeDefinition` et ses types, `PageModeDefinition`, `ModeEdit` et leurs types, `PageEffectDefinition`,
    `EffectRoom`.
  - Modèle : types du modèle neutre, `spatialValue`, `spatialNumber`, `SPATIAL`.
  - Calcul : `model/geometry`, `model/styleValues`.
  - Briques de dessin employées aujourd'hui : `render/meshes`, `render/geometry/{paths,stroke,orient,curves}`,
    `render/flat/box`, `render/iso/block`, `render/lines`, `render/textMeasure`, `render/styleColors`,
    `format/stencil`.
  - Règles d'édition : `SIDE_NORMALS`, `sideOfConstraint`, `edit/stylePresets`.
- Côté tronc, ce qui héberge les plugins sans leur être destiné (registres, `applyModeEdit`, `shapesByMode`,
  `pageRoom`) n'est pas réexporté.
- Le mode Séquences n'importe plus `settings` : il calcule ses couleurs par défaut sans passer par `modePalette`
  (l'appli fournit déjà `ModeEdit.palette`), ou le kit les réexporte, au choix motivé dans le « Fait : ».
- Lint en liste blanche pour `src/engine/plugins/**` :
  - permis : `core/plugins` (le barrel seul), `three`, son propre dossier ;
  - en plus pour une forme (`plugins/shapes/**`, `plugins/modes/*/shapes/**`) : `plugins/shapes/**` ;
  - tout le reste interdit : autre fichier du tronc, autre mode, autre effet, React, appli.
- Pour `src/engine/core/**`, tout import de `src/engine/plugins/**` est interdit.
- Un import refusé par la lint donne un message qui dit de l'ajouter à `core/plugins/index.ts` si c'est une brique
  commune.
- Réglage d'extension commun : `ModeSetting` et `EffectSetting` deviennent un même type (`PluginSetting` : nombre
  borné, case, couleur), lu et borné par une seule fonction partagée par les deux registres. Un effet garde des
  réglages nombres seulement s'il n'en déclare pas d'autres. Les clés enregistrées dans les paramètres ne changent
  pas.
- Mis à jour : `AJOUTER_UN_MODE.md`, `AJOUTER_UNE_FORME.md` (ce qu'un plugin peut importer), `coding.md` §5.
- **Fini quand :**
  - aucun plugin n'importe autre chose que `core/plugins`, `three`, son dossier (et `plugins/shapes/` pour une forme) ;
  - un import interdit volontaire (forme → `core/domains`, mode → autre mode, effet → `core/render/pageScene`) est
    refusé par `make lint` (vérifié puis retiré) ;
  - les deux registres lisent les réglages par la même fonction (test sur nombre hors bornes, mauvais type, absent) ;
  - `make check` vert ; l'appli affiche comme avant une page RDD, une page Séquences et la forêt.
