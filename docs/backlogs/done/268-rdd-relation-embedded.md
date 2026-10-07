# RDD : la relation embedded, une sorte de relation à part

> Itération — mode RDD (relations) ; reprise de 265, 266, 267

- Les relations du mode se rangent **par sorte**, chacune avec ses tables de départ et d'arrivée, le nom de son champ,
  ses bouts et son propre formulaire ; les sortes à venir (relation vers une vue, vers un document) s'y ajoutent sans
  toucher aux autres.
  - **Relation entre tables** : entité ou énumération → entité ou énumération ; champ `relation1`, `relation2`… ;
    cardinalités (pointes ER et textes, sujets 265, 266) ; panneau « Relation » : « Nom inverse »
    (`spatial.reverseName`).
  - **Relation embedded** : embedded → entité ou énumération ; champ au nom de l'embedded (inchangé), de kind `embed` :
    losange violet `#ae62e3` à trou blanc, toujours optionnel (`docs/assets/embed_opt.svg`, `embed.svg`) ; **pas de
    cardinalité** (un embedded n'est pas une table) : flèche sans pointe (`startArrow=none`, `endArrow=none`), sans
    texte de début ni de fin, quelle que soit la case « Afficher les cardinalités » ; panneau
    « Relation » : « Champ » (libellé du champ) et « Préfixe », à la place de « Nom inverse ».
  - **Champ embed** : pas un champ classique, la trace de sa relation. Toutes ses infos sont rangées dans le champ
    (`spatial.fields` : libellé, `prefix`) ; la flèche en est la porte d'entrée (le champ naît, suit et part avec
    elle). Sélectionné, il montre exactement le formulaire de la flèche (Champ, Préfixe) : ni type, ni Optionnel, ni
    Unique, ni PostgreSQL, ni Gouvernance ; il reste toujours optionnel. Modifier le champ ou la flèche modifie la
    même donnée. Le préfixe s'affiche en gris dans la ligne du champ, là où serait le type (ex. `Address  PLOP_`) ;
    la largeur de la table le suit.
- Une flèche qui change de sorte (bout de départ rebranché) prend les bouts de sa nouvelle sorte et perd les réglages
  de l'ancienne (dont le préfixe de son champ) ; son champ prend le kind de la nouvelle sorte.
- **Fini quand :** sur une page RDD, embedded → entité donne une flèche sans pointe ni texte, panneau Relation avec
  « Champ » et « Préfixe », un champ à losange violet, et le préfixe saisi apparaît en gris dans le champ ; le champ
  sélectionné montre le même formulaire, et une modification d'un côté se voit de l'autre ; entité → entité inchangée
  (cardinalités, « Nom inverse ») ; une relation embedded d'un fichier existant perd ses pointes ER et ses textes à
  l'ouverture ; `make check` vert.
- Fait : `src/engine/modes/rdd/relations/` — `kind.ts` (interface `RelationKind` : formes de départ et d'arrivée, nom
  du champ, bouts, formulaire), une sorte par fichier (`tableRelation.ts` : cardinalités et « Nom inverse » ;
  `embeddedRelation.ts` : `startArrow=none`, `endArrow=none`, sans texte, « Préfixe »), briques
  communes des bouts (`ends.ts`), registre `relationKinds.ts` (`RELATION_KINDS`, `relationKindOf`, `isLinkable`,
  `writeRelationEdge` : bouts de la sorte, réglages des autres sortes retirés), synchronisation et formulaires
  (`index.ts`, `RELATION_PROPERTIES`) ; `cardinalities.ts` déplacé dedans. Formulaire commun : `RelationKind.fieldTexts`
  (libellé, préfixe : textes du champ, écrits par `setField`), montrés sur la flèche (`RELATION_PROPERTIES`) et, pour
  une sorte `fieldIsRelation` (embedded), sur le champ sélectionné (`RELATION_FIELD_PROPERTIES`), dont les réglages
  classiques sont alors masqués (`FIELD_PROPERTIES`, `relationOnlyField`) ; un tel champ est remis optionnel ; un
  champ rebranché perd les textes d'une autre sorte ; `fieldNote` (`tables.ts`) donne le texte gris d'une ligne (type, sinon préfixe), suivi
  par `fieldLayout` et `fieldRow.ts`. Kind de champ `embed` (`FieldKind`, `FIELD_KIND_COLORS`) ;
  `RelationKind.fieldKind` donne le kind du champ créé ou rebranché. `TableKind.links` retiré : une table est
  connectable si une sorte la cite (`shapes/common/table.ts`). `newFieldLabel` passe de `operations.ts` à
  `tables.ts` (pur, évite un import circulaire). Écart : une relation embedded n'a plus de pointes ER ni de textes de
  cardinalité. Tests `tests/engine/modes/rdd/relations.test.ts` (sujet 268). Vérifié dans l'appli : Address → Role,
  flèche sans pointe ni texte, panneau Relation avec « Champ » et « Préfixe », « PLOP_ » en gris dans la ligne `Address` de
  Role, losange violet à trou blanc ; préfixe saisi sur la flèche, champ sélectionné (Champ et Préfixe seuls),
  renommé `home` depuis le champ, la flèche montre `home`. Changement de sorte vérifié par les tests
  seulement.
