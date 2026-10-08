# Réglages déclarés par les formes, comme les modes et les effets

> Architecture du moteur — extensibilité (« déposer le dossier suffit ») ; suite de 306. Audit du 2026-10-08
> (`AUDIT.md`).

- Constat : modes et effets déclarent `settings?: PluginSetting[]` (`core/modes/types.ts:42`,
  `core/effects/types.ts:23`), les formes non (`core/shapes/types.ts:170-267`). Un réglage de forme vit donc dans le
  tronc : les étiquettes de façade (bâtiment, BDD, file, cache) sont à cinq endroits (`settings/types.ts:46-47`,
  `settings/schema/view.ts:30`, `render/types.ts:69` `volume.tags`, `domains/view/scene.ts:95`,
  `domains/view/levels.ts:30`, `src/app/SettingsPanel.tsx:483`) pour un seul lecteur
  (`plugins/shapes/generic/building/index.ts:176`). `AJOUTER_UNE_FORME.md` §4.1 (l. 339-357) en fait la procédure :
  six fichiers du tronc et de l'appli à toucher.
- Ce qu'on veut :
  - `ShapeDefinition.settings?: PluginSetting[]` ; valeurs rangées par forme (section à nommer, `settings.shapes` est
    pris), remises par le registre dans le contexte de rendu (`ctx.values`) ; sous-page de réglages générique, comme
    pour les modes ;
  - `facadeTags` y passe, repris de l'ancienne clé par `legacy` (mécanisme de 306) : aucune préférence perdue ;
  - `volume.tags` retiré du `RenderContext` ; §4.1 du guide réécrite (« déclarer `settings` »).
- **À trancher avec l'utilisateur** : le réglage est partagé par la base `generic/building` que quatre formes
  étendent : déclaré par la base et hérité, ou porté par la catégorie Architecture ? Et sa place dans Paramètres
  (aujourd'hui « Vue iso ») : sous-page « Formes › Architecture » ?
- Écart : le réglage change de place dans Paramètres ; rendu inchangé ; valeur sauvegardée reprise.
- Tests : registre (valeurs bornées, défaut, `legacy`), contexte de rendu ; `settings.test.ts` adapté.
- **Fini quand :** basculer « étiquettes sur les façades » depuis sa nouvelle place change les bâtiments en iso comme
  avant ; une préférence enregistrée avant le sujet est reprise ; `grep -rn facadeTags src/engine/core` est vide ;
  `make check` vert.
- Fait :
  - Choix (tranché par l'utilisateur) : le réglage est porté par la **catégorie Architecture**. Une catégorie de formes
    (`ShapeCategory`, `core/shapes/types.ts` : `PaletteCategory` + `settings?: PluginSetting[]`, réexporté par l'API des
    plugins) déclare ses réglages globaux ; valeurs dans la nouvelle section `settings.shapeCategories[catégorie][clé]`
    (même fusion que `modes` et `effects`, `schema/workspace.ts`). Réglages au niveau de la forme
    (`ShapeDefinition.settings`) **non faits** : il faudrait un second espace de noms (id de forme) dans les paramètres,
    une seconde sous-page et une règle de fusion forme / catégorie, sans besoin actuel ; à ouvrir en sujet si une forme
    seule en a besoin.
  - Registre des formes (`core/shapes/registry.ts`) : `values(catégorie, enregistrées)` (bornées, défaut),
    `categoryValues(section)` (catégories qui déclarent des réglages), `legacySettings(enregistrées)` ; à chaque appel de
    `sceneRenderer(…).create` et de `volumeHeight`, il remet à la forme un contexte gelé avec `values` = réglages de sa
    `palette.category` (même contexte si la catégorie n'en a pas). `RenderContext` : `volume.tags` retiré,
    `categoryValues` (rempli par `SceneView.renderContext()`) et `values` ajoutés. Vue de l'appli
    (`ShapeRegistryView`) : `categories()` et `values()`.
  - Réglage : `FACADE_TAGS_SETTING` (case, défaut activé) déclaré à côté de son lecteur, `generic/building`, et ajouté
    aux `settings` de la catégorie Architecture (`plugins/shapes/categories.ts`) ; `tagOf` lit `ctx.values.facadeTags`
    (absent = étiquettes, cas d'une forme d'une autre catégorie qui étendrait la base). `view.facadeTags` retiré
    (`ViewSettings`, schéma `view.ts`) ; `Levels.settingsChanged` surveille la section `shapeCategories`.
  - Préférence gardée : le mécanisme `legacy` de 306, retiré par 314, revient sous une forme générique :
    `PluginSetting.legacy` (chemin depuis la racine) et `legacyPluginSettings` (`core/settings/pluginSettings.ts`), lus
    pour les catégories de formes ; la racine de composition exporte `legacyShapeCategorySettings`, et
    `settingsStore.loadSettings` complète les paramètres enregistrés (`withLegacy`) : l'ancienne valeur est reprise tant
    que la nouvelle place n'en a pas ; l'ancienne clé disparaît au premier enregistrement.
  - Appli : la case quitte Paramètres › Vue › Volumes (iso et 3D) pour une sous-page générique **Formes › Architecture**
    (`SettingsPanel.tsx`, nouvelle section « Formes » avant « Modes », mêmes champs que les modes).
  - Écarts : la case change de place ; elle n'est plus grisée quand « Formes en volume » est décoché (la sous-page
    générique ne connaît pas les autres sections ; l'aide dit « En iso et en 3D ») ; rendu inchangé.
  - `grep -rn facadeTags src/engine/core` : vide.
  - Doc : `AJOUTER_UNE_FORME.md` §4.1 réécrite (« déclarer `settings` »), encadré « Ce qui touche encore le tronc »
    (trois cas, le réglage passe par `categories.ts`), tableau des origines des valeurs ; SPEC §8.3 et §13
    (`shapeCategories`) ; SUMMARY §5.
  - Tests : `legacyPluginSettings` (`settings/pluginSettings.test.ts`) ; réglages de catégorie bornés, défaut,
    `legacy`, `ctx.values` remis à la seule forme de la catégorie, aussi pour `volumeHeight`
    (`shapes/registry.test.ts`) ; reprise de `view.facadeTags`, priorité de la nouvelle place, ancienne clé non
    réenregistrée (`tests/app/settingsStore.test.ts`). Adaptés : `settings.test.ts` (défaut de `view.facadeTags`
    remplacé par la section `shapeCategories`), `storage.test.ts` (étiquettes coupées par `categoryValues` au lieu de
    `volume.tags`). `make check` vert (144 fichiers, 2263 tests).
  - Vérifié par les tests seulement (pas d'appli ouverte). À vérifier à l'œil : Paramètres › Formes › Architecture,
    décocher « Étiquettes sur les façades » : en iso, plus d'étiquette DB / QUEUE / CACHE sur les bâtiments ni de mot
    en façade des process étiquetés, la recocher les remet ; plus de case dans Vue › Volumes ; une préférence « coupée »
    enregistrée avant le sujet est reprise au rechargement.
