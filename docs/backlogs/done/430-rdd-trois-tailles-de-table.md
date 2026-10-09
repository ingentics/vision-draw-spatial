# RDD : trois tailles de table (L, M, S)

> Itération — mode RDD, tables ; reprise de 179 (table secondaire)

- L'option booléenne « Table secondaire » (`spatial.rdd.secondary=1`) devient un réglage à trois niveaux
  `spatial.rdd.size` : `L` (absent, échelle 1), `M` (× 0,8, l'ancienne table secondaire), `S` (× 0,64, encore 20 %
  plus petite).
- Panneau : « Taille » en boutons liés `L` `M` `S`, dans la section du mode, pour toutes les tables qui avaient
  l'option.
- Touches sur une table sélectionnée (sans ligne) : « + » un cran plus grande (vers L), « - » un cran plus petite
  (vers S) ; rien au bout. Sur une ligne, « - » ajoute toujours un séparateur (sujet 253). Seulement dans le mode RDD.
- Pas de migration : un ancien `spatial.rdd.secondary=1` est ignoré (la table revient en L).
- Sans toucher au moteur : chaque bouton a pour icône sa lettre tracée (un choix n'est en boutons qu'avec des icônes).
- **Fini quand :** dans l'appli, une table passe de L à M puis S : elle rétrécit de 20 % à chaque cran (entête, nom,
  champs, flèches arrivant sur ses champs), et revient en L à sa taille d'origine ; idem avec « - » / « + », table sélectionnée.
- Fait : `tables/tableLayout.ts` (`SIZE`, `TableLevel`, `LEVEL_SCALES`, `tableLevel`, `levelScale`, `steppedLevel` ; le
  booléen `secondary` devient `level` partout : `operations.ts` `setTableLevel`, `relations/arrivals.ts`,
  `relationFields.ts`, `shapes/common/table.ts`), option `secondary` retirée de `tableKinds.ts`. Panneau
  (`editing/tableProperties.ts`) : choix « Taille » en boutons, chaque lettre tracée en icône (moteur inchangé) ;
  touches « + » / « - » (`tableLevelKey`, `index.ts`), « - » sur une ligne garde le séparateur. Fixtures `rdd.drawio`
  passées à `spatial.rdd.size=M`, SPEC mise à jour. Changement de comportement : « - » sur la table seule, qui ne
  faisait rien, la réduit ; un ancien `spatial.rdd.secondary=1` est ignoré. Vérifié dans l'appli (boutons, L → M → S
  au clavier et au panneau) ; documents et flèches d'arrivée par les tests seulement.
