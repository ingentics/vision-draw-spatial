# Libellé des groupes de post-it, sans forme Titre

> Milestone — mode Event storming (475) ; s'appuie sur les contacts (`contacts/contacts.ts`)

On nomme les groupes de post-it collés : dès que deux post-it se touchent, un titre apparaît au-dessus du groupe.

- **Groupe** : ensemble de post-it reliés de proche en proche par des contacts (bord à bord, sens horizontal ou
  vertical, tolérance `CONTACT_TOLERANCE`). Un post-it seul n'est pas un groupe. Les chevauchements ne relient pas.
- **Titre** : affiché dès qu'un groupe compte au moins 2 post-it ; texte par défaut « Group label ».
  - Texte gras de 22, gris (#757575), sur une ligne.
  - Placé au-dessus du post-it le plus haut du groupe, aligné sur le bord gauche du groupe (x minimal), avec une
    marge de 12 avant les post-it.
  - Calculé, pas une forme : ni sélection, ni glisser. Il suit le groupe : un post-it ajouté (y compris au début ou
    au-dessus) le recale, un post-it retiré aussi ; il disparaît quand il ne reste qu'un post-it.
- **Libellé enregistré sur chaque post-it du groupe** (`spatial.es.group`) ; absent = « Group label ».
  - Un post-it qui rejoint un groupe prend son libellé.
  - Fusion de deux groupes nommés : le groupe sur lequel on pose garde son libellé, le post-it (ou le groupe)
    apporté le prend. Si le groupe d'arrivée n'a pas de libellé, il prend celui apporté.
  - Groupe coupé en deux : les deux parties gardent le libellé.
  - Un post-it isolé garde son attribut (sans titre affiché).
- **Édition** : double-clic sur le titre (édition en place, une ligne, Entrée valide) et champ « Groupe » dans le
  panneau d'un post-it sélectionné. Chaque modification est une étape d'annulation ; elle écrit le libellé sur tous
  les post-it du groupe.
- **Forme Titre** retirée de la palette du mode ; les titres déjà présents dans les fichiers restent affichés.
- **Export draw.io** : rien de visible, l'attribut reste sur les post-it ; le fichier s'ouvre dans draw.io.
- **Tronc** : dessiner et éditer un texte hors de l'emprise d'une forme n'existe pas encore dans le contrat des modes
  (`ModeParts` est propre à une forme) ; si un bloc du tronc manque, il fait l'objet d'un ticket moteur à part.
- Fixture : `tests/fixtures/eventstorming.drawio` complétée de deux groupes nommés et d'un post-it isolé.
- **Fini quand :** deux post-it collés font apparaître « Group label » au-dessus, aligné à gauche ; un post-it collé
  devant ou au-dessus recale le titre ; en retirer un jusqu'au dernier le fait disparaître ; le libellé se change au
  double-clic et dans le panneau, et survit à l'ajout ou au retrait d'un post-it ; une fusion garde le libellé du
  groupe d'arrivée ; ⌘Z défait chaque étape ; la palette ne propose plus Titre ; tests du regroupement, de la
  fusion, de la coupure et du placement du titre ; `make check` vert.
- Fait : groupes calculés depuis les contacts (`groups/stickyGroups.ts`, premier post-it : le plus haut puis le plus
  à gauche) ; libellé écrit sur tout le groupe, repris à la pose, partie `group` du premier post-it, habillage et
  champ « Groupe » (`groups/groupLabels.ts`) ; titre dessiné par le premier post-it (`stickyShape.ts`, gras 22,
  #757575, marge 12) ; forme Titre retirée de la palette. Tronc : `ModeParts.outsideTextAt` (double-clic hors de toute
  forme, `pointerInput.ts`, `shapeParts.ts`), documenté dans `AJOUTER_UN_MODE.md`. Précision : un groupe d'arrivée
  sans libellé prend celui apporté. Fixture `eventstorming.drawio` : groupes « Commande » et « Relance ». Vérifié
  dans l'appli : titres, double-clic, post-it collé devant (titre décalé, libellé repris), suppression, titre retiré
  à un seul post-it, ⌘Z ; fusion, coupure et post-it verrouillé par les tests (`groups/*.test.ts`,
  `pointerInput.test.ts`).
