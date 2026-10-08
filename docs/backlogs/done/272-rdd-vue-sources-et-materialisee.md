# RDD : sources d'une vue, vue matérialisée

> Itération — mode RDD (vue, relations, panneau) ; reprise de 181, 260, 268

- **Relation source → vue** (nouvelle sorte de relation, cf. 268) :
  - départ : une entité ou une vue ; arrivée : une vue (« la vue est construite sur… ») ;
  - une vue ne peut être liée qu'à une autre vue : une flèche d'une vue vers autre chose n'est pas permise ;
  - aucun champ créé dans la vue ;
  - flèche en tirets, pointe simple côté vue, sans pointe ER ni cardinalité ni texte ; pas de section « Relation »
    au panneau.
- **Panneau, vue sélectionnée** : section « PostgreSQL » avec une case « Matérialisé » (`spatial.materialized`,
  CREATE MATERIALIZED VIEW).
- **Panneau, champ d'une vue sélectionné** : ni « Optionnel » (section du mode), ni section « Gouvernance » ; les
  autres tables gardent les leurs.
- **Fini quand :** une flèche entité → vue et vue → vue se pose, en tirets, sans champ ajouté ; une flèche vue →
  entité est refusée ; la vue sélectionnée montre « Matérialisé » sous PostgreSQL, enregistré dans le fichier ; un
  champ de vue n'a ni Optionnel ni Gouvernance ; `make check` vert.
- Fait : nouvelle sorte de relation `viewSource` (`relations/kinds/viewSource/`), entité ou vue → vue, `distinct` (une
  vue ne se lie pas à elle-même), tirets, pointe `open` côté vue, sans champ ni section « Relation ». Option de table
  « Matérialisé » (`spatial.rdd.materialized`, section PostgreSQL, vue seulement). Règle `derived` des vues : ni
  « Optionnel » ni « Gouvernance » sur leurs champs. La vue devient connectable (tests adaptés). Validé par les tests
  (`make check`), pas encore à l'œil dans l'appli ni dans draw.io.
