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
