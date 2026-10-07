# Test de `display` hors du dossier `runtime/`

> Dette relevée avec le sujet 307 — rangement des tests

- `tests/engine/core/domains/display.test.ts` teste `src/engine/core/domains/runtime/display.ts` mais n'en suit pas le
  chemin : le déplacer sous `tests/engine/core/domains/runtime/`, à côté de `metrics.test.ts`.
- **Fini quand :** le test est sous `runtime/`, son import est ajusté et `make check` passe.
- Fait : test déplacé en `tests/engine/core/domains/runtime/display.test.ts` (`git mv`), import ajusté ; aucune doc
  ne citait l'ancien chemin. Validé par `make check` (pas de changement visible dans l'appli).
