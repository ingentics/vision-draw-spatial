# RDD : champs structurés (kind, label, type, nullable)

> Milestone — mode RDD (comportements des modèles) ; reprise de 179, 180

- `spatial.fields` passe d'une liste de noms à une liste d'objets :
  `{"kind":"pk|property|fk|external-fk","label":"…","type":"…","nullable":true|false}`.
- **Kinds** : `pk` (clé primaire), `property`, `fk` (clé étrangère), `external-fk` (clé étrangère d'un autre domaine).
- **Types** (`type`, identifiant écrit / libellé affiché) : `integer` « Nombre entier », `decimal` « Nombre réel »,
  `string` « Phrase », `text` « Texte », `boolean` « Booléen », `dynamic` « Dynamique », `money` « Money ». Un type
  inconnu est signalé dans Diagnostics.
- **Clé primaire jamais nullable** : `nullable` est toujours faux sur `pk` (forcé à l'écriture, signalé s'il est vrai
  dans le fichier).
- **Pas de compatibilité** avec l'ancien format ni avec draw.io (le mode RDD ne vise pas l'ouverture dans draw.io) :
  pas de lecture des listes de chaînes ; la fixture `rdd.drawio` est réécrite au nouveau format, sans
  `make drawio-check`. Une valeur illisible = aucun champ (et signalée dans Diagnostics).
- La clé primaire reste en tête, unique, ni supprimable ni déplaçable (règle de 180, sur `kind=pk`).
- Rendu inchangé à ce stade (label seul) ; le champ « Champs » du panneau reste (un label par ligne) jusqu'à 250.
- **Fini quand :** la fixture réécrite s'ouvre avec ses champs ; une table modifiée écrit le nouveau format ;
  Diagnostics signale toujours une clé primaire absente ou déplacée ; tests de lecture / écriture ; `make check` vert.
- Fait : `rdd/tables.ts` : types `Field` / `FieldKind`, `FIELD_KINDS`, `FIELD_TYPES` (identifiant → libellé),
  `PRIMARY_KEY` devient le champ `{pk, id, integer}` ; `fieldsOf` ne lit que des objets (entrée sans label ou au kind
  inconnu ignorée, `nullable` forcé à faux sur `pk`), `fieldsValue` écrit la liste (clés dans un ordre fixe),
  `tableFields` ramène le premier `pk` en tête (ou l'ajoute), `misplacedPrimaryKey` teste `kind=pk`, `fieldProblems`
  donne les défauts signalés par `check` (valeur ou entrées illisibles, type inconnu, clé primaire nullable).
  `operations.ts` : « Champs » reste un label par ligne ; un label déjà présent garde son champ, un nouveau est une
  propriété `string` non nullable. « Clé primaire » du panneau montre le label du `pk`. Rendu : seul le label est
  dessiné, soulignement sur `kind=pk` (même résultat qu'avant). Fixture `rdd.drawio` réécrite au nouveau format
  (clés primaires, `fk` role et author nullable, `dynamic` pour le document, `city` nullable) ;
  `drawio-saved/rdd.drawio` réenregistrée par draw.io pour le test de conservation existant (seul fichier, pas de
  `make drawio-check` complet). Tests `rdd.test.ts` (lecture, ancien format refusé, entrées illisibles, type inconnu,
  clé primaire nullable, écriture). SPEC §14.5 et tableau des attributs. Vérifié dans l'appli : fixture affichée comme
  avant, 2 diagnostics attendus (Orphan, Document) ; un champ ajouté par « Champs » sur Orphan écrit la clé primaire
  en tête (diagnostic levé). Une copie de l'ancien fichier gardée par le navigateur s'ouvre sans champs, avec un
  diagnostic par table.
