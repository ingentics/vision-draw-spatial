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
