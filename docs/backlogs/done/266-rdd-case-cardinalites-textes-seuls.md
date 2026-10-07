# RDD : « Afficher les cardinalités » ne masque que les textes

> Itération — mode RDD (relations) ; reprise de 265

- La case « Afficher les cardinalités » de l'encart « RDD » de la page ne masque que les textes de début / fin
  (« 0,n », « 0,1 », « 1,1 ») ; les pointes ER (`ERzeroToMany`, `ERzeroToOne`, `ERmandOne`) restent.
- **Fini quand :** case décochée, les flèches de relation gardent leurs pointes sans textes ; recochée, les textes
  reviennent ; `make check` vert.
- Fait : `writeCardinalities` (`rdd/cardinalities.ts`) écrit toujours les pointes ER ; la case ne retire plus que
  les textes de début / fin. Aide de la case revue (`rdd/index.ts`). Test `relations.test.ts` (case décochée : pointes
  `ERzeroToMany` / `ERzeroToOne` sans texte, y compris après une remise en ordre). Vérifié par les tests seulement.
