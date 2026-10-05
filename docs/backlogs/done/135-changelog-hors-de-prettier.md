# CHANGELOG hors de Prettier

> Itération — outillage (make check)

- `CHANGELOG.md` est écrit par le robot de release (release-please) dans son propre format : `make check` échouait
  sur `main` depuis la release 0.2.0. Il passe dans `.prettierignore` (un reformatage serait défait à chaque release).
- **Fini quand :** `make check` vert sur `main` sans toucher à `CHANGELOG.md`.
- Fait : `CHANGELOG.md` ajouté à `.prettierignore` ; `make check` vert.
