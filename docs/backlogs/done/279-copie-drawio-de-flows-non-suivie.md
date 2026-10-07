# Copie réenregistrée de `flows.drawio` absente

- `make drawio-check` réécrit `tests/fixtures/drawio-saved/flows.drawio`, qui n'est pas suivi par git (les autres
  fixtures ont leur copie) : la committer, ou mettre `flows.drawio` dans `DRAWIO_SKIP` s'il ne doit pas l'être.
- Fait : déjà réglé par le commit `b310c65` (`test(drawio): sortie draw.io de la fixture flows`), qui a versionné
  `tests/fixtures/drawio-saved/flows.drawio`. Rien d'autre à faire ; le fichier de dette passe dans `done/`.
