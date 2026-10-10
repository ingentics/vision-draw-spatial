# Event storming : règles de chaque type de post-it dans un fichier de configuration, une seule grammaire

> Itération — mode Event storming, reprise de 481 / 486 (cases au glisser), 518 (lecture du mur) et 519 (messages
> des avertissements)

- **Fichier de configuration** `src/engine/plugins/modes/eventstorming/stickyRules.ts`, une entrée par type de
  post-it : `right` (R1, post-it collés à sa droite et lien de lui vers eux), `glued` (R2, collés de n'importe quel
  côté), `through` (post-it qui s'intercalent à sa droite, en pile : ses liens `right` les traversent), `stacks`
  (s'empilent sans lien ; un lien `right` vers l'un vaut pour toute la pile), `anywhere` (Hotspot : tout côté de
  tout post-it), `astride` (case à cheval au-dessus d'une Command et de son voisin, sujet 486), `place` et `example`
  (texte des messages W1, W7, W8).
- **Avertissements** dans le même fichier : niveau, message court, consigne et exemple de W1 à W8. Les conditions de
  déclenchement restent du code (`export/wallRules.ts`).
- **Une seule grammaire** : les cases au glisser (`places/placesAround.ts`) et la lecture du mur
  (`export/wallRules.ts`) lisent toutes deux ce fichier. Une case proposée est toujours un contact qui crée un lien
  (ou un empilement) ; un contact qui crée un lien a toujours sa case. Divergences tranchées (comportement des cases) :
  - `right` : case à droite de A pour B (et à gauche de B pour A) ; `glued` : cases sur les quatre côtés ; `stacks` :
    dessus et dessous d'un post-it du même type ; Hotspot : inchangé.
  - Retirées : Domain Event | Domain Event côte à côte, Constraint | Domain Event (aucune règle de lecture : W1).
  - Ajoutées : Command à droite d'un Domain Event (`causes`), Policy à droite d'un Domain Event, Domain Events
    empilés (R5), Query Model contre une Command, Constraint contre un Query Model ; Actor / Command, Command / System,
    Domain Event / System et Domain Event / Policy, Query Model / Actor, Constraint / Command sur les quatre côtés.
  - Lecture du mur : deux Constraints empilées ne donnent plus de W1 (comme deux Domain Events, R5) ; voir aussi les
    deux points suivants.
- **Une Command produit plusieurs Domain Events** : empilés à sa droite, tous sont produits par elle, même ceux qui ne
  la touchent pas (premier R1, suivants R5) ; avant, ceux-là avaient un W5. Généralisé : un lien R1 ou R2 vers un
  post-it d'une pile (`stacks`) vaut pour ceux de la pile qui n'ont pas déjà un lien de ce type. Policies empilées
  sur (ou sous, ou à droite de) l'Event qui les déclenche : toutes déclenchées, et chacune émet la Command à droite
  de l'Event (R3) ; plus de W2 ni de W3 sur les Policies du haut de la pile.
- **Policies intercalées** : Command | Policy | Domain Event, la Command produit l'Event (R1 à travers la Policy),
  l'Event déclenche la Policy (R2) ; plus de W1 entre la Command et la Policy. Les Policies s'empilent de haut en
  bas, aussi entre la Command et ses Events (chaque Event collé à droite de la pile est produit par la Command).
  Cases : Policy à droite d'une Command, Policies empilées.
- Mur des règles : le cas fautif « R5 / W5 — issue empilée que la Command ne touche pas » devient passant ; il est
  remplacé par deux cas ✓ (pile d'issues à droite de la Command, Policies empilées entre la Command et ses Events).
- Messages de place mis à jour : Command (Events empilés, Policies intercalées), Domain Event (issues empilées), Policy
  (sous ou à droite de son Event, intercalée, empilée), Constraint (empilées).
- **Fini quand :** modifier une règle dans `stickyRules.ts` change à la fois les cases au glisser et la lecture du mur ;
  sur `eventstorming-commande.drawio`, glisser une Command près d'un Domain Event montre la case à sa droite, une
  Constraint près d'une Command montre les cases autour de la Command et celle à cheval ; le mur des règles
  `eventstorming-regles.drawio` garde ses avertissements, sauf l'ancien cas R5 fautif, et ses deux nouveaux cas ✓
  n'ont aucune pastille ; tests ; `make check` vert.
- Fait : configuration `stickyRules.ts` (`STICKY_RULES` par type : `right`, `glued`, `through`, `stacks`, `anywhere`,
  `astride`, `place`, `example` ; `WARNINGS` : niveau, message, consigne, exemple ; `named`) ; `kinds.ts` (`key`,
  `StickyKey`, `stickyOfKey`) ; cases `places/placesAround.ts` (`sidesFor` lu dans la configuration, `SIDES` du tronc
  réexporté par l'API des plugins) ; lecture `export/wallRules.ts` (R1 / R2 lus dans la configuration, piles
  `pileOf`, R1 à travers une pile intercalée, lien propagé à la pile, R5 généralisé aux piles) ; messages
  `warnings/warningHints.ts` réduit à la mise en forme ; `export/json.ts` (imports). Tests : `stickyRules.test.ts`
  (chaque case proposée se lit, aucun lien sans case), `places/placesAround.test.ts`, `export/json.test.ts` (pile
  d'Events, Policies intercalées, Policies empilées sur leur Event), `warnings/wallCases.test.ts`. Fixture
  `eventstorming-regles.drawio` : cas `r5-ko` retiré, cas ✓ `pile-ok` et `between-ok` ajoutés. SPEC §14.5, SUMMARY.
  Vérifié dans l'appli sur le serveur partagé : message de pastille tiré de la configuration (W7 sur
  `eventstorming-commande.drawio`), les deux nouveaux cas du mur des règles sans pastille ; Policies empilées sur leur
  Event sans pastille : vu par l'utilisateur avant la correction, corrigé et vérifié par les tests seulement. Cases au
  glisser : par les tests seulement. Export JSON de `eventstorming-commande.drawio` inchangé (37 liens, aucun
  avertissement).
