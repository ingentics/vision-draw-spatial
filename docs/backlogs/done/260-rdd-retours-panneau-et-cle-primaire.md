# RDD : retours sur le panneau, la clé primaire et les propriétés des champs

> Itération — mode RDD (panneau, champs) ; reprise de 179, 180, 222, 246, 249, 256

- **Couleur** : le réglage « Couleur » de la section RDD d'une table est retiré ; la couleur de l'entête vient du style
  de la forme (styles du panneau « Style », `fillColor` / `fontColor`). La région garde sa « Couleur ».
- **Volume** : la section « Volume » du panneau d'une forme est masquée quand le mode de la page ne permet ni l'iso
  ni la 3D (mode RDD).
- **Icône** : la case « Icône » est retirée ; l'icône d'entête est toujours affichée (`spatial.icon=0` d'un fichier est
  ignoré).
- **Clé primaire** : son label est toujours `id` (ni édition sur place, ni panneau) ; son type est imposé et ne se
  choisit pas : « Primary key » sur une entité, « Mot » sur une énumération (types fixes, absents de la liste des
  autres champs). Lecture : une clé primaire d'un fichier prend ce label et ce type.
- **Unique** : case « Unique » d'un champ (pas la clé primaire) des entités, énumérations et embedded ; écrite
  `unique: true` dans le champ.
- **Panneau d'un champ**, en trois sections :
  - « RDD — Relational Database Designer » (fonctionnel) : « Champ », « Type », « Optionnel » (ancien « Nullable »),
    « Unique » (tables concernées), « Commentaire » (texte propre au champ, `comment`, en zone de texte sous son
    libellé, sur toute la largeur) ; « Rôle » est masqué (le kind
    reste dans les données) ; le bouton « Ajouter un séparateur » reste en bas.
  - « PostgreSQL » : « Nom du champ » (`pgName`, texte) et « Type » (`pgType`, texte libre, ex. `varchar(255)`).
  - « Gouvernance » : « GDPR » (`gdpr`) et « Donnée personnelle » (`personal`), cases à cocher.
  Les nouvelles clés ne sont écrites dans le champ que si elles sont renseignées. Un séparateur garde son seul texte.
- Cadre : un réglage de mode peut déclarer sa section (`ModeProperty.section`, titre de la section ; défaut : le nom
  du mode).
- **Fini quand :** sur une table, plus de « Couleur » ni d'« Icône » dans la section RDD, plus de « Volume » ; `id`
  ni renommable ni retypable, « Primary key » sur User, « Mot » sur Role ; le panneau d'un champ montre les trois
  sections, ses réglages s'écrivent et se relisent ; `make check` vert.
- Fait : réglage « Couleur » des tables retiré avec `setHeaderColor` (le style de la forme fait la couleur ; rien
  n'était dans `spatial.fields`) ; case « Icône » retirée avec `ICON` et `setIcon`, `shownMark` = l'icône de la forme
  de table ; section « Volume » masquée quand le mode n'a ni iso ni 3D (`ContextPanel`). Clé primaire :
  `TableKind.primaryKey` donne son type (`KEY_TYPES` : `primary-key` « Primary key » pour l'entité, `word` « Mot »
  pour l'énumération), `primaryKeyField` impose `id` et ce type à la lecture (`tableFields`) en gardant commentaire,
  PostgreSQL et gouvernance ; `setField` refuse de renommer ou retyper la clé ; pas de texte sur place pour elle
  (`fieldParts.text`), et un double-clic sur une partie sans texte ne fait que la sélectionner (`PointerInput`).
  Champ : clés facultatives `unique`, `comment`, `pgName`, `pgType`, `gdpr`, `personal` (`Field`, lues et écrites
  seulement si renseignées), `TableKind.uniqueFields` (entité, énumération, embedded). Nouveau
  `rdd/fieldProperties.ts` (réglages d'une ligne, sortis de `index.ts`) : « Champ » (lecture seule pour la clé),
  « Séparateur », « Type » (choix, ou type imposé en lecture seule pour la clé), « Optionnel », « Unique »,
  « Commentaire » (zone de texte sur toute la largeur, `multiline`) ; sections « PostgreSQL » et « Gouvernance » ; « Rôle » retiré du panneau. Cadre :
  `ModeProperty.section` et `readOnly` fonction ; `ElementModeSection` rend une section par titre. Le fixture garde des
  clés `integer`, lues « Primary key » / « Mot ». Tests `rdd.test.ts` (réglages de table, plus de couleur, icône
  toujours là, panneau d'un champ en trois sections, écriture / relecture / retrait des nouvelles clés, clé primaire
  imposée et non modifiable, « Unique » par table). SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : Orphan
  sélectionnée → ni « Couleur », ni « Icône », ni « Volume » ; `id` → « Champ » id et « Type » Primary key en lecture
  seule, sections PostgreSQL et Gouvernance ; `name` → Champ, Type, Optionnel, Unique, Commentaire, puis PostgreSQL
  et Gouvernance ; double-clic sur `id` → aucun éditeur.
