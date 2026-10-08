# Docs alignées sur le code, une seule source par sujet

> Documentation — guides des plugins, SUMMARY, SPEC §4, règles. Audit du 2026-10-08 (`AUDIT.md`). Indépendant du code ;
> les sujets 378 à 388 mettent à jour leurs propres passages.

- **Guide des formes** (`docs/AJOUTER_UNE_FORME.md`) :
  - « déposer le dossier suffit » (`:11-12`, `:37-38`, `:525`, SPEC §8.2) faux dans trois cas : `SHAPE_ALIASES`
    (`core/format/style.ts`, `:60`, `:425`), périmètre d'accroche (`render/edges/route/perimeters/index.ts`, `:424`),
    réglage de forme (§4.1, réglé par 380) : un encadré unique « ce qui touche encore le tronc » ;
  - briques citées absentes de l'API des plugins : `flatMaterial` (`:273-274`, `:375`), `fontStyleBits` (`:327`),
    `labelBackground` (`:328`) : corriger ou exporter ;
  - renvois périmés : `Engine.requestedLevel()` → `Levels.requestedLevel()` (`:231`) ; `Engine.renderContext()` →
    `SceneView.renderContext()` (`:342`, `:351`) ; `Engine.updateSettings … changed('shapes')` →
    `Levels.settingsChanged` / `settingsSectionChanged` (`:352-353`) ; `render/edges/route.ts` →
    `route/perimeters/index.ts` (`:424`) ;
  - contrat `ShapeDefinition` recopié incomplet (`:79-105` ; SPEC §8.2 `SPEC.md:369-391`, « au minimum `kind` » → `id`,
    `:401`) : un tableau « champ → défaut → exemple » unique, `types.ts` fait foi ;
  - détails : `:130` liste `general` incomplète ; `:142` arbre sans `minimapOutline.ts` ; `:506` exemple de la note
    avec `order: 110` déjà pris par l'hexagone.
- **Guide des modes** (`docs/AJOUTER_UN_MODE.md`) : `connects`, `created`, `reconnected` sans leur `part?`
  (`:66,69,70`) ; `ModeEdit` sans `gridSize`, `sendToBack`, `setEdgeEndText` (`:148-152`) ; « `index.ts` seul fichier
  à la racine » (`:9`) alors que RDD a `keys.ts`, `settings.ts` ; `:169-170` recommande un `WeakMap` de module, à
  accorder avec `coding.md` §3 (exception, cf. 377).
