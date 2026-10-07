# RDD : tables ajustées à leur contenu à l'ouverture

> Itération — mode RDD (tables) ; reprise de 247

- À l'ouverture d'un document modifiable, chaque table d'une page RDD dont la taille diffère de celle calculée
  (247, 248) est ajustée, depuis son coin haut-gauche ; plus de type qui déborde d'une table d'un ancien fichier.
- L'ajustement est une étape d'annulation (« Ajustement du mode ») : le fichier passe en modifié, ⌘Z le défait. Rien
  n'est écrit si tout est déjà à la bonne taille, ni dans un document en lecture seule.
- L'ajustement n'est fait que sur la mesure exacte du texte : à l'ouverture si les polices sont chargées, sinon dès
  qu'elles le sont (une mesure approchée décalerait les tailles d'un fichier déjà ajusté).
- Cadre : accroche de mode `opened(edit)`, appelée par page du mode.
- **Fini quand :** la fixture `rdd.drawio` (tables de 160 px) s'ouvre avec des tables à la largeur de leur contenu,
  le fichier marqué modifié, ⌘Z rend les 160 px ; rouvert après enregistrement, rien ne change ; `make check` vert.
- Fait : accroche de mode `opened(edit)` (`modes/types.ts`) ; `PageModes.documentOpened()` l'applique à chaque page
  modifiable d'un mode qui l'a, en une étape d'annulation « Ajustement du mode » (rien si rien ne change), appelée à la
  fin de `DocumentFile.load` et quand la mesure exacte du texte arrive (`EngineCore`) ; sans mesure exacte
  (`hasExactTextMeasure`, `render/textMeasure.ts`), rien n'est fait : une passe sur la mesure approchée décalait les
  tailles d'un fichier déjà ajusté à chaque ouverture. RDD : `opened` appelle `fitTable` sur chaque table. Test
  `rdd.test.ts` (tables ajustées, région inchangée, seconde passe sans effet). SPEC §14.5, `AJOUTER_UN_MODE.md`.
  Vérifié dans l'appli : la fixture s'ouvre avec ses tables à la largeur de leur contenu (types dedans), Annuler
  « Ajustement du mode » rend les 160 px ; rechargée après enregistrement, rien ne change (Annuler désactivé) ;
  fichier à 160 px rouvert au démarrage (polices pas encore chargées) : un seul ajustement, à leur arrivée.
