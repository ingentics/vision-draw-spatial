# RDD : couches logique et physique au panneau d'une table

> Itération — mode RDD, panneau d'une table et d'un champ (reprise de 260 et 272)

- Entité, vue et énumération sélectionnées : section « Couche physique » avec « Nom de la table » (texte libre),
  écrit dans `spatial.rdd.dbName` (rien d'écrit s'il est vide). Pas sur le modèle abstrait, l'embedded ni le document.
  Pour une vue, il précède « Matérialisé », dans la même section.
- La section « PostgreSQL » devient « Couche physique » partout (table et champ) ; les infobulles ne parlent plus de
  PostgreSQL. Les clés écrites (`pgName`, `pgType`, `materialized`) ne changent pas.
- Toute table (entité, énumération, vue, embedded, document, modèle abstrait) sélectionnée : une seule section
  principale « Couche logique », en tête, qui reprend le texte et le commentaire (plus de section « Texte ») puis les
  réglages du mode sans section (« Table secondaire », « Clé primaire »…) ; plus de section « RDB Designer ». Un champ
  sélectionné : sa section principale s'appelle aussi « Couche logique ». Les autres formes de la page RDD (région,
  texte, post-it) gardent « Texte ». Mécanisme générique : `gestures.mainSection` d'un mode (titre et formes).
- **Fini quand :** sur une page RDD, une entité, une vue ou une énumération sélectionnée montre « Couche logique »
  (texte, commentaire, réglages) puis « Couche physique », et son nom s'enregistre ; un champ
  sélectionné montre « Couche logique », « Couche physique » et « Gouvernance ».
- Fait : nom en base dans `tableProperties.ts` (règle `physicalName` des formes de table, `tableKinds.ts`), section
  `PHYSICAL_LAYER` partagée (`fieldModel.ts`) ; section principale générique `gestures.mainSection` (types et vue du
  registre des modes, `ModeInfo.mainSection`), lue par le panneau (`ModeSections.tsx`, `ShapeSections.tsx`), déclarée
  par le mode RDD pour toutes les tables, modèle abstrait compris. SPEC et `AJOUTER_UN_MODE.md` à jour. Tests :
  options et sections des tables et des champs, vue du registre. Vérifié à l'œil par l'utilisateur.
