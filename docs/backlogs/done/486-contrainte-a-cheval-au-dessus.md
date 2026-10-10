# Event storming : Constraint posée à cheval au-dessus d'une Command et du post-it suivant, empilable

> Itération — mode Event storming, reprise de 481

- La Constraint n'avait de case qu'entre une Command et un Domain Event (Command | Constraint | Domain Event) : une
  Command étant presque toujours déjà collée au post-it suivant, aucune case libre n'était montrée.
- **Case à cheval** : en glissant une Constraint (ou depuis la palette), une case collée au-dessus de la rangée,
  centrée sur la jointure entre une Command et le post-it collé à sa droite (son bas contre le haut des deux). Les
  règles Command | Constraint et Constraint | Domain Event restent (Command sans post-it à sa droite).
- **Empilement** : Constraint collée au-dessus (ou dessous) d'une autre Constraint, alignée sur elle (même gauche).
- Comme les autres cases : voisins proches seulement, case chevauchant un post-it écartée.
- **Fini quand :** sur `eventstorming-commande.drawio`, glisser une Constraint près de « Passer commande » montre la
  case à cheval au-dessus de « Passer commande » et « Commande passée » ; posée, une deuxième Constraint montre la
  case au-dessus de la première ; tests ; `make check` vert.
- Fait : `places/dragPlaces.ts` : règle `BELOW` Constraint / Constraint (empilement), case à cheval `astride` pour une
  Constraint près d'une Command qui a un post-it collé à sa droite (`rightNeighbor`, tolérance des contacts), filtrée
  comme les autres (chevauchement, doublons). Tests `tests/engine/plugins/modes/eventstorming/dragPlaces.test.ts`
  (grammaire, case à cheval, empilement, Command seule) ; SPEC §14.5. Vérifié à l'œil sur `eventstorming-commande.drawio` :
  une Constraint glissée près de « Payer » se pose à cheval au-dessus de « Payer » et « Paiement refusé », une seconde
  se pose alignée au-dessus de la première. Command sans voisin à droite : vérifiée par les tests seulement. System
  inchangé ; une Command glissée ne montre pas de case par rapport à une Constraint posée.
