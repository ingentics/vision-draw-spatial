# RDD : cadre du nom d'une région après un style du panneau

> Dette — édition des styles (SPEC §11.1), vue au sujet 345 (mode RDD, régions)

- Constat : appliquer un style de la section Style à une région n'écrit que `fillColor`, `strokeColor` (et
  `fontColor`) : `labelBorderColor` garde l'ancienne bordure, le cadre du nom dans draw.io n'a plus la couleur de la
  bordure.
- Règle générale (`stylePresetChanges`, toutes formes) : un **cadre du nom qui avait la couleur de la bordure la
  garde** — si `labelBorderColor` vaut le `strokeColor` de la forme (casse ignorée), appliquer un style écrit aussi
  `labelBorderColor` = bordure du style. Un cadre d'une autre couleur, ou absent, n'est pas touché.
- **Fini quand :** test : style appliqué à une forme dont le cadre suit la bordure → cadre à la nouvelle bordure ;
  cadre d'une autre couleur ou absent → inchangé. Dans l'appli, sur une région RDD, un style du panneau change le
  cadre du nom dans le fichier ; `make drawio-check` vert.
- Fait : `stylePresetChanges` (`src/engine/core/edit/stylePresets.ts`) écrit `labelBorderColor` = bordure du style
  quand le cadre du nom avait la couleur de la bordure (noir implicite compris). Tests `stylePresets.test.ts` (cadre
  qui suit, cadre d'une autre couleur ou absent intact). Vérifié par les tests seulement : pas d'essai dans l'appli
  (l'enregistrement automatique aurait modifié une fixture), pas de `make drawio-check` (aucune fixture touchée,
  seule une clé draw.io standard écrite).
