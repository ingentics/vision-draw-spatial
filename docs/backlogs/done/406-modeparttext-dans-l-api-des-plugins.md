# `ModePartText` exporté par l'API des plugins

> Itération — API des plugins ; reprise de 390.

- `ModePartText` (type renvoyé par `ModeParts.text`, `core/modes/types.ts`) est exporté par `core/plugins/index.ts`,
  comme `EffectRoom` : un mode peut typer une fonction d'aide qui le construit. Retiré de la liste blanche
  `NOT_API` de `tests/engine/core/plugins/guides.test.ts`.
- **Fini quand :** `ModePartText` s'importe depuis l'API des plugins ; `make check` vert.
- Fait : export ajouté dans `src/engine/core/plugins/index.ts` (bloc des types de `modes/types`), entrée retirée de `NOT_API` (`tests/engine/core/plugins/guides.test.ts`). `make check` vert (2340 tests) ; aucun comportement touché.
