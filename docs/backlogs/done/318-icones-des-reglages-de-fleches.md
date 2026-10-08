# Icônes pour les réglages des flèches

> Itération — panneau de contexte et paramètres. Dépend de 317 (groupe d'icônes, bouton « Défaut »).

- **Croisements** (`jumpStyle`) : flèche (`ContextPanel.tsx`, `EdgeLineSection`) et page (`spatial.jumps`, section
  Page) : « Défaut » + Aucun / Arc / Coupure / Marche / Ligne (`JUMP_STYLES`, `render/edges/jumps.ts`), chaque
  icône dessinant deux traits qui se croisent avec le saut correspondant. Désactivé sur une flèche courbe, comme
  aujourd'hui.
- **Ancrage des flèches** de la page (`spatial.anchoring`) : « Défaut » + Manuel (point d'attache fixe) /
  Automatique (flèches réparties sur un côté) / Typon (tracé à 45°).
- **Bouts de flèche** Début / Fin (`startArrow`, `endArrow`, liste `MARKERS`) : grille d'icônes sur deux lignes
  au lieu de la liste ; la case « pleine » (`startFill`, `endFill`) reste à côté, et l'icône suit son état (pointe
  pleine ou vide). Un bout non dessiné reste signalé.
- Dans les paramètres, mêmes icônes pour « Tracé des flèches » (celles d'`EDGE_LINES`), « Ancrage des flèches » et
  « Croisements des flèches » (sans « Défaut » : ce sont les valeurs par défaut elles-mêmes).
- **Fini quand :** sur une page de test, flèche et page se règlent par icônes ; « Défaut » enfoncé quand rien n'est
  écrit, l'effacement de la valeur rend l'héritage ; le fichier écrit est le même qu'avec les listes (re-sauvegarde
  dans draw.io, `make drawio-check`).
- Fait : icônes et noms partagés dans `src/app/edgeIcons.tsx` (tracés, sauts dessinés comme `jumpPieces`, ancrages,
  `MARKERS` déplacé avec une icône par bout, pointe vers la gauche au début, pleine ou vide selon la case). Flèche :
  « Croisements » en « Défaut » + 5 icônes, désactivé sur une courbe ; « Bouts » : nom et case « pleine » sur une
  ligne, grille 8 × 2 dessous ; un bout non dessiné : cadre en pointillé, infobulle et ligne « Bout non dessiné ».
  Page : ancrage et croisements en « Défaut » + icônes. Paramètres : tracé, ancrage, croisements en icônes.
  `ANCHORINGS` exporté par `src/engine/index.ts`. Clés écrites inchangées (mêmes patchs) ; vérifié à l'œil
  (bout classique, pleine décochée, saut Arc puis Défaut) ; `make drawio-check` et `make check`.
  Infobulles : « Arc : la flèche saute l'autre par un petit arc (jumpStyle=arc) », « Triangle, pleine
  (endArrow=block) », ancrages repris de l'aide des paramètres (`spatial.anchoring=…`).
