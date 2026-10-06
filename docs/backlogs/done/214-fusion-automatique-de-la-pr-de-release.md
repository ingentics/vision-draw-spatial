# Fusion automatique de la PR de release

> Itération — CI (release-please)

- La PR de release ouverte ou mise à jour par release-please est fusionnée automatiquement (squash) dans le même job.
- Une fusion faite avec le `GITHUB_TOKEN` ne relance pas de workflow : release-please est donc rappelé juste après
  la fusion pour créer le tag et la release GitHub.
- **Fini quand :** un push sur `main` portant un `feat` ou un `fix` aboutit, sans intervention, à la PR de release
  fusionnée, au tag `vX.Y.Z` et à la release GitHub.
- Fait : `.github/workflows/release-please.yml` — l'étape `release` expose la PR ; `gh pr merge --squash
  --delete-branch` la fusionne ; un second appel de l'action (`skip-github-pull-request: true`) crée tag et release.
  `make check` vert ; le comportement se vérifie au prochain push sur `main` (onglet Actions).