- **SUMMARY** : « prochain sujet 48 » (`:108-109`) → la commande `ls` seule ; `debt/` manquant (`:106`) ; liste des
  formes (`:75-76`) → renvoi au dossier / SPEC §8.3 ; `:94` (`todo/33…41`, « exemple récent ») ; lignes « Nouveau
  mode », « Nouvel effet » dans « Où regarder » ; `:72` chemin `plugins/shapes/generic/building/` ; « Fonctionnel
  acquis » sans modes RDD / Séquences, forêt, mini-graphe ; `:134` rotation des formes hors périmètre alors que
  `rotatable` existe (seul le routage l'ignore) ; gabarit de sujet (`:113-124`) en double de `ROADMAP.md` : le
  retirer.
- **SPEC §4.2-4.3** : arborescence fichier par fichier périmée (`react/Toolbar.tsx`, `react/Palette.tsx` absents ;
  `MiniGraphView.tsx`, `persistence/*`, `graph/miniGraph.ts`, `model/{readonly,freeze,pageIndex,names,numbers,bounds}`,
  `modes/{modeKeys,modeTargets,modeProperties,modeShapes}`, formes générales manquants) → dossiers et rôles seulement ;
  `CameraState`, `EngineOptions`, `on(...)` à jour (`cameraMath.ts:13`, `core/domains/types.ts:33-51`,
  `Engine.ts:82`).
- **Une seule source** : carte des dossiers dans SUMMARY §3 (avec `core/shapes|modes|effects|plugins` et
  `src/app/plugins`) ; SPEC §4.2 garde couches et dépendances ; `coding.md` §2 « type de code → dossier » renvoie à
  SUMMARY ; règle des frontières des plugins seulement dans `coding.md` §5, les guides y renvoient ; listes « briques
  à chercher » des guides remplacées par un renvoi aux rubriques de `core/plugins/index.ts`.
- **`coding.md`** : §2 tableau complété (contrats et registres, API des plugins, effets, partie appli d'un mode) ;
  §2 « pas de nom déjà pris » : excepter les fichiers conventionnels d'un plugin (`facade.ts`, `keys.ts`,
  `settings.ts`) ; doublons de nom réels à renommer : `orient.ts` (`render/geometry/`, `domains/edit/commands/`),
  `standing.ts` (`render/`, `actors/common/`).
- **`CLAUDE.md`** (fichier d'instructions, en anglais) : `src/app/devSession.ts` n'existe plus →
  `src/app/tabSession.ts` + plugin `engineFullReload` de `vite.config.ts` ; « 130 KB » → 137 KB.
- **Fini quand :** chaque chemin et symbole cité dans `docs/*.md`, `coding.md` et `CLAUDE.md` existe (vérifié par le
  test de 390, ou à la main si 390 n'est pas fait) ; aucune carte des dossiers en double ; `make check` vert.
- Fait :
  - `docs/AJOUTER_UNE_FORME.md` : encadré « Ce qui touche encore le tronc » en tête (alias `SHAPE_ALIASES`, périmètre
    `perimeterKind` dans `route/perimeters/index.ts`, réglage de forme §4.1 en attendant 380, catégorie de palette),
    renvoyé depuis §1 et l'exemple de la note ; contrat recopié remplacé par un tableau unique « champ → rôle → défaut →
    exemple » des 28 champs de `ShapeDefinition` (`types.ts` fait foi), le tableau de §6 y renvoie ; briques absentes de
    l'API corrigées sans rien exporter (`flatMaterial` → `fillMesh` / `strokeMesh`, `fontStyleBits` →
    `fontStyleValue`, `labelBackground` → `styleStroke`) ; renvois `Levels.requestedLevel()`,
    `SceneView.renderContext()`, `Levels.settingsChanged` / `settingsSectionChanged`, `route/perimeters/index.ts` ;
    arbre réduit aux dossiers (plus de liste de formes) avec `minimapOutline.ts` ; liste « briques à chercher »
    remplacée par les rubriques de `core/plugins/index.ts` ; frontières renvoyées à `coding.md` §5 ; note en
    `order: 200` (110 pris par l'hexagone).
  - `docs/AJOUTER_UN_MODE.md` : `part?` de `edges.connects` / `created` / `reconnected` ; `ModeEdit` complet
    (`gridSize`, `sendToBack`, `setEdgeEndText`) ; fichiers conventionnels de la racine d'un mode (`keys.ts`,
    `settings.ts`) au lieu de « `index.ts` seul » ; frontières et briques renvoyées à `coding.md` §5 et aux rubriques
    de l'API ; `WeakMap` présenté comme l'exception de `coding.md` §3.
  - `docs/SUMMARY.md` : §3 devient la seule carte des dossiers (avec `core/shapes|modes|effects|plugins`,
    `core/graph`, `core/diagnostics`, `plugins/`, `src/react`, `src/app/plugins`) ; §4 : chemin
    `plugins/shapes/generic/building/`, formes par renvoi au dossier et à SPEC §8.3, modes RDD / Séquences, effet
    forêt, mini-graphe ; §5 : lignes « Nouveau mode », « Nouvel effet », sans `todo/33…41` ; §6 : `debt/`, numéro
    par `ls` seul, gabarit retiré (renvoi à `ROADMAP.md`) ; §7 : seul le routage ignore les quarts de tour.
  - `docs/SPEC.md` : §4.2 réduit aux couches → dossiers, renvoi à SUMMARY §3 ; §4.3 aligné sur `Engine.ts`
    (`EngineOptions` complet, `goToPage`, `animateCameraTo`, `on` typé, `InitialView`, `CameraState` avec `3d` et
    `fov`) ; §8.2 renvoie au tableau du guide au lieu de recopier le contrat, « au minimum `id` » ; hors de ces
    sections, quatre chemins périmés corrigés en place (`render/iso/buildings.ts`, `render/edges/route.ts`,
    `core/selection/splitHover.ts`, `edit/anchoring/auto/seed.ts`).
  - `.claude/rules/coding.md` : §2 renvoie à SUMMARY §3, tableau complété (contrats et registres, API des plugins,
    forme, effet, partie appli d'un mode), exception des fichiers conventionnels d'un plugin ; §3 : exception du
    cache `WeakMap` indexé par un objet immuable (partie doc de 377, faite ici).
  - `CLAUDE.md` : `src/app/tabSession.ts` + plugin `engineFullReload` de `vite.config.ts` ; taille de la SPEC (135 KB
    après ce sujet).
  - Renommages (doublons de nom, aucun changement de comportement) : `core/domains/edit/commands/orient.ts` →
    `orientation.ts`, `plugins/shapes/general/actors/common/standing.ts` → `standingActor.ts`, test
    `tests/engine/core/domains/edit/orient.test.ts` → `orientation.test.ts`, imports mis à jour. Gardés :
    `core/render/geometry/orient.ts` et `core/render/standing.ts` (cités par l'API des plugins et les guides).
  - Dette notée : `debt/394` (commentaire orphelin dans `core/shapes/types.ts`).
  - Laissé : le test des docs (390) ; la procédure §4.1 du guide, seulement corrigée (réécrite par 380) ; aucun
    export ajouté à l'API des plugins. Vérification : boucle shell sur les chemins `src/…`, `tests/…`, `docs/…` et les
    liens `../src/…` de `docs/*.md`, `coding.md`, `CLAUDE.md` (tous existent) ; `make check` vert.
