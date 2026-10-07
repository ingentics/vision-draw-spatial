# RDD : le « + » crée tout de suite un champ sans type ; type choisi au panneau

> Itération — mode RDD (champs) ; reprise de 250 et 249

- Un clic sur le « + » ajoute aussitôt un champ (plus de menu) : propriété non nullable `FieldN`, **sans type**
  (`type` vide), après le champ sélectionné sinon en fin de liste ; sélectionné, label en édition. Une étape
  d'annulation.
- Un champ sans type n'affiche rien en gris à droite du label et n'est pas signalé dans Diagnostics (seul un type non
  vide et inconnu l'est).
- « Type » du panneau du champ devient un choix : « Aucun » puis les sept types ; modifiable à tout moment (la clé
  primaire comprise). Une étape d'annulation, la largeur suit.
- Cadre : une poignée de mode n'a plus de menu ; son clic est une opération du mode. Le menu (`HandleMenu`,
  événement `modeHandleMenu`) disparaît.
- **Fini quand :** un clic sur « + » ajoute `Field1` sans type, en édition, sans menu ; le panneau lui donne
  « Money » (en gris à droite du label) puis « Aucun » ; `make check` vert.
- Fait : `PageModeDefinition.handleClicked(edit, shape, handle, part?)` remplace `handleChosen` ; `ModeHandle` perd
  ses choix ; `ModeHandles.click` lance l'opération du mode (une étape d'annulation, au titre de la poignée), puis
  sélectionne la partie renvoyée et édite son texte. Retirés : `HandleMenu.tsx` et son style, l'événement
  `modeHandleMenu`, `Engine.chooseModeHandle`. RDD : `fieldHandleClicked` ajoute un champ de type vide ;
  `fieldProblems` ne signale plus un type vide ; `setField` accepte `type` ; « Type » du panneau devient un choix
  (« Aucun » + les sept types). Corrigé en passant : la ligne `selectionStyle` du bloc de code d'`AJOUTER_UN_MODE.md`,
  abîmée au 250. Tests `rdd.test.ts` (clic → Field1…3 sans type, rien de signalé, type choisi puis « Aucun » avec la
  largeur qui suit, choix proposés ; valeurs du panneau en identifiants). SPEC §14.5, `AJOUTER_UN_MODE.md`. Vérifié
  dans l'appli : clic sur le « + » d'Orphan → `Field2` aussitôt, sans menu, en édition ; Entrée ; panneau « Type » →
  « Money », affiché en gris à droite du label.
