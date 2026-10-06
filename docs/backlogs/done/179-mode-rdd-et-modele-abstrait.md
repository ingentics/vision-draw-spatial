# Mode RDD et forme « Modèle abstrait »

> Milestone — mode RDD (Relational Database Designer) ; dépend de 178

Nouveau mode de page **« RDD — Relational Database Designer »** (`spatial.mode=rdd`), à côté de Séquences, et sa
forme de base, le **modèle** : toutes les formes de table du mode (180, 181) l'étendent.

- **Mode** : `src/engine/modes/rdd/` (définition, formes dans `shapes/`), `src/app/modes/rdd/` si besoin.
  `viewModes: ['top']` (2D seulement) ; liste blanche = les seules formes du mode (aucune forme générale) ;
  catégorie de palette « RDD ».
- **Modèle abstrait** (`rdd-model`, palette « Modèle abstrait », mots-clés `model`, `abstract`, `table`) :
  - rectangle en deux zones : **entête** en haut (le label, centré, gras) puis, séparée par un trait, la **zone des
    champs** (un champ par ligne, alignés à gauche) ; un modèle abstrait a son nom en italique et la mention
    `«abstract»` en petit au-dessus du nom ;
  - **champs** : `spatial.fields`, liste JSON de noms (`["name","created_at"]`) ; vide pour un modèle abstrait
    neuf. Leur édition (ajout, type, ordre…) est hors de ce sujet (comportements des modèles, voir l'idée 185) ; un
    champ « Champs » texte (un par ligne) dans le panneau suffit pour l'instant ;
  - **couleur d'entête** : réglage « Couleur » du panneau, choix parmi la palette des couleurs de l'appli
    (`modePalette`) ; écrite en `fillColor` de l'entête (style draw.io) ; texte de l'entête noir ou blanc selon le
    contraste ; zone des champs blanche ;
  - **table secondaire** : case « Table secondaire » (`spatial.secondary=1`) ; rendu 20 % plus petit : texte,
    hauteur d'entête et de ligne × 0,8 ; cocher / décocher redimensionne la forme × 0,8 / ÷ 0,8 depuis son coin
    haut-gauche (une étape d'annulation) ;
  - hauteur : entête + une ligne par champ (min. une ligne vide) ; la forme grandit quand on ajoute un champ.
  - Fichier draw.io : `swimlane;fontStyle=1;startSize=26;fillColor=<couleur>;spatial.kind=rdd-model;…` : draw.io
    montre l'entête et sa couleur ; les champs n'y apparaissent pas (à reprendre si besoin).
- **Fini quand :** sur une page passée en mode RDD, l'appli est en 2D (iso / 3D indisponibles), la palette ne
  propose que « Modèle abstrait » ; posé, il montre « «abstract» » + son nom, une zone de champs ; la couleur
  d'entête se choisit dans la palette ; « Table secondaire » le rend 20 % plus petit ; le fichier rouvert dans
  draw.io montre un swimlane de la même couleur (`make drawio-check`) ; `make check` vert.
- Fait : mode `src/engine/modes/rdd/` (`viewModes: ['top']`, liste blanche des tables, catégorie « RDD », icône de
  table) ; base des tables `rdd/table.ts` (`table(id, palette)`, `TABLE_KINDS` : mention et italique par forme,
  rendu 2D : corps blanc, entête `fillColor` avec texte noir / blanc au contraste, trait, mention, nom, champs) ;
  forme `rdd/shapes/model/` (`rdd-model`). Entête de 38 px pour une table à mention (26 sans), lignes de 20 px.
  Opérations `rdd/tables.ts` : `setFields` (hauteur ajustée), `setHeaderColor` (`fillColor` + `fontColor` pour
  draw.io), `setSecondary` (× 0,8 / ÷ 0,8 depuis le coin haut-gauche, `startSize` et `fontSize` suivent). Cadre :
  `ModeEdit.setElementStyle` et `setShapeBounds`, `ModeProperty` texte `multiline` (zone de texte, ⌘ + Entrée), choix
  d'un `select` recevant la palette de l'appli ; `readableOn` passé dans `render/styleValues.ts` ; section du mode
  masquée quand tous ses réglages le sont. Tests `tests/engine/modes/rdd.test.ts`, fixture `rdd.drawio` (réenregistrée
  par draw.io 24.7.5 : swimlanes de la bonne couleur, attributs conservés). Docs : SPEC §14.3, §14.5,
  `AJOUTER_UN_MODE.md`. Vérifié dans l'appli : 2D seule (Iso / 3D désactivés), palette réduite au modèle, pose depuis
  la palette, champ ajouté (la table grandit), couleur, table secondaire et annulation.
