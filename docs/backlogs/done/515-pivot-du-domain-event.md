# Réglage « Pivot » du Domain Event

> Milestone — mode Event storming (475) ; petit ajout au schéma commun des champs (391)

- **Panneau d'un Domain Event** (post-it `eventstorming-event` sélectionné) : section « Pivot » avec la question
  « Une fois que cet événement a eu lieu, est-ce que quelqu’un d’autre prend le relais, avec ses propres règles, sans
  avoir besoin de savoir comment on en est arrivé là ? » et deux boutons « Oui » / « Non » ; Oui par défaut.
- Sous les boutons, l'aide : « Exemple : « Paiement refusé » est pivotal (la relance n’a pas besoin de connaître le
  prestataire), « Client prévenu » ne l’est pas (personne ne prend le relais). Si la réponse hésite, notez-le comme
  hotspot. »
- Enregistré sur le post-it : `spatial.es.pivot=0` pour Non, absent pour Oui. Les autres post-it n'ont pas la section.
- **Tronc** (schéma commun des champs, `fields/fieldSchema.ts`, rendu par `DeclaredField`) :
  - `help` : texte d'aide affiché sous le champ (`panel-hint`), pour tout champ déclaré ;
  - `buttons` sur un choix : choix nommés en boutons écrits, libellé au-dessus (sur plusieurs lignes au besoin), au
    lieu d'une liste.
- **Export draw.io** : l'attribut reste sur le post-it ; le fichier s'ouvre dans draw.io.
- **Fini quand :** un Domain Event sélectionné montre la section « Pivot », la question, Oui enfoncé et l'aide
  dessous ; Non écrit `spatial.es.pivot=0`, Oui le retire, ⌘Z défait ; un autre post-it n'a pas la section ; tests du
  réglage ; `make check` vert.
- Fait : `eventstorming/pivot/pivot.ts` (`PIVOT_PROPERTY`, réglage de forme du mode, section « Pivot », masqué hors
  Domain Event) et clé `PIVOT` (`keys.ts`) ; schéma commun : `help` (aide sous le champ, `panel-hint`) et `buttons`
  (choix nommés en boutons écrits, libellé au-dessus) dans `fieldSchema.ts`, rendus par `DeclaredField.tsx`.
  Vérifié dans l'appli sur `eventstorming-commande.drawio` : section, Oui par défaut, Non écrit, ⌘Z remet Oui, pas de
  section sur un Command. Tests : `tests/engine/plugins/modes/eventstorming/pivot/pivot.test.ts`.
