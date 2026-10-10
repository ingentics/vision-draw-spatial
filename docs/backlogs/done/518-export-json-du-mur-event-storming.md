# Export JSON du mur d'event storming

> Milestone — mode Event storming (475) ; s'appuie sur les contacts (`contacts/contacts.ts`) et les groupes (514) ;
> modèle : export PlantUML du mode États (436), fenêtre commune `ExportDialog` (439)

Le JSON se déduit du mur : le **type** de chaque post-it, les **contacts** entre post-it (avec leur direction) et le
**libellé** de chaque groupe. Aucune flèche : toutes les relations viennent de la position. Quand une position est
ambiguë ou ne correspond à aucune règle, l'export ne devine pas : il produit un avertissement. Chaque lien indique la
règle qui l'a créé (`R1` à `R5`).

- **Périmètre** : moteur dans `src/engine/plugins/modes/eventstorming/` (`export/json.ts`, `(page) → texte`, exposé
  comme l'exporteur des États), appli dans `src/app/plugins/modes/eventstorming/` (nouvelle partie appli du mode),
  plus `tests/` et la doc (SPEC §14, SUMMARY). Aucun changement dans `src/engine/core/` ni dans le panneau
  « Exporter » de la barre de droite (`src/app/export/ExportPanel.tsx`) : un besoin du tronc découvert en route devient
  un ticket à part.
- **Bouton** : section « Event storming » du panneau de la page (rien de sélectionné), bouton « Exporter en JSON »
  (infobulle « Éléments, liens et avertissements déduits du mur : texte à copier ») qui ouvre `ExportDialog` (format
  `{ id: 'json', name: 'JSON' }`, sans rendu : texte seul, copiable). JSON indenté de 2 espaces.

## Lecture du mur

- **Type** : lu sur le `spatial.kind` du post-it, pas sur sa couleur (le fond reste modifiable sans changer le type).

  | Post-it | `type` | Préfixe d'id |
  | --- | --- | --- |
  | Actor | `actor` | A |
  | Command | `command` | C |
  | Domain Event | `event` | E |
  | Policy | `policy` | P |
  | System | `system` | S |
  | Query Model | `read_model` | R |
  | Hotspot | `hotspot` | H |
  | Constraint | `constraint` | K |

- **Contacts** : ceux de `contacts(page)`, tels quels (écart toléré `CONTACT_TOLERANCE` = 0,5, l'aimantation collant à
  0 ; un coin seul ne compte pas). Direction : B **à droite** de A (côté `e` de A), ou B **sous** A (côté `s` de A).
  - **Recouvrement de 20 %** : un contact ne crée un lien que si sa longueur vaut au moins 20 % du côté du plus petit
    des deux post-it (`share` maximal des deux bouts ≥ 0,2). En dessous, il ne crée aucun lien et donne un W1. Le seuil
    laisse passer les décalages d'une demi-hauteur (branches, R5).
- **Groupes** : ceux de `stickyGroups(page)` (les mêmes qu'à l'écran, tous contacts compris), numérotés `G1`, `G2`…
  de haut en bas (haut du groupe, puis bord gauche). Libellé : celui du groupe (`spatial.es.group`), `null` si aucun
  n'est écrit (pas « Group label »). Les anciennes formes Titre de la page sont ignorées.
- **Post-it isolé** (aucun contact) : exporté sans groupe (`group: null`), id sans préfixe de groupe (`C1`, rang
  compté parmi les post-it isolés du même type), avertissement W7.

## Éléments

- **Id** : `{groupe}.{préfixe}{rang}`, le rang comptant les post-it du même type dans le groupe, lus de haut en bas
  puis de gauche à droite (ex. `G2.C3` : 3e Command du groupe 2).
- **Concept** : `{type}:{texte normalisé}` : texte en minuscules, sans accents, la ponctuation remplacée par des
  espaces, espaces multiples réduits à un, sans espaces au bout (ex. `command:payer`). Deux post-it au même concept
  désignent la même chose métier, même dans des groupes différents ; chacun reste un élément distinct.
- **Label** : le texte du post-it (valeur de la forme, sans le label du type), sur une ligne (retours à la ligne
  remplacés par un espace).
- **Pivot** : sur les éléments `event` seulement (`spatial.es.pivot`, sujets 515, 517) : `true` (Oui), `false` (Non),
  `"unknown"` (Je ne sais pas), `null` sans réponse.

## Liens

- **R1, séquence (gauche → droite)** : B à droite de A et la paire figure ci-dessous → lien de A vers B. L'ordre
  compte (une Command à gauche d'un Actor n'est pas une séquence).

  | A (gauche) | B (droite) | Lien |
  | --- | --- | --- |
  | actor | command | `performs` |
  | command | event | `produces` |
  | event | policy | `triggers` |
  | policy | command | `issues` |
  | event | command | `causes` |
  | event | read_model | `feeds` |

- **R2, attache (n'importe quel côté)** : le sens dépend des types, pas de la position. R1 est testée avant R2 pour les
  contacts horizontaux.

  | Paire | Lien | Sens |
  | --- | --- | --- |
  | actor + command | `performs` | actor → command |
  | system + command | `calls` | command → system |
  | system + event | `involves` | event → system |
  | policy + event | `triggers` | event → policy |
  | read_model + actor | `informs` | read_model → actor |
  | read_model + command | `informs` | read_model → command |
  | constraint + command | `constrains` | constraint → command |
  | constraint + read_model | `checks` | constraint → read_model |

- **R3, commande émise par une Policy** : la Policy émet les Commands à sa droite (R1) ; sinon, les Commands à droite
  de l'Event qui la déclenche (lien `issues`, règle `R3`). Quand une Policy relie un Event à une Command, le lien
  direct `causes` entre cet Event et cette Command est retiré.
- **R4, hotspot** : un Hotspot vise **un seul** élément, son premier voisin dans l'ordre au-dessus, en dessous, à
  gauche, à droite ; lien `concerns` du Hotspot vers lui. Ses autres contacts sont ignorés (ni lien, ni W1).
- **R5, branches** : deux Events empilés sont des issues alternatives : aucun lien entre eux (ni W1) ; la Command qui
  les touche tous les deux produit chacun (`produces`, règle `R5` pour le second et les suivants, `R1` pour le
  premier, lu de haut en bas).
- Ordre des liens : par élément de départ (ordre des éléments), puis d'arrivée ; aucun doublon (même `from`, `to`,
  `type`).

## Avertissements

Dans `warnings`, jamais dans les liens ; ordre : par code, puis par élément.

| Code | Niveau | Situation | Message |
| --- | --- | --- | --- |
| W1 | `info` | Deux post-it se touchent mais aucune règle ne s'applique (ou recouvrement sous 20 %) | Contact sans règle |
| W2 | `attention` | Policy sans commande émise | Policy sans commande émise |
| W3 | `attention` | Policy sans événement déclencheur | Policy sans événement déclencheur |
| W4 | `attention` | Hotspot sans voisin | Hotspot isolé |
| W5 | `attention` | Event sans Command qui le produit | Événement sans commande qui le produit |
| W6 | `attention` | Command sans déclencheur (ni Actor, ni Policy, ni Event) | Commande sans déclencheur |
| W7 | `info` | Post-it qui ne touche aucun autre | Post-it isolé |
| W8 | `info` | Deux post-it qui se chevauchent (`overlaps` de `contacts`) | Post-it qui se chevauchent |

Un Hotspot isolé donne W4, pas W7. `elements` liste les ids concernés (deux pour W1 et W8, un sinon).

## Format

```json
{
  "groups":   [ { "id": "G1", "label": "Paiement accepté" } ],
  "elements": [ { "id": "G1.C2", "type": "command", "label": "Payer",
                  "group": "G1", "concept": "command:payer" } ],
  "links":    [ { "from": "G1.C2", "to": "G1.E2", "type": "produces", "rule": "R1" } ],
  "warnings": [ { "code": "W2", "level": "attention", "elements": ["G3.P1"],
                  "message": "Policy sans commande émise" } ]
}
```

Éléments dans l'ordre des groupes, puis de lecture (haut en bas, gauche à droite) ; post-it isolés à la fin.

## Hors sujet (limites connues)

Pas de lien entre groupes (le `concept` sert à les rapprocher), un Hotspot ne vise qu'un voisin, pas de délais. Les
cases proposées au glisser (`places/placesAround.ts`) ne suivent pas encore ces règles (Event → Event côte à côte,
Constraint → Event, Command → System, Query → Actor, Constraints empilées) : à aligner dans un sujet à part, une fois
l'export vu sur le mur.

- **Fini quand :** sur `tests/fixtures/eventstorming-commande.drawio`, le bouton « Exporter en JSON » de la section
  Event storming du panneau de la page ouvre la fenêtre d'export avec le JSON copiable : 38 éléments, 3 groupes
  (Paiement accepté, Paiement refusé, Rupture de stock), et les résultats attendus du mur d'exemple (37 liens,
  5 avertissements : un W2 sur « Quand le stock est réservé, demander le paiement », quatre W1), ou chaque écart
  expliqué règle par règle ; le panneau « Exporter » de la barre de droite est inchangé ; tests de l'exporteur (types,
  ids et rangs, concept, groupes et numérotation, seuil de 20 %, R1 à R5 dont le retrait du `causes`, W1 à W8,
  post-it isolé) ; `make check` vert.
