# RDD : relations entre tables

> Milestone — mode RDD (comportements des modèles) ; dépend de 246, 248, 250

- **Liaisons permises** : une flèche part d'une entité, d'une énumération ou d'un embedded, et arrive sur une entité
  ou une énumération. Vue, document, région (et modèle abstrait) n'ont aucun lien : ni poignée de connexion, ni
  cible. Un embedded n'est jamais une cible. Une flèche du fichier qui enfreint la règle est signalée (Diagnostics).
- **Champ de relation** : une flèche A → B ajoute dans la **cible B** un champ `fk` (icône relation), sans type
  (aucun type affiché, pas de choix de type), optionnel, en fin de liste, nommé `relation1`, `relation2`… (premier
  numéro libre) ; depuis un embedded, du nom de l'embedded (`Address`, puis `Address1`, `Address2`…). Le champ
  retient l'id de sa flèche (`edge` dans `spatial.fields`).
- Le champ suit sa flèche : flèche (ou table de départ) supprimée → champ retiré ; bout d'arrivée rebranché sur une
  autre table → le champ y passe (nom, renuméroté s'il est pris, et propriétés) ; flèche qui ne relie plus deux tables
  permises → champ retiré. Le champ se renomme ; son kind et son type ne se changent pas, et Suppr ne le retire pas.
- **Cardinalités**, imposées d'après « Optionnel » du champ : au début `ERzeroToMany` et « 0,n » ; à la fin
  `ERmandOne` et « 1,1 », ou `ERzeroToOne` et « 0,1 » si le champ est optionnel. Textes dans le style de base des
  textes de début / fin (taille et gris des paramètres, contre le bout, du côté où la flèche touche la table, avec
  4 px de marge en plus pour les pointes). Ni le panneau ni le canevas (édition, déplacement, retournement des textes
  de bout) ne permettent de les changer.
- **Encart « RDD » du panneau de la page** : case « Afficher les cardinalités » (cochée par défaut ; décochée,
  `spatial.cardinalities=0` sur la page, et les flèches de relation n'ont ni pointes ni textes).
- **Panneau d'une flèche de relation** : section « Relation » en tête (« Nom inverse », `spatial.reverseName`) ;
  texte du milieu et commentaire modifiables ; début / fin, tracé, bouts et disposition en lecture seule ; « Position
  des textes » et « Lien » masqués ; Supprimer reste.
- Le moteur dessine les pointes ER de draw.io (`ERone`, `ERmandOne`, `ERmany`, `ERoneToMany`, `ERzeroToOne`,
  `ERzeroToMany`), proposées aussi dans « Bouts » des autres flèches.
- **Fini quand :** sur une page RDD, entité → entité ajoute `relation1` dans la cible (sans type), embedded → entité
  ajoute un champ au nom de l'embedded ; ni vue, ni document, ni région ne se connectent, ni un embedded en cible ;
  supprimer ou rebrancher la flèche retire ou déplace le champ ; cardinalités et textes « 0,n » / « 0,1 » ou « 1,1 »
  aux bouts, suivant « Optionnel », masqués par la case de la page ; panneau de la flèche comme ci-dessus ; annuler revient en arrière d'une étape ;
  `make check` vert.
- Fait : moteur — points d'extension de mode `connects` (bout tiré ou rebranché accroché aux seules formes permises,
  `PageModes.endAccepts` → `Anchors.endAttachmentAt` / `Picking.shapeAt` via `accepts`), `edgeReconnected` (appelé au
  lâcher d'un bout, `edgeEnd.ts`), `managesEdge` (panneau et textes de bout verrouillés, `edgeTexts.ts`,
  `labelEditor.ts`), `ModeEdit.setEdgeEndText` (texte de début / fin dans la configuration par défaut, `modeEdits.ts`)
  et `ModeEditContext` (palette et réglages des textes de bout, `PageModes.editContext`). Une forme
  `connectable: false` n'a plus de poignée de connexion (`registry.ts`). Pointes ER dessinées (`markers.ts`, traits
  `strokes`, `edge.ts`) et proposées dans « Bouts ». RDD — `relations.ts` (`linksTables`, `syncRelations` appelé à la
  création, au rebranchement, après suppression, à la pose et à l'ouverture ; `forbiddenLinks` dans Diagnostics),
  `cardinalities.ts` (pointes, textes, côté d'attache, case de la page), `TableKind.links`, champ `edge`,
  `newFieldLabel(rows, prefix)`, kind / type / Suppr bloqués (`operations.ts`), pas de type au panneau
  (`fieldProperties.ts`), région, vue, document et modèle non connectables. Appli — `ContextPanel.tsx` (section
  « Relation » en tête, sections verrouillées `panel-locked`, encarts de page par `section`). Écart : les tests qui
  prenaient `ERmandOne` comme pointe inconnue prennent `doubleBlock`. Tests `tests/engine/modes/rdd/relations.test.ts`,
  `markers.test.ts`. Vérifié dans l'appli : User → Role ajoute `relation1`, « 0,n » / « 0,1 » gris avec patte d'oie et
  cercle, « 1,1 » et double barre quand « Optionnel » est décoché, Address → User par le bas (texte le long du trait),
  panneau de la flèche, encart « RDD » de la page ; annulation en une étape. Rebranchement, suppression et case
  décochée vérifiés par les tests seulement.
