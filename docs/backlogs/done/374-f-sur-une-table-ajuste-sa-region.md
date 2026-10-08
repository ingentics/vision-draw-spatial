# « f » sur une table ou un champ : ajuste sa région

> Itération — mode RDD, régions (reprise de 184)

- La touche « f » sur une table (ou un champ sélectionné dans une table) contenue dans une région ajuste cette région
  à son contenu, comme « f » sur la région elle-même (puis ses régions parentes, sujet 239).
- Hors de toute région, la touche garde son effet global (autre agencement des flèches, ou variante de placement).
- **Fini quand :** dans l'appli, sur `fixtures/rdd.drawio`, « f » sur User ou sur un de ses champs ajuste la région
  Comptes ; « f » sur Address (hors région) ne la touche pas.
- Fait : `FIT_REGION_KEY` (`rdd/regions/regionProperties.ts`) vise la région sélectionnée, sinon celle qui contient la
  forme sélectionnée (`regionOf`) ; la sélection (champ compris) est gardée. Test ajouté dans
  `regions/regionLayout.test.ts`. Vérifié à l'œil dans l'appli sur `fixtures/rdd.drawio` (« f » sur le champ email
  de User ajuste Comptes) ; hors région vérifié par les tests seulement ; `make check` passe.
