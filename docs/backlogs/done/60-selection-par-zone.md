# Sélection par zone (rectangle tiré au curseur)

> Itération — interaction (sélection) ; complète la sélection multiple (SPEC §11.1)

- **Geste** : clic gauche maintenu sur le vide (là où `beginMove` ne prend rien) puis glisser, au-delà du seuil de
  clic (`CLICK_SLOP`), trace un rectangle de sélection ; relâcher sélectionne. Espace + glisser et les autres
  boutons gardent le pan / l'orbite actuels.
- **Rendu** : rectangle en coordonnées écran, contour bleu fin et fond bleu translucide (comme le rubberband de
  draw.io), dessiné par-dessus la scène pendant le glisser.
- **Ce qui est sélectionné** : les formes, textes et flèches dont l'emprise **projetée à l'écran** est entièrement
  dans le rectangle (en 2D comme en iso et en volume). Un conteneur pris en entier est sélectionné seul, sans ses
  enfants (`independentRoots`) ; les enfants d'un conteneur non pris se sélectionnent individuellement.
  Alt maintenu au relâcher : il suffit que l'emprise touche le rectangle (comme draw.io).
- **Avec la touche de sélection multiple** (`controls.multiSelectKey`) : les éléments pris s'ajoutent à la
  sélection existante au lieu de la remplacer. Sans elle, la sélection est remplacée ; un rectangle vide la vide.
- Seulement sur une page modifiable ; ailleurs, le glisser à vide garde son comportement actuel.
- **Fini quand :** dans l'appli, en 2D puis en iso, tirer un rectangle autour de trois formes et de la flèche qui les
  relie les sélectionne (contour de sélection sur chacune) et les déplace ensemble ensuite ; avec Alt, toucher une
  forme suffit ; avec la touche multiple, la sélection s'agrandit ; un petit glisser sous le seuil reste un clic qui
  désélectionne ; tests du calcul de la zone (inclus / touché / conteneur) ; `make check` vert.
- Fait : `src/engine/interaction/marquee.ts` (`rectBetween`, `marqueeTakes` : inclus = tous les points de
  l'emprise dans le rectangle ; contact = un point dedans, un côté qui le traverse, ou rectangle dans la forme ;
  emprise d'une forme = enveloppe convexe de sa base et de son dessus). `controls.ts` : mode de glisser `marquee`
  quand l'appui gauche ne prend rien à déplacer et que l'hôte l'accepte (`canMarquee`), rectangle dessiné en
  `<div>` fixe par-dessus le canvas au-delà de `CLICK_SLOP`, `selectInRect` au relâchement (touche multiple =
  ajout, Alt = contact). `Engine` : `canMarquee` (page modifiable, rien sous le pointeur), `selectInRect` (formes
  et flèches visibles des calques visibles, groupes sans lien ignorés comme au clic, enfants d'un élément pris
  écartés). Tests : `tests/engine/interaction/marquee.test.ts`. Vérifié dans l'appli : en 2D, rectangle autour
  de deux formes reliées → 2 formes + la flèche ; autour d'une seule → elle seule ; Alt → la flèche touchée en
  plus ; touche multiple → ajout à la sélection ; en iso, mêmes sélections sur les volumes, puis déplacement
  groupé ; un glisser sous le seuil reste un clic qui désélectionne ; le rectangle bleu s'affiche pendant le
  glisser et disparaît au relâchement.
