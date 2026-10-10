# `exportedLabel` / `importedLabel` rangés dans `lifecycle`

> Dette vue à l'audit 500 (reprise de 478) — contrat des modes

- Ces deux transformations du fichier sont dans `ModeLifecycle` (`core/modes/types.ts:118-128`), à côté de `opened`
  et `removed`, qui reçoivent un `ModeEdit` et écrivent une étape. Un groupe `file` les distinguerait (changement de
  contrat : un seul mode à reprendre).
