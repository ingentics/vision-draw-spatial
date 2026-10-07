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
- Fait :
  - Clés de formes : `SPATIAL.tag`, `sign`, `nodes` retirées de `core/spatial.ts`. Constantes dans leurs plugins :
    `TAG` (`generic/building`, reprise par `generic/tagged-process`), `SIGN` (`general/actors/common/standing.ts`),
    `NODES` (`architecture/distributed-cache/facade.ts`). Le fichier ne change pas.
  - Réglage en direct : `LIVE_SHAPE_KEYS` remplacé par `live?: boolean` sur un `ShapeProperty` texte ; l'étiquette des
    bâtiments et le mot de la tranche des process étiquetés le déclarent (même comportement qu'avant).
  - PlantUML : `ExporterSettings` et la section `exporters` sortent des paramètres du tronc ; le moteur de rendu
    (`plantumlRenderer`) et le serveur local (`plantumlUrl`) deviennent des réglages déclarés du mode Séquences
    (groupe « Export PlantUML » de Paramètres › Modes › Séquences ; la section « Exporteurs » disparaît). Choix motivé :
    ce sont des réglages du mode, comme ceux du ticket 283, et la partie appli du mode les reçoit
    (`ModePanelProps.values`, au lieu de `exporters`). Pour cela :
    - `PluginSetting` gagne `choice` (liste d'options) et `url` (http(s), sans barre finale ; `when` : modifiable
      seulement quand un autre réglage a une valeur) ; `readPluginSetting` les valide, la sous-page d'un plugin les
      affiche (boutons de choix, champ d'adresse grisé) ; `serverUrl` (`settings/fields.ts`), devenu sans usage, est
      retiré ;
    - `legacy` accepte un chemin depuis la racine des paramètres (`exporters.plantuml.renderer`) ; paramètres
      enregistrés en version 6 : les anciennes valeurs PlantUML sont reprises une fois (`legacyModeSettings`, la
      reprise des anciennes clés de `shapes` restant réservée aux versions d'avant 5).
  - Catégories de palette : `PALETTE_CATEGORIES` quitte `core/edit/palette.ts` pour `plugins/shapes/categories.ts` ;
    la racine de composition les enregistre dans le registre des formes (`registerCategory`, id unique), qui les rend
    (`categories()`) ; `paletteFor` et `searchTemplates` les reçoivent en paramètre ; `PALETTE_CATEGORIES` reste
    exporté par le moteur, depuis la racine de composition.
  - Silhouette debout : contrat formel dans `core/render/standing.ts`, réexporté par l'API des plugins —
    `StandingFigure` (tête, pièces, traits, pancarte, style de son texte), `setStandingFigure` côté forme (l'acteur),
    `standingFigure` côté tronc (`scene.ts`, `picking.ts`, `labelEditor.ts`), au lieu des clés `userData` lues à la
    main. Les clés posées sur les objets ne changent pas.
  - Relu : plus aucun nom de forme, de mode ou d'effet, ni leurs clés, dans le code de `core/` (les seules occurrences
    restantes sont dans des commentaires d'exemple, et `geometry`, nœud XML de draw.io).
  - Comportement inchangé, hors des Paramètres : la section « Exporteurs » devient le groupe « Export PlantUML » du
    mode Séquences.
  - Doc : `AJOUTER_UNE_FORME.md` (silhouette debout, `live`, constantes des clés, `categories.ts`),
    `AJOUTER_UN_MODE.md` (types `choice` et `url`, `legacy` en chemin, `values` de la partie appli), `SUMMARY.md`.
  - Tests : réglages `choice` et `url` (`pluginSettings.test.ts`), migration version 6 (`settingsStore.test.ts`),
    anciennes clés de `shapes` passées par la racine des paramètres (`registry.test.ts`) ; tests de la palette et du
    registre adaptés aux catégories du registre ; le test des exporteurs de `settings.test.ts` est retiré (remplacé).
  - Validation dans l'appli (navigateur intégré, serveur 5173) :
    - acteur posé sur une page, en iso : debout, sélection autour de la tête, clic sur une jambe pris et clic à côté
      ignoré, double-clic sur la pancarte : éditeur dans le format du texte ; annulé ;
    - BDD : l'étiquette de façade s'écrit à chaque frappe, une seule annulation la retire ;
    - Paramètres : plus de section « Exporteurs » ; Modes › Séquences › Export PlantUML : choix du moteur, adresse
      grisée sauf pour le serveur local ; remis à kroki.io ;
    - palette : catégories Géométrie, Général, Architecture comme avant.
    - Rendu effectif d'un export par le serveur choisi : vérifié par les tests seulement (`plantumlServer.test.ts`).
