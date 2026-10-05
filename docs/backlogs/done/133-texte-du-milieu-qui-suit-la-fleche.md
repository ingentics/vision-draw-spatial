# Texte du milieu qui suit la flèche

> Itération — texte des flèches (panneau de la flèche, section « Position des textes ») ; reprise de 47

- Case à cocher « Suit la flèche » pour le texte du milieu : cochée, le texte est tourné dans le sens du segment
  sur lequel il est posé (lisible : jamais à l'envers, retourné de 180° au besoin) et le reste quand la flèche
  bouge ou que son tracé change.
- On peut toujours le tirer (poignée ◇) : il glisse le long du tracé et garde son écart, en suivant l'orientation
  du segment où il arrive.
- Écrit dans le style de la flèche sous une clé `spatial.…` (draw.io l'ignore et garde le texte horizontal).
- Sur un coude, l'orientation est celle du segment où se trouve le point d'ancrage du texte (elle change quand
  on le tire d'un segment à l'autre).
- La case ne vaut que pour le texte du milieu (label de la flèche) ; les textes de début et de fin gardent leur
  disposition.
- **Fini quand :** sur une flèche en diagonale, la case cochée aligne le texte du milieu sur le trait, décochée le
  remet horizontal ; un déplacement de forme ou un glisser du texte garde l'alignement ; `make check` vert.
- Fait : clé `spatial.labelFollow` (`engine/spatial.ts`) ; `labelAngle` (`render/edges/polyline.ts`) donne l'angle
  du segment où tombe la position du texte, ramené dans ]−90°, 90°] ; `render/edges/edge.ts` dessine le texte du
  milieu à l'origine d'un groupe posé au point d'ancrage et tourné de cet angle (sélection au clic, masquage en
  édition et redressement face à la caméra inchangés). Case « Texte du milieu : suit la flèche » dans « Position des
  textes » (`app/ContextPanel.tsx`), une étape d'annulation. SPEC §14.1 et §14.3 mis à jour. Tests :
  `tests/engine/render/edges/labelFollow.test.ts`. Vérifié dans l'appli sur `simple.drawio` : flèche passée en
  droite, case cochée = texte aligné sur la diagonale, déplacement de la forme source = le texte suit le nouvel
  angle, case décochée = horizontal.
