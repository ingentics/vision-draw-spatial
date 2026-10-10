# Event storming : un post-it collé au-dessus d'un autre passe derrière lui

> Itération — mode Event storming, pose des post-it (s'appuie sur 475, 477, 481). Moteur : écriture d'ordre de dessin
> pour les modes.

- Un post-it posé (glissé, redimensionné, déplacé au clavier, ajouté depuis la palette, collé) dont le bas touche le
  haut d'un autre post-it passe **juste derrière** lui dans l'ordre de dessin : son ombre, qui déborde en bas, passe
  sous le post-it du dessous au lieu de le recouvrir. De même, un post-it dont le bas touche le haut du post-it posé
  passe juste derrière lui. Un post-it déjà derrière ne bouge pas dans l'ordre. Même étape d'annulation que la pose.
- Contact au sens de `contacts(page)` (bords à moins de 0,5, recouvrement sur l'autre axe).
- Tronc : `ModeEdit.placeBehind(shapeId, referenceId)` (juste derrière, parmi les formes de même parent ; rien si
  elle y est déjà, ou si l'une est verrouillée).
- **Fini quand :** sur `eventstorming-commande.drawio`, un post-it posé dans la case au-dessus d'un autre est dessiné
  derrière lui (pas d'ombre sur le post-it du dessous) ; ⌘Z remet l'ordre ; tests de `placeBehind` et de la règle du
  mode ; `make check` vert.
- Fait : `placeBehind(page, cellId, referenceId)` (`core/format/order.ts`) et `ModeEdit.placeBehind` (jugé à
  l'écriture, rien pour un élément verrouillé, `modeEditWriter.ts`). Mode : `places/stacking.ts` (`stackPlaced`,
  d'après `contacts(page)` : pour chaque contact haut / bas touchant un post-it posé, celui du dessus juste derrière
  celui du dessous), appelé par `gestures.placed` avec la recopie de « Labels ». L'échange de place (481) appelle
  maintenant aussi `gestures.placed` sur les deux post-it. Tests `tests/engine/core/format/order.test.ts`,
  `tests/engine/core/modes/modeEditWriter.test.ts` (verrou), `tests/engine/plugins/modes/eventstorming/stacking.test.ts` ;
  doc `AJOUTER_UN_MODE.md`, SPEC §14.5. Vérifié à l'œil sur `eventstorming-commande.drawio` : Domain Event déposé
  depuis la palette dans la case au-dessus du Hotspot, dessiné derrière lui (jointure nette, pas d'ombre sur le
  Hotspot) ; ⌘Z retire l'ajout.
