# Tronc : plus aucune connaissance d'un plugin précis

> Architecture du moteur — étanchéité des plugins. Audit du 2026-10-07.

- Clés de formes déclarées dans le tronc : `SPATIAL.tag`, `sign`, `nodes` (`core/spatial.ts:25-29`), utilisées
  seulement par des formes (building, actors, distributed-cache). Elles passent dans leurs plugins (constantes
  locales), le fichier ne change pas.
- `LIVE_SHAPE_KEYS = [SPATIAL.tag]` (`core/domains/edit/commands/properties.ts:11`) : remplacé par un drapeau
  `live?: boolean` sur `ShapeProperty`, déclaré par la forme (réglé en direct, seule la forme redessinée).
- Réglages PlantUML (`ExporterSettings.plantuml`, `core/settings/types.ts:307`, `settings/schema/workspace.ts:10,53`) :
  ils appartiennent au mode Séquences ; ils deviennent des réglages déclarés du mode (`PluginSetting`, ajouter un
  type « choix » si besoin) ou des paramètres de l'appli, au choix motivé dans le « Fait : ». Les valeurs
  enregistrées sont reprises (`legacy`).
- Catégories de palette en dur (`core/edit/palette.ts:14` : géométrie, général, architecture) : déclarées par les
  formes ou par la racine de composition.
- Protocole implicite de l'acteur, lu par le tronc mais absent du contrat : `userData.standing`, `silhouette`,
  `head`, `sign` (`core/domains/view/scene.ts:145-151`, `edit/text/labelEditor.ts:445`,
  `selection/picking.ts:60,87`). Il devient un membre déclaré de `ShapeDefinition` (ex. `standing?(shape, ctx)` qui
  rend silhouette et zone du texte), documenté dans `AJOUTER_UNE_FORME.md`.
- **Fini quand :** aucun nom de forme, de mode ou d'effet, ni leurs clés, dans le code de `core/` (recherche
  relue) ; dans l'appli : l'étiquette d'un bâtiment se règle en direct, un acteur debout garde sa pancarte et son
  clic, l'export PlantUML garde son rendu et ses réglages ; `make check` vert.
