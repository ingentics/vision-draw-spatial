# Guide de bonnes pratiques sans état de la dette

> Itération — documentation (bonnes pratiques) ; reprise de 243

- `docs/BONNES_PRATIQUES.md` ne donne que des règles : plus de décompte de la dette en cours (copies, homonymes,
  imports internes, domaines touchés, lectures de style à la main), ni de renvoi aux idées qui la suivent, ni
  d'historique (« était », « est passé de… »). Ces chiffres vivent dans les fiches de dette.
- Les exemples gardés montrent la bonne façon de faire, dans le code actuel.
- **Fini quand :** le guide ne contient plus aucun chiffre ni numéro de sujet sur la dette existante ; `make check`
  vert.
- Fait : `docs/BONNES_PRATIQUES.md` : retirés les décomptes (copies, homonymes, domaines touchés, lectures de style,
  imports internes), les renvois aux sujets 204 à 213 et aux idées 206 à 209, et l'historique (« était »,
  « est passé de… ») ; les raisons sont gardées sous forme de règle, les exemples montrent le code actuel.
  `make check` vert.
