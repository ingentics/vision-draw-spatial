# Contrat des modes regroupé par thème

`PageModeDefinition` est un ensemble plat d'environ 35 membres optionnels, dont plusieurs n'ont qu'un seul
utilisateur. Idée :
- le regrouper par thème (cycle de vie, flèches, formes, parties, UI) ;
- écrire dans `AJOUTER_UN_MODE.md` une table des garanties de chaque hook : quand il est appelé, page avant ou après
  l'écriture, étape d'annulation.

À faire après 288. Question à trancher d'abord : renommer les membres d'un contrat suivi par deux modes seulement.

Autre piste, à surveiller : les régions RDD (contenu calculé, agrandissement, obstacles entre sœurs) sont un
conteneur logique générique ; les remonter dans le tronc au deuxième mode qui en a besoin.
