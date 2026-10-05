# Versionnage automatique par release-please

> Itération — outillage (CI)

- Ajouter release-please : à chaque push sur `main`, une GitHub Action lit les Conventional Commits et tient à jour
  une PR de release (montée semver, `CHANGELOG.md`) ; la fusionner crée le tag `vX.Y.Z` et la release GitHub.
- Pas d'autre pipeline (ni lint ni tests en CI : `make check` reste local).
- Version de départ `0.1.0` (celle de l'appli de bureau), alignée dans `package.json` et `desktop/package.json` ;
  avant la 1.0, un `feat` monte le mineur, un changement cassant aussi.
- **Fini quand :** config, manifeste et workflow présents ; `make check` vert ; après le push, la PR de release
  apparaît sur GitHub.
- Fait : `.github/workflows/release-please.yml` (seule action, `googleapis/release-please-action@v4` sur push
  `main`), `release-please-config.json` (type `node`, `bump-minor-pre-major`, sections du CHANGELOG en français,
  `bootstrap-sha` au commit courant pour ne pas reprendre l'historique, `desktop/package.json` et son lock suivis en
  `extra-files`), `.release-please-manifest.json` à `0.1.0` ; `package.json` et `package-lock.json` passés de
  `0.0.0` à `0.1.0`. `make check` vert.
