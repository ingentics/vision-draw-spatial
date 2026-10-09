# RDD : bascule entre couche logique et couche physique (touche Tab)

> Itération — mode RDD, affichage des tables et des champs (suite de 413, qui pose « Nom de la table »).
> Dépend de 418 (Tab, courant suivant de la barre). Version minimale : tout dans le plugin `src/engine/plugins/modes/rdd/`,
> sauf un petit ajout au moteur (ci-dessous). Rien dans l'appli.

- Une page RDD a une **couche courante** : « Couche logique » (défaut) ou « Couche physique ». C'est un état de
  session, comme le flux courant des séquences (`ModeCurrent`) : jamais écrit dans le fichier ; une page rouverte
  repart en couche logique.
- **Renommage des clés d'un champ** : `pgName` → `dbName`, `pgType` → `dbType` (comme `dbName` d'une table),
  dans le modèle, le panneau (infobulles) et la doc. Sans migration : les anciennes clés `pgName` / `pgType` d'un
  fichier existant ne sont plus lues.
- **Tab** (zone de dessin, rien de sélectionné, hors saisie de texte) passe à l'autre couche : touche par défaut
  d'une barre du courant (sujet 418), le mode RDD ne déclare pas de touche.
- La couche courante se voit dans la **barre du courant** existante, en haut de la zone de dessin : libellé
  « Couche logique » ou « Couche physique », précédent / suivant pour basculer à la souris. Couleur de la barre :
  `#dae8fc` en logique, `#d5e8d4` en physique.
- **Couche logique** : affichage d'aujourd'hui, inchangé.
- **Couche physique** : seul l'affichage change (habillage du rendu, le style draw.io n'est pas modifié) :
  - titre d'une entité, vue ou énumération : `spatial.rdd.dbName` ; vide → le nom logique, en italique ;
  - nom d'un champ : `dbName` du champ ; vide → le nom logique, en rouge (`#e53935`) italique ;
  - type d'un champ : `dbType` ; vide → le type logique, en rouge (`#e53935`) italique ;
  - fragment (embedded) : ses champs comme ci-dessus ; son titre reste son nom (pas de nom en base : il est
    incorporé), sans marque de valeur manquante ;
  - tables sans couche physique (modèle abstrait, document) : affichées comme en logique, estompées.
- **Taille des tables** : la même dans les deux couches (largeur pour le plus long des noms et types, logiques ou
  physiques) : basculer ne déplace ni les tables ni les flèches. Changer un `dbName` ou un `dbType` au panneau
  réajuste la table.
- **Édition** : les noms physiques s'éditent au panneau (section « Couche physique ») et, en couche physique, sur
  place : le double-clic (ou Entrée) sur le titre écrit le `dbName` de la table (pas pour un fragment, dont le titre
  s'édite comme en logique), sur un champ (clé primaire comprise)
  son `dbName` ; l'éditeur, sur place comme en logique (sans fond, police et couleur du texte affiché), montre la
  valeur physique (vide si absente) ; vide la retire. Les noms logiques ne bougent pas. Le type n'a pas d'édition
  sur place : `dbType` au panneau.
- **Ajout au moteur** (seul changement hors rdd) : `dressing(page, values, current)` reçoit le courant du mode, et
  un courant qui le déclare (`ModeCurrent.redraws`) fait redessiner la page quand il change ; les textes des parties
  (`text`, `setText`, `textPreview`) reçoivent le courant, `parts.labelPart` fait éditer une partie à la place du
  texte de la forme, et `ModePartText.bold` met en gras l'éditeur d'une partie.
- L'export draw.io reste celui de la couche logique (le fichier ne change pas avec la couche).
- **Fini quand :** sur une page RDD avec une entité dont la table et quelques champs ont un nom et un type physiques,
  Tab bascule l'affichage : les noms et types physiques apparaissent (valeurs manquantes en italique, en rouge pour
  un champ, tables sans couche physique estompées), la barre en haut montre « Couche physique » ; Tab à nouveau, ou
  précédent / suivant de la barre, revient à l'affichage d'aujourd'hui ; les tables ne bougent pas ; rouvrir le
  fichier repart en logique. En couche physique, éditer le titre ou un champ sur place écrit son `dbName` sans
  changer le nom logique.
- Fait : moteur — `dressing(page, values, current)` reçoit le courant (`pageModes.ts`) ; `ModeCurrent.redraws` :
  scènes de la page reconstruites au changement de courant (`modeCurrents.ts`) ; `ModeParts.labelPart`, et le courant
  passé à `text` / `setText` / `textPreview` (`shapeParts.ts`, `labelEditor.ts` : le texte de la forme édité par la
  partie) ; `ModePartText.bold`. RDD — `tables/physicalLayer.ts` (courant `LAYER_CURRENT` : barre `#dae8fc` /
  `#d5e8d4`, estompage des tables sans couche physique ; habillage `layerStyle` : clé de style dessinée lue par le
  rendu ; textes affichés des deux couches) ; règle `physicalLayer` des formes de table (entité, énumération, vue,
  fragment), à part de `physicalName` (titre ; pas le fragment) ; rendu (`table.ts`, `fieldRow.ts`) : valeurs
  physiques, absentes en italique, en rouge `#e53935` pour un champ ; largeur pour les textes des deux couches
  (`tableLayout.ts`) ; édition sur place du titre et des champs en couche physique (`fieldParts.ts`, partie `name`,
  éditeur sans fond, en gras, couleur de l'entête `headerTextColor`) ; `setPhysicalName` partagé avec le panneau
  (`operations.ts`). Clés de champ `pgName` / `pgType` renommées `dbName` / `dbType`, sans migration. Tab vient du
  moteur (418). Fixture `rdd-couches.drawio`. Tests : `physicalLayer.test.ts`, `modeCurrents.test.ts`,
  `partTexts.test.ts`, `modeHost` (courant). Vérifié dans l'appli : bascule par Tab et par la barre, valeurs
  physiques et manquantes, tables estompées, fragment affiché, tailles inchangées, édition du titre et d'un champ
  en couche physique sans toucher aux noms logiques. Changements de comportement : une table qui a une couche
  physique a la place des textes des deux couches (peut s'élargir en logique) ; les anciennes clés `pgName` /
  `pgType` d'un fichier ne sont plus lues.
