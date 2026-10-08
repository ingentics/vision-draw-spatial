# Hôte des modes : lecture seule et protection posées une fois ; contrat et hôte découpés

> Architecture du moteur — extensibilité ; suite de 324 A ; après 378. Audit du 2026-10-08 (`AUDIT.md`).

- Constat :
  - `readonlyModel(` + `guard(` écrits à la main ≈ 40 fois : `pageModes.ts` (16), `shapeParts.ts` (14),
    `modeCurrents.ts` (8), `modeHandles.ts` (2) (ex. `shapeParts.ts:75,114,136,174,179,212`, `pageModes.ts:134,151,
    409-411`). Un oubli dans un nouveau point d'entrée est une brèche silencieuse. Le registre des formes, lui, le fait
    en un seul endroit.
  - `domains/modes/pageModes.ts` (467 lignes) fait trois métiers : requêtes et choix (`47-158`), réglages et touches
    du panneau (`210-306`), remises en ordre après écriture (`followUp`…`documentOpened`, `316-447`).
  - `core/modes/types.ts` (495 lignes) : définition (`22-337`), service `ModeEdit` et `ModeEditContext` (`343-396`),
    schéma de panneau `ModeProperty` (`398-463`), habillage (`466-490`). `'veil' | 'outline'` recopié
    (`types.ts:78`, `registry.ts:23`) au lieu de `Exclude<SelectionStyle, 'none'>`. Commentaire « (ex-`repair`) »
    (`types.ts:101`) historique.
  - `applyModeEdit` (`core/modes/modeEdits.ts:47-219`, 172 lignes, sept fermetures).
- Ce qu'on veut :
  - un adaptateur unique (`core/modes/modeCalls.ts` ou dans l'hôte) : `(mode, point d'entrée, repli, ...args)`, qui
    enveloppe chaque argument du modèle en lecture seule et protège l'appel (brique de 378) ; les quatre hôtes ne font
    plus que l'orchestration ;
  - `pageModes.ts` découpé : `modePanel.ts` (réglages, touches) et `modeFollowUps.ts` (remises en ordre) dans
    `core/domains/modes/` (noms à vérifier : pas de nom déjà pris, `coding.md` §2) ;
  - `core/modes/types.ts` découpé en `types.ts` (définition), `modeEdit.ts`, `modeProperty.ts`, `dressing.ts`, API
    des plugins inchangée ;
  - `applyModeEdit` en classe `ModeEditWriter` (une méthode par écriture, suivi des écritures en champs).
- Écart : aucun. Tests existants intacts sauf imports ; `contractDoc.test.ts` suit les nouveaux fichiers.
- **Fini quand :** `grep -c readonlyModel src/engine/core/domains/modes/*.ts` ne compte plus que l'adaptateur ; pages
  RDD et Séquences identiques à l'œil (glisser table et champ, tirer une relation, flux courant, export PlantUML) ;
  `make check` vert.
- Fait :
  - Adaptateur unique : `callMode(entry, ...args)` (`core/modes/modeCalls.ts`) remet chaque argument en lecture seule
    (`readonlyModel`) ; `PageModes.call(mode, hook, fallback, entry, ...args)` y ajoute l'appel protégé (`guard`, sur
    `PluginGuard.call` / `callPlugin` de 378) et le repli si le point d'entrée est absent. `ShapeParts`,
    `ModeHandles`, `ModeCurrents`, `ModePanel`, `ModeFollowUps` ne font plus que l'orchestration ; à l'intérieur d'une
    opération (déjà protégée par `editPageMode`) ou d'un groupe d'appels sous une seule protection (`current`), seul
    `callMode` est utilisé, pour ne pas changer la politique d'erreur. `grep -c readonlyModel
    src/engine/core/domains/modes/*.ts` : 0 partout ; seul `modeCalls.ts` l'appelle.
  - `pageModes.ts` (454 → 228 lignes) découpé : `domains/modes/modePanel.ts` (`ModePanel` : `propertyViews`,
    `setModeProperty`, `modeKey`) et `domains/modes/modeFollowUps.ts` (`ModeFollowUps` : `shapesPlaced`,
    `elementRelabeled`, `edgeReconnected`, `edgeCreated`, `elementsRemoved`, `documentOpened`), câblés dans
    `EngineCore` (`core.modePanel`, `core.modeFollowUps`) ; appelants mis à jour (`Engine.ts`, `cameraControls`,
    `file`, `arrange`, `clipboard`, `elements`, `connect`, `edgeEnd`, `move`, `resize`, `textEdits`). `PageModes`
    garde le choix du mode, les questions au mode, `editPageMode`, `selectPart`, `editContext`.
  - `core/modes/types.ts` (495 → 346 lignes) découpé : `types.ts` (définition), `modeEdit.ts` (`ModeEdit`,
    `ModeEditContext`), `modeProperty.ts` (`ModeProperty`, `ModeOption`), `dressing.ts` (`PageDressing`, `EdgeBadge`).
    API des plugins (`core/plugins/index.ts`) et `src/engine/index.ts` : mêmes noms exportés. `selectionStyle` en
    `Exclude<SelectionStyle, 'none'>` (`types.ts`, `registry.ts`) ; « (ex-`repair`) » retiré.
    `contractDoc.test.ts` inchangé (la définition et ses groupes restent dans `types.ts`).
  - `applyModeEdit` en classe `ModeEditWriter` (`modes/modeEdits.ts` renommé `modes/modeEditWriter.ts`, à côté du
    nouveau `modeEdit.ts` ; test renommé de même) : une méthode par écriture, suivi des écritures en champs privés du
    langage (`#`, le mode ne les atteint pas), `apply()` pour appliquer ; `applyModeEdit` reste (créer, appeler,
    appliquer).
  - Écarts (dev et tests seulement, `readonlyModel` ne fait rien en production) : tout argument objet simple remis à
    un mode est désormais en lecture seule, pas seulement page / forme / flèche (point, liste d'ids de
    `gestures.placed`, réglages `values` de `dressing`, `obstacles`, `current.look`, `palette` de `options`). Les
    points d'entrée sont appelés détachés de leur objet (`dressing`, `ModeProperty.value/hidden/options`,
    `ModeKey.applies/run`, `ModeCurrent.*` l'étaient avec `this`) : aucun mode n'utilise `this`, noté dans le guide.
    Les méthodes de `ModeEdit` doivent s'appeler sur l'objet (`edit.setX(…)`), plus détachées : aucun mode ne le fait,
    noté dans le guide.
  - Tests : existants intacts sauf imports et, dans `pageModes.test.ts`, la mise en place qui crée `ModePanel` et
    `ModeFollowUps` et les appels `propertyViews`, `shapesPlaced`, `edgeCreated`, `edgeReconnected` passés à ces
    domaines (mêmes attentes). Ajoutés : `pageModes.test.ts` « adaptateur unique » (chaque argument objet en lecture
    seule, écriture non rattrapée → repli et erreur signalée, point d'entrée absent → repli) et
    `tests/engine/core/modes/modeCalls.test.ts` (objets simples en lecture seule, opération remise telle quelle).
  - Docs : `AJOUTER_UN_MODE.md` (fichiers du contrat, adaptateur, `ModeEdit` appelé sur l'objet), `SUMMARY.md` §3.
  - Validation : tests seulement (`make check` vert, 145 fichiers, 2265 tests). À vérifier à l'œil : pages RDD et
    Séquences (glisser table et champ, tirer une relation, flux courant et sa barre, réglages du panneau, touches,
    poignée « + », export PlantUML).
