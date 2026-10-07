# RDD : séparateurs entre les champs

> Milestone — mode RDD (comportements des modèles) ; dépend de 249, 250

- Un **séparateur** est une ligne de la liste : `{"divider":true,"label":"…"}` ; dessiné comme un trait horizontal
  sur la largeur de la table, avec son label éventuel **au milieu, 7 pt, gris** (`#999999`), le trait interrompu
  autour du texte.
- Ajout : champ sélectionné, la touche **« - »** insère un séparateur après lui (jamais avant la clé primaire) ; son
  label passe en édition (choix de l'utilisateur, le « + » n'a plus de menu depuis 256).
- Ajout aussi par un bouton **« Ajouter un séparateur »** sur toute la largeur, tout en bas de l'encart RDD du panneau
  (table ou ligne sélectionnée).
- Double-clic sur un séparateur : édition du label sur place, **sans fond**, le trait et la table suivant la saisie en
  direct ; un séparateur **peut rester vide** (un simple trait) — retours de l'utilisateur, qui remplacent « un label
  vide supprime le séparateur ».
- Sélection, suppression et glisser comme un champ (249, 251, 252).
- **Fini quand :** un séparateur ajouté entre deux champs (touche ou bouton) se dessine, prend un label gris centré
  tapé en direct, reste quand on vide son label ; ⌘Z à chaque étape ; `make check` vert.
- Fait : lignes de la zone des champs : `Divider`, `TableRow = Field | Divider`, `isDivider`, `isPrimaryKey`,
  `dividerWidth`, `rowWidth`, `TABLE.divider` (`rdd/tables.ts`) ; lecture / écriture de `{"divider":true,"label"}`.
  Opérations sur les lignes (`operations.ts`) : `addDivider` (via `addRow`, partagé avec `addField`), `setField` (un
  séparateur ne prend que le label, vide permis), suppression et déplacement communs. Rendu `addDividerRow`
  (`shapes/common/fieldRow.ts`) : trait `#cccccc` coupé autour du texte 7 px `#999999` centré ; textes des lignes
  marqués `userData.part`. Parties (`fieldParts.ts`) : texte centré, éditeur sans fond et gris pour un séparateur,
  `textPreview` (table avec le texte tapé, élargie). Cadre : `ModeParts.textPreview`, `ModePartText.transparent` /
  `center` / `color`, `ShapeParts.textPreview` / `textObjects`, aperçu dans `LabelEditor.previewLabel` (forme
  redessinée, texte de la partie masqué, rétablie à l'annulation) ; touches de mode avec la partie et la partie à
  sélectionner (`ModeKey`, `PageModes.modeKey`) ; réglage `button` et `anyPart` (`ModeProperty`, `ModeFields`,
  `.wide-button`), `write` qui peut renvoyer la partie à sélectionner (`PageModes.setModeProperty`). RDD : touche
  « - », bouton « Ajouter un séparateur », réglage « Séparateur » (texte) pour un séparateur sélectionné. Tests
  `rdd.test.ts` (touche, écriture et relecture, texte et éditeur, largeur, vide permis, bouton, aperçu sans écriture,
  sélection / suppression / glisser, panneau, rendu et marquage des textes). SPEC §14.5, `AJOUTER_UN_MODE.md`.
  Vérifié dans l'appli : `name` sélectionné + « - » (appui simulé, l'outil de test n'envoie pas « - ») → séparateur
  en édition ; « Audit » → trait coupé, texte gris centré ; bouton « Ajouter un séparateur »
  sur `Field1` → séparateur après lui, en édition ; saisie « Aud… » → trait coupé en direct, éditeur sans fond, texte
  gris. Séparateur vidé qui reste en place : vérifié par les tests seulement.
