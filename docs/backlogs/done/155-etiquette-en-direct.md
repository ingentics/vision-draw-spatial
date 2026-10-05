# Étiquette de la tranche appliquée en direct

> Itération — panneau de la forme (paramètres d'instance) ; reprise de 154

- Le champ « Étiquette » d'un process étiqueté (et tout champ texte des paramètres d'une forme) s'applique à chaque
  frappe : le mot de la tranche change au fil de la saisie, sans attendre Entrée ou la sortie du champ.
- Une seule étape d'annulation par passage dans le champ (frappes fusionnées, comme le décalage du texte, 142) ;
  Échap rend la valeur d'avant le passage.
- Le champ garde le focus pendant la saisie ; seule la forme est redessinée (pas de clignotement du reste de la page).
- **Fini quand :** taper « API » dans le champ change le mot à chaque lettre, un seul Ctrl+Z ramène « PROCESS » ;
  `make check` vert.
- Fait : `TextField` (`app/Fields.tsx`) : `onLive` à chaque frappe, Échap renvoie la valeur d'avant le passage, le
  champ suit `value` hors saisie. Les champs texte des paramètres d'une forme (`app/ShapeProperties.tsx`) restent
  montés pendant la saisie (clé sans la valeur) et passent une clé de fusion par passage dans le champ ;
  `onSpatial` la transmet (`ContextPanel`, `Viewer`). `Engine.setSpatial(…, merge)` : frappes d'un passage fusionnées
  en une étape d'annulation (comme `setElementsStyle`) ; pour un attribut qui ne touche que le dessin de la forme
  (`LIVE_SHAPE_KEYS` : `spatial.tag`), seule la forme est redessinée (`rebuildShapeObject`), les autres rendus de la
  page (autres niveaux, graphe) sont invalidés. Vérifié dans l'appli : « GATEW » tapé, le mot de la tranche suit à
  chaque frappe, focus gardé, un seul Ctrl+Z ramène « API ».
