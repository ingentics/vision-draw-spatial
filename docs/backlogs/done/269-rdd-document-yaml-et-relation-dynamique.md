# RDD : document au contenu YAML, relié aux champs dynamiques

> Itération — mode RDD (document, relations) ; reprise de 181, 218, 247, 268 ; dépend de 331 (texte multiligne) et
> 333 (flèche vers une partie)

Un document n'est pas un modèle : il n'a pas de champs, c'est un contenu non structuré. Son corps devient un texte
YAML libre, et sa seule relation dit « ce champ dynamique peut contenir ce document ».

- **Corps YAML**
  - Stocké dans un attribut du document (`spatial.rdd.body`) : l'export vers draw.io n'est pas un but, seul l'import
    compte (pas de cellule enfant).
  - Affiché en 7 pt, police monospace, sans coloration syntaxique pour le moment.
  - Tronqué à la zone du corps, sans retour à la ligne : « … » en fin de ligne trop longue, et en dernière ligne
    visible quand le texte dépasse en hauteur.
- **Taille libre** : la hauteur du document ne se calcule plus d'après son contenu (sujets 247, 263, 264) ; elle se
  règle à la main, avec une taille par défaut à la pose.
- **Pas de champs** : ni « + », ni sélection, survol, séparateurs ou réordonnancement de champs sur un document.
- **Saisie** : double-clic dans la zone du corps → édition multiligne dans le canvas (on y colle son YAML) ; Entrée
  passe à la ligne, ⌘ + Entrée ou un clic dehors valide, Échap annule (comme le label multiligne) ; les tabulations
  deviennent 2 espaces (interdites en YAML). Le double-clic sur l'entête édite toujours le nom.
- **Panneau** : section « Document body », éditable, qui montre le YAML en entier, avec ascenseurs au besoin.
- **Diagnostics** : un YAML invalide est signalé, sans bloquer la saisie.
- **Documents existants** : leurs clés (lignes en italique, sujet 181) sont converties en YAML à l'ouverture, une
  ligne `clé:` par clé.
- **Relation document → champ dynamique** (nouvelle sorte de relation, cf. 268) :
  - départ : un document ; arrivée : un champ de type « Dynamique » d'une entité, d'un embedded ou d'une
    énumération (le seul bout possible) ;
  - la flèche arrive sur la ligne du champ, du côté le plus proche du document, et la suit s'il change de place ;
    aucun champ créé ;
  - flèche en tirets, sans pointe ER ni texte ; pas de section « Relation » au panneau ;
  - un même champ dynamique peut recevoir plusieurs documents (« dans cette zone, ces documents sont possibles ») ;
  - une flèche du document vers autre chose qu'un champ dynamique n'est pas une relation du mode ;
  - le champ cesse d'être « Dynamique » ou est supprimé → la flèche est supprimée.
- **Fini quand :** un document posé n'a pas de « + » ; un double-clic dans son corps permet d'y coller du YAML,
  affiché en 7 pt monospace et tronqué avec « … » ; le panneau montre le YAML complet sous « Document body »,
  éditable, avec ascenseurs ; un YAML invalide apparaît dans Diagnostics ; un document de `rdd.drawio` à clés
  s'ouvre en YAML ; une flèche document → champ « Dynamique » (entité, embedded, énumération) arrive à hauteur du
  champ, et disparaît quand le champ change de type ; `make check` vert.
- Fait : **Corps** : `tables/documentBody.ts` (`spatial.rdd.body` en chaîne JSON, `;` échappés en `;` car le cœur
  les retire des attributs de mode ; tabulations → deux espaces ; `convertDocumentKeys` à l'ouverture : une ligne
  `clé:` par clé, `spatial.rdd.fields` retiré). `TableRules.fields` faux et `body` pour le document : `tableFields` vide,
  pas de « + », ni bouton de séparateur, `fitTable` sans effet (taille libre, `resizable` vrai, 200 × 120 à la pose,
  « Table secondaire » met la taille réglée × 0,8). Rendu `createLabel(…, { monospace, truncate })` dans `bodyZone`
  (`tableLayout.ts`), 7 px. Édition : partie `body` par le nouveau point d'entrée de cœur `ModeParts.textAt` (texte
  modifiable au double-clic sans être une partie sélectionnable : `ShapeParts.textPartAt`, `PointerInput.handleDoubleClick`),
  multiligne et monospace (sujet 331) ; panneau « Document body » (`TABLE_PROPERTIES`, zone monospace). Diagnostics :
  `yamlProblem` (`core/diagnostics/yamlCheck.ts`, paquet `yaml` ajouté aux dépendances, réexporté dans l'API des
  plugins). `look.italicFields` retiré (plus aucun champ en italique) ; `fieldLayout` / `rowWidth` / `addFieldRow`
  perdent leur paramètre `kind`. **Relation** : sorte `relations/kinds/document/` (`toField` : type « Dynamique »,
  tirets sans pointe ni texte, sans formulaire) ; le champ retient ses flèches (`Field.incoming`) ; `canLink` reçoit la
  partie visée (sujet 333) ; `syncRelations(…, link)` remet les champs d'arrivée en ordre (`arrivalsAfter`) ;
  `relations/arrivals.ts` : `placeArrivals` (`entryX` / `entryY` / `entryPerimeter=0` au milieu de la ligne, côté le
  plus proche du document, appelé par `fitTable`, `moveField` et la synchronisation) et `releaseArrivals` (flèches
  supprimées quand le champ change de type ou est supprimé, par le nouveau `ModeEdit.removeEdge` du cœur). Une flèche de
  document hors d'un champ dynamique n'est pas une relation (`indexedRelationKind` vérifie le champ d'arrivée) :
  signalée. Écarts : un document n'a plus de clés en italique ni de hauteur calculée ; il a des poignées de connexion.
  Docs : SPEC §14.5 et table des attributs, `AJOUTER_UN_MODE.md` (`textAt`, `removeEdge`). Fixture
  `rdd-document.drawio` (corps, flèche vers `settings`, document à clés, YAML invalide) ; `make drawio-check` : corps,
  `incoming` et `entryX` / `entryY` conservés par draw.io. Tests : `documentBody.test.ts`, `kinds/document/index.test.ts`,
  `yamlCheck.test.ts`, `pointerInput.test.ts`, `modeEdits.test.ts` (`removeEdge`), tests RDD adaptés. Vu dans l'appli
  sur `rdd-document.drawio` : corps en monospace tronqué par « … » (largeur et hauteur), document à clés converti,
  panneau « Document body » avec ascenseur, poignées de redimensionnement sans « + », flèche tirée vers `payload` de
  Kind (arrivée à hauteur de la ligne, tirets, sans section « Relation »), supprimée en passant le champ en « Phrase »,
  double-clic dans le corps → éditeur multiligne, ⌘ + Entrée valide ; YAML invalide dans Diagnostics. Par les tests
  seulement : conversion des tabulations, suivi d'un champ déplacé, rebranchement, `Settings` de `rdd.drawio`.
