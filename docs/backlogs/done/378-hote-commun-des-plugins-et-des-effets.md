# Un seul appel protégé pour les trois familles de plugins, et un hôte pour les effets

> Architecture du moteur — extensibilité ; suite de 300, 303, 324. Audit du 2026-10-08 (`AUDIT.md`).

## Constat

- Trois appels protégés, trois politiques sans rapporteur :
  - formes : `core/shapes/registry.ts:89-97` (signale, sinon `console.error` et repli) ;
  - effets : `core/effects/registry.ts:121-127` (signale, sinon **l'exception remonte**) ;
  - modes : `PluginGuard` (`domains/modes/pluginGuard.ts:16-23`), qui sert aussi formes et effets
    (`EngineCore.ts:173-176`, `domains/view/scene.ts:48`) mais vit sous `domains/modes/`.
- Les effets n'ont pas d'hôte : `PageModes.setPageEffect` / `allowsEffect` (`pageModes.ts:58-67`, `121-126`),
  `scene.ts:43-49` (`decorate`, quatre options assemblées sur place) et `:60` (`hasVolume`), la façade qui filtre
  (`Engine.allowedEffects`, `Engine.ts:481-486`), les avertissements par `PageModes.withModeWarnings`
  (`pageModes.ts:464`). Le registre des effets fait en plus l'appel protégé et le gel (`effects/registry.ts:104-136`),
  quand celui des modes est purement déclaratif.
- Diagnostics « plugin inconnu » à trois endroits : effet (`effects/registry.ts:138-143`), mode (en ligne,
  `pageModes.ts:450-456`), forme (`collectUnsupported`, `domains/document/file.ts:134`).

## Ce qu'on veut

- Une brique unique d'appel protégé (`core/plugins/` ou `domains/runtime/`) : `call(famille, id, point d'entrée,
  repli, run)` + rapporteur, politique unique sans rapporteur (console et repli). `PluginGuard` quitte
  `domains/modes/` ; registres de formes et d'effets et hôte des modes la reçoivent.
- Un domaine `core/domains/effects/` (`PageEffects`) : `allowed(page)`, `active(page)`, `setPageEffect`,
  `decorate(page, root)`, `hasVolume(page)`. Le registre des effets redevient déclaratif ; `Engine.allowedEffects`
  délègue ; `PageModes` ne garde que la question au mode (`allowsEffect`).
- Chaque registre expose `warnings(document)` ; `DocumentFile` les assemble.
- Valider au passage le motif des ids d'effet et de mode à l'enregistrement (`^[a-z][a-z0-9-]*$`) : ils sont écrits
  dans `spatial.effects` (liste à virgules) et `spatial.mode`.

## Écart, tests, fin

- Écart : aucun dans l'appli. Un appel d'effet sans rapporteur (tests) se replie au lieu de lever.
- Tests : brique d'appel protégé seule ; `PageEffects` (autorisé / refusé par le mode, panne d'un effet signalée
  « Effet <id> ») ; avertissements des trois familles ; tests existants intacts sauf imports.
- **Fini quand :** un seul endroit fait l'appel protégé (`grep -rn "catch" src/engine/core` le montre) ; la forêt
  s'active, se retire et se refuse comme avant dans l'appli (iso) ; Diagnostics inchangés sur un fichier avec un mode
  et un effet inconnus ; `make check` vert.
- Fait :
  - **Appel protégé unique** : `core/diagnostics/pluginCalls.ts` (`callPlugin(famille, id, point d'entrée, repli,
    run, rapporteur?)`, types `PluginFamily`, `PluginReport`) ; sans rapporteur : console et repli. Placé dans
    `core/diagnostics/` (pur) et non `core/plugins/` : la lint interdit au tronc d'importer `**/plugins/**`.
    `grep -rn "catch" src/engine/core` ne montre plus qu'un rattrapage d'appel de plugin (le `catch` de
    `modes/modeEdits.ts` annule les écritures et relance, il ne protège rien).
  - **`PluginGuard`** déplacé (`git mv`) de `domains/modes/` vers `domains/runtime/pluginGuard.ts` : rapporteur
    (`reporter`, une fois par plugin et point d'entrée, republication des Diagnostics) ; `call(famille, id, …)`
    délègue à `callPlugin`. Registre des formes (`guard` → `callPlugin('Forme', …)`, `reportingTo` inchangé), hôte des
    modes (`PageModes.guard` → `call('Mode', …)`) et registre des effets (`decorate`, option `report` à la place
    d'`onError`) passent tous par lui.
  - **Hôte des effets** `core/domains/effects/pageEffects.ts` (`PageEffects`, `core.pageEffects`) : `allowed(page)`,
    `setPageEffect` (sorti de `PageModes`), `decorate(page, root)` (options assemblées ici, plus dans `scene.ts`),
    `hasVolume(page)`, `warnings(document)`. `Engine.allowedEffects` et `Engine.setPageEffect` délèguent ;
    `SceneView` appelle `pageEffects.decorate` / `hasVolume` ; `PageModes` ne garde que `allowsEffect`.
  - **Avertissements** : `PageModeRegistry.warnings(document)` (mode inconnu, nouveau) à côté de
    `PageEffectRegistry.warnings` ; `DocumentFile.withPluginWarnings` assemble : modes (`PageModes.withModeWarnings`,
    qui ne garde que mode inconnu et `lifecycle.check`, page par page), effets inconnus, erreurs des plugins — même
    ordre qu'avant.
  - **Ids** : `PLUGIN_ID_PATTERN` (`^[a-z][a-z0-9-]*$`, `core/spatial.ts`) vérifié à l'enregistrement d'un mode et
    d'un effet (exception « id invalide »). Tous les modes et effets livrés le respectent.
  - **Écarts** : aucun dans l'appli. Un décor d'effet en panne appelé sans rapporteur (tests) se replie (console) au
    lieu de lever. Un id de mode ou d'effet invalide est refusé à l'enregistrement.
  - **Écarts au ticket** : `decorate`, `active` et `hasVolume` restent dans le registre des effets (questions sur ses
    déclarations, filtrées par `allows` ; `decorate` y est utilisé tel quel par `forest.test.ts`), protégés par
    l'appel commun : le registre n'a plus ni politique d'erreur ni lien au mode. `PageEffects.active` n'est pas créé
    (aucun appelant : ce serait du code mort). Les formes n'ont pas de `warnings(document)` : une forme inconnue va au
    recensement des formes non prises en charge (`collectUnsupported`, SPEC §8.4), inchangé.
  - **Tests** : nouveaux `tests/engine/core/diagnostics/pluginCalls.test.ts`,
    `tests/engine/core/domains/runtime/pluginGuard.test.ts`, `tests/engine/core/domains/effects/pageEffects.test.ts`
    (permis / refusé par le mode, volume, panne « Effet boom », activer / retirer),
    `tests/engine/core/effects/registry.test.ts` (id, décor sans rapporteur) ; ajouts à `modes/registry.test.ts`
    (id, mode inconnu) et `domains/document/file.test.ts` (assemblage des avertissements des trois familles). Tests
    existants : imports de `pluginGuard` mis à jour ; cœurs réduits de `file.test.ts` et `liveCore.ts` complétés
    (`pageEffects`, `pluginGuard`) ; le test « les avertissements du document incluent les erreurs signalées à la
    lecture » quitte `pageModes.test.ts` pour `file.test.ts` (l'assemblage y est désormais).
  - **Docs** : `SUMMARY.md` §3, `AJOUTER_UN_MODE.md`, `AJOUTER_UNE_FORME.md`, JSDoc des contrats (`id`).
  - **Validation** : par les tests seulement (`make check`). À vérifier à l'œil : une page avec la forêt
    (`spatial.effects="forest"`), en iso / 3D : la cocher, la décocher (annuler / rétablir), et sur une page Séquences
    la forêt absente des effets proposés ; un fichier avec `spatial.mode="inconnu"` et `spatial.effects="inconnu"` :
    Diagnostics montrent « Mode de page inconnu » et « Effet de page inconnu » comme avant.
