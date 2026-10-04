# Étape 0 — Squelette du projet

> Milestone 1 — Viewer

- Vite + React + TypeScript strict, Three.js, Vitest, ESLint/Prettier.
- Arborescence `src/engine`, `src/react`, `src/app`, `tests/fixtures` (cf. SPEC §4.2).
- Règle vérifiée par lint : `src/engine` n'importe jamais `react` (et `format/` + `model/` n'importent jamais Three.js).
- Conteneur Docker + Makefile (`make dev`, `make check`…), hot reload avec restauration de la vue.
- **Fini quand :** `make dev` affiche une page vide, `make test` passe.
