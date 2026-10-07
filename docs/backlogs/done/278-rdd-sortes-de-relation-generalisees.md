# RDD : sortes de relation généralisées

> Refactor — mode RDD (relations) ; issu de l'analyse 273 (pattern A1) ; après 277 (`TableKindId`). Prépare 269
> (document → champ dynamique, sans champ créé) et 272 (source → vue, sans champ créé, en tirets).

- **`RelationKind`** :
  - `from`, `to` : `TableKindId[]` ; `toField?(field)` : l'arrivée est un champ précis de la forme (servira à 269) ;
  - `field?` : champ créé dans la forme d'arrivée (`kind`, `label(rows, source)`, `texts`, `ownedByEdge`) ; absent :
    aucun champ, `syncRelations` ne crée ni ne suit rien pour cette sorte ;
  - `look(field, settings): EdgeLook` pur (`startArrow`, `endArrow`, `startText`, `endText`, `dashed`) ;
  - `properties?` : formulaire « Relation » ; absent ou vide : pas de section.
- **Un seul écrivain** `writeEdgeLook(edit, edgeId, look)` qui écrit toutes les clés (pointes, remplissages, textes
  de bout, `dashed`) : il remplace `writeEnds`, `ends.ts` et l'effacement des réglages des autres sortes dans
  `writeRelationEdge`. `writeCardinalities` devient `cardinalitiesLook(nullable, shown)`.
- **Noms** : `fieldIsRelation` → `field.ownedByEdge` ; `linksTables` → `canLink` ; `relationOnlyField` suit.
- `tableRelation` et `embeddedRelation` portés sur ce format **sans changement visible**.
- `ModeEdit.removeEdge` n'est pas fait ici : 269 l'ajoutera s'il en a besoin.
- **Fini quand :** une sorte de relation se déclare sans toucher `syncRelations` ni `writeRelationEdge` ; un test
  par sorte sur son `look` (sans `ModeEdit`) ; un test « sorte sans champ » (sorte de test) qui ne crée aucun champ ;
  à l'œil sur `rdd.drawio`, flèches entre tables (cardinalités affichées / masquées) et embedded inchangées ;
  `make drawio-check` et `make check` verts.
- Fait : `RelationKind` (`relations/kind.ts`) : `from` / `to` en `TableKindId[]`, `toField?` déclaré (pas encore lu),
  `field?` (`kind`, `label`, `texts`, `ownedByEdge`), `look(field, settings): EdgeLook` pur, `properties?`. Seul
  écrivain `writeEdgeLook` (`relations/edgeLook.ts`, avec `leavingDirection`) : pointes, remplissages retirés, `dashed`,
  textes des deux bouts ; `ends.ts` et `writeEnds` disparaissent, `writeCardinalities` devient `cardinalitiesLook`.
  `writeRelationEdge(edit, edgeId, field?, settings, index)` sert les sortes avec ou sans champ ; il retire toujours
  les réglages du formulaire des autres sortes (exigé par le test « flèche qui change de sorte »). `syncRelations`
  ne crée ni ne suit de champ pour une sorte sans champ (son apparence seule est écrite) et reçoit les sortes en
  paramètre (`RelationIndex.kinds`) : une sorte se déclare sans toucher `syncRelations` ni `writeRelationEdge`.
  Noms : `fieldIsRelation` → `field.ownedByEdge`, `linksTables` → `canLink`, `relationOnlyField` → `edgeOwnedField`.
  Tests : `relations.test.ts` déplacé en `relations/index.test.ts` (un dossier `relations/` de tests apparaît ; seuls
  les imports et le nom `canLink` changent), `look` testé par sorte sans `ModeEdit` (`tableRelation.test.ts`,
  `embeddedRelation.test.ts`), sorte de test sans champ (vue → entité, en tirets) qui ne crée aucun champ. Écart :
  `dashed` est désormais écrit par le mode sur toute flèche de relation, donc retiré d'une flèche passée en tirets dans
  draw.io (aucune sorte n'en a encore). Vu dans l'appli sur `rdd.drawio` : User → Role (champ `relation1`, pointes ER,
  « 0,n » / « 0,1 », trait plein), cardinalités masquées puis réaffichées (pointes gardées), Address → Role (champ
  « Address », ni pointe ni texte). `make drawio-check` vert (841 tests, fixtures inchangées).
