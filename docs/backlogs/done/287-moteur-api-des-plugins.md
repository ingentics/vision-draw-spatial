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
- Fait :
  - `src/engine/core/plugins/index.ts` : sans code, réexporte nommément ce que les plugins utilisaient déjà du tronc
    (inventaire relevé sur les imports), soit environ 70 symboles :
    - contrats : `ShapeDefinition` et ses types, `PageModeDefinition`, `ModeEdit`…, `PageEffectDefinition`,
      `PluginSetting`, `PluginValues` ;
    - modèle, `SPATIAL` et `spatial*`, `model/geometry`, `model/styleValues` ;
    - briques de dessin : `render/flat/box`, `render/iso/block`, `render/geometry/*`, `render/lines`,
      `render/meshes`, `render/styleColors`, `render/textMeasure`, `PART_ORDER`, `format/stencil` ;
    - règles d'édition : `SIDE_NORMALS`, `sideOfConstraint` ;
    - `DEFAULT_MODE_PALETTE`.

    Registres, `applyModeEdit`, `shapesByMode` et `pageRoom` n'y sont pas.
  - Tous les imports des plugins vers le tronc passent par ce fichier (réécriture par script). Seule la racine de
    composition `plugins/index.ts` importe encore le tronc directement.
  - Mode Séquences : il n'importe plus ni `settings` ni `stylePresets`. `FLOW_COLORS` vaut `DEFAULT_MODE_PALETTE`
    (`core/settings/derived.ts`, = `modePalette(DEFAULT_SETTINGS.styles)`), mêmes couleurs qu'avant (test inchangé).
    Choix : la couleur par défaut d'un mode est celle que l'appli donne avec ses paramètres par défaut ; c'est donc au
    tronc de la fournir, pas au mode de la recalculer depuis les styles.
  - Lint en liste blanche pour les plugins :
    - tout `core/` refusé sauf `core/plugins`, ainsi que la façade, `events` et la racine de composition ;
    - tout paquet refusé sauf `three` ;
    - les interdits entre plugins restent (sujet 286).

    Vérifié par des imports d'essai : forme → `core/domains` et → `core/model/geometry` refusés, → `core/plugins`
    permis ; mode → `pako` refusé, → `three` permis ; effet → `core/render/pageScene` refusé ; mode → façade refusé ;
    forme → base `generic/` permise.
  - Ce que la lint ne sait pas dire (motifs sur le texte de l'import) est couvert par le nouveau test
    `tests/engine/plugins/boundaries.test.ts`, sur chemins résolus : un plugin n'importe que son dossier,
    `core/plugins` et `three` ; une forme, aussi `plugins/shapes/`. Il a relevé, sur des fichiers d'essai retirés
    ensuite, `'../..'` vers la racine de composition et un fichier de mode hors `shapes/` qui importait une base
    générale.
  - Réglage commun :
    - `PluginSetting`, `PluginSettingValue`, `PluginValues`, `PluginSettings`, `readPluginSetting` et `pluginValues`
      (`core/settings/pluginSettings.ts`) remplacent `ModeSetting`, `ModeSettingValue`, `ModeValues`, `EffectSetting`
      et `EffectValues` (supprimés, y compris des exports de `engine`) ;
    - les deux registres lisent par `pluginValues` ;
    - les paramètres enregistrés `effects` et `modes` ont le même type et la même fusion (`mergePluginSettings`).

    Les clés enregistrées ne changent pas ; les réglages de la forêt déclarent `type: 'number'`.
  - Écarts de comportement :
    - la sous-page Paramètres › Effets est rendue par le même composant que celle des modes (`PluginSettingFields`) :
      nombres au format français (« 1 200 px » au lieu de « 1200 px ») ;
    - une valeur d'effet enregistrée non numérique est maintenant gardée par la fusion, puis ignorée par le registre
      (elle était écartée à la fusion).
  - Doc : `AJOUTER_UNE_FORME.md` (exemple d'imports, ce qu'une forme importe), `AJOUTER_UN_MODE.md`, `coding.md` §5,
    SPEC §4.2, `SUMMARY.md` §3.
  - Validation :
    - `make check` vert (105 fichiers, 2027 tests, dont `boundaries.test.ts` et `core/settings/pluginSettings.test.ts`) ;
    - dans l'appli : les modules des plugins sont servis branchés sur `core/plugins`, et la sous-page Effets montre la
      forêt avec ses cinq réglages et leurs valeurs ;
    - la page RDD s'affiche comme avant : palette RDD, section du mode, 2 diagnostics de la fixture.