- Fait : règles `src/engine/plugins/modes/eventstorming/export/wallRules.ts` (`readWall` : R1 à R5, W1 à W8, seuil
  `MIN_CONTACT_SHARE` = 0,2 sur la plus grande part des deux bouts ; un Hotspot ignore tous ses autres contacts, faibles
  compris ; les liens R3 viennent après R1 / R2, puis le `causes` doublé par une Policy est retiré) ; format
  `export/json.ts` (`wallExport`, ids, concept par `normalizedText`, rangement ; `eventStormingExporter`, format
  `json`), exposé par le nouvel `api.ts` du mode ; partie appli `src/app/plugins/modes/eventstorming/index.tsx`
  (section « Event storming » du panneau de la page, bouton et `ExportDialog`). Panneau « Exporter » inchangé. Écart :
  `pivot` suit les quatre états du sujet 517 (`true`, `false`, `unknown`, `null`). Tests
  `tests/engine/plugins/modes/eventstorming/export/json.test.ts` : sur `eventstorming-commande.drawio` ouvert comme
  dans l'appli, 38 éléments, 3 groupes, 37 liens, 5 avertissements (quatre W1 attendus, W2 sur « Quand le stock est
  réservé, demander le paiement »), R3 et R5 du mur ; règles une par une. SPEC §14.5, SUMMARY. Vérifié dans l'appli
  sur le serveur partagé : section et bouton, fenêtre « Export JSON » avec le texte copiable ; la page ouverte était une
  version antérieure du mur (formes Titre, groupes sans libellé, Query Model « Commandes en attente de paiement »
  décollé) : libellés `null`, W7 sur ce post-it et ses deux liens en moins (35), comme attendu. Le compte 37 / 5 sur la
  fixture actuelle : par les tests seulement.
