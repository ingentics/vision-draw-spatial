# Embedded au bas ondulé

> Itération — mode RDD (tables) ; reprise de 181

- Le bas de l'embedded (`rdd-embedded`) est une **vague** au lieu d'un trait droit : une période sur toute la largeur,
  qui descend d'abord puis remonte (comme la forme « document » de draw.io), amplitude 2 px × l'échelle, dans les
  bornes de la forme. La bordure n'est plus en tirets : trait plein (le `dashed=1` de 181 disparaît). La table a
  4 px (× l'échelle) de plus en bas pour que la vague ne
  morde pas sur le dernier champ. Rendu de l'appli seulement : draw.io montre un swimlane au bas droit.
- **Fini quand :** un embedded posé ou lu, en trait plein, montre son bas ondulé sous ses champs, sans chevauchement, en table
  principale comme secondaire ; `make check` vert.
- Fait : `TableKind.wavy` (posé sur `rdd-embedded`, qui perd `dashed=1`) ; contour au bas ondulé (24 points, une
  période, `TABLE.wave` = 2 px × l'échelle, entre le bas des bornes et 4 px au-dessus) ; `tableHeight(kind, …)` ajoute
  deux amplitudes pour une table ondulée (palette, champs, table secondaire). Icône de palette au bas ondulé. Fixture
  `rdd.drawio` (Address : trait plein, 70 px ; réenregistrée par draw.io). Tests `rdd.test.ts` ; SPEC §14.5. Vérifié
  dans l'appli : Address en trait plein, vague discrète sous ses champs.
