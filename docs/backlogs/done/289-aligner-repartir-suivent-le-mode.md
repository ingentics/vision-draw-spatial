# Aligner et Répartir suivent le mode de la page

> Itération — édition (arrangement de la sélection) ; reprise de 182, 183, 241. Plus simple après 288.

- Constat (lecture du code, à confirmer à l'œil d'abord) : `ArrangeCommands.arrangeSelection`
  (`core/edit/commands/arrange.ts`) déplace les formes sans consulter le mode de la page. Conséquences :
  - une région RDD alignée part sans ses tables (`carries`) ;
  - elle peut passer sur une région sœur (`obstacles`) ;
  - une table sortie de sa région n'agrandit pas cette dernière (`placed`).
- Correction : Aligner et Répartir déplacent aussi les formes emportées. Le décalage des formes qui ont des obstacles
  est borné comme au clavier (`clampMove`, un axe puis l'autre). Le mode remet en ordre (`placed`, avec la page
  d'avant) dans la même étape d'annulation.
- Une forme dont le décalage est réduit à zéro par un obstacle ne bouge pas : les autres s'alignent quand même.
- **Fini quand :**
  - sur une page RDD, aligner à gauche une région et une table emporte le contenu de la région ;
  - deux régions sœurs alignées s'arrêtent à l'écart réglé ;
  - une table alignée hors de sa région l'agrandit ;
  - une seule annulation défait le tout ;
  - test sur chacun des trois cas ; `make check` vert.
- Fait :
  - Constat confirmé à la lecture : `arrangeSelection` déplaçait les formes avec `moveCell` sans consulter le mode.
  - Nouvelle règle pure `arrangedMoves(items, deltasOf, rules)` (`core/edit/align.ts`) :
    - seules les formes indépendantes comptent (une forme contenue, enfant draw.io ou emportée par le mode, suit sa
      forme englobante), une seule fois chacune ;
    - le décalage d'une forme qui a des obstacles est borné par `clampMove` (un axe puis l'autre, comme au clavier),
      sans compter ce qui bouge aussi ;
    - une forme bornée à zéro ne bouge pas, les autres si ;
    - chaque déplacement porte ses formes emportées.
  - `ArrangeCommands` (`core/domains/edit/commands/arrange.ts`) ne fait plus qu'écrire. Il fournit les règles depuis
    l'hôte des modes (`carried`, `obstacles`) et la page, déplace chaque forme avec ce qu'elle emporte, puis appelle
    `placed` (`shapesPlaced`, avec les bornes d'avant), le tout dans une seule étape d'annulation.
  - Écart : sur une page d'un mode qui emporte des formes, une table sélectionnée avec sa région ne s'aligne plus pour
    son compte, elle suit la région (comme un enfant de groupe). Sans mode, rien ne change.
  - Tests (`tests/engine/core/edit/align.test.ts`) :
    - région alignée avec son contenu ;
    - table de la région sélectionnée avec elle ;
    - région arrêtée à l'écart de sa sœur, ou bornée à zéro pendant que l'autre forme s'aligne ;
    - ce qui bouge ne borne pas ;
    - forme bloquée.
  - Validation :
    - `make check` vert (106 fichiers, 2037 tests) ;
    - dans l'appli, sur `rdd.drawio` : « Role » puis « User » sélectionnées, « Placer à droite de la référence »
      (Premier sélectionné) met « User » à droite de « Role », et la région « Comptes » s'agrandit pour la garder ;
      une seule étape « Aligner », qu'une annulation défait entièrement ;
    - le cas des régions sœurs n'est vérifié que par les tests (pas de fixture avec deux régions sœurs).
