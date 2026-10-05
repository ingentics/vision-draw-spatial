# Éditeur tourné du texte qui suit la flèche

> Itération — texte des flèches (édition en place) ; reprise de 138

- En édition, le texte du milieu qui suit sa flèche (`spatial.labelFollow=1`) a un éditeur horizontal : sa poignée ◇
  tombe au milieu du texte dessiné le long du trait, et non dessous.
- L'éditeur tourne comme le trait dessiné au point du texte (angle à l'écran, jamais à l'envers) ; la poignée ◇
  (et la bascule) sont sous la boîte, dans son sens, au même écart (4 px) qu'un texte horizontal.
- **Fini quand :** sur une flèche en diagonale, case cochée, le double-clic sur le texte ouvre un éditeur aligné sur
  le trait avec la poignée sous lui ; la tirer déplace le texte et la poignée reste dessous ; `make check` vert.
- Fait : `LabelEditRequest.angle` (`engine/Engine.ts`, `withAngle`) : tangente du trait dessiné au point du texte
  (`pathPointAt`, `render/textPath.ts`) projetée à l'écran, ramenée dans ]−90°, 90°], recalculée avec l'emprise
  (glisser, caméra). `app/LabelEditor.tsx` : la boîte tourne autour de son point (`rotate` avant `scale`) ; les
  outils sont placés sous elle depuis le centre de son emprise, dans son sens (`rotate` + `translateX(-50%)`).
  Vérifié dans l'appli sur `simple.drawio` (flèche « appelle » passée en droite, case cochée) : éditeur et poignée
  tournés, poignée sous le texte, glisser suivi ; style de la flèche remis comme avant ensuite.
