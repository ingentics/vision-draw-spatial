# Bonnes pratiques de code pour les agents

> Documentation — façon de travailler ; tirée des revues de dette 204 à 213

- Un document `docs/BONNES_PRATIQUES.md` rassemble les règles qui évitent de recréer la dette relevée dans `src/engine`
  (couplage du cœur, état de module, utilitaires recopiés, lecture de style à la main, homonymes, imports internes
  depuis l'app, réglages en double), et la façon de valider un changement (tests, appli, draw.io, commit).
- Il est chargé d'office par `CLAUDE.md`, pour qu'un agent l'ait sous les yeux avant d'écrire du code.
- **Fini quand :** le document existe, court et concret (règle, raison, exemple du dépôt) ; `CLAUDE.md` l'importe ;
  `make check` vert.
- Fait : `docs/BONNES_PRATIQUES.md` en huit parties (avant d'écrire, où mettre le code, état et couplage, réutiliser
  l'existant, frontières, écrire le code, valider, dette vue en passant), chaque règle illustrée par la dette
  corrigée en 204, 205, 211 à 213 ou notée en 206 à 210. Importé par `CLAUDE.md` (`@docs/BONNES_PRATIQUES.md`).
  `make check` vert.
