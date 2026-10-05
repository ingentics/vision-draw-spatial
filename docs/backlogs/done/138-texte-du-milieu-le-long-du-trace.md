# Texte du milieu le long du tracé

> Itération — texte des flèches (section « Position des textes ») ; reprise de 133

- La case « Texte du milieu : suit la flèche » (`spatial.labelFollow=1`) ne tourne plus le texte d'un bloc : chaque
  lettre est posée sur le tracé dessiné de la flèche (coudes arrondis et courbes compris) et tournée selon la
  tangente à cet endroit ; le texte épouse les coudes.
- Centré sur son point d'ancrage le long du tracé (aligné à gauche : part du point ; à droite : finit au point),
  écart de côté (`distance`) gardé parallèlement au tracé, décalage libre (`offset`) ajouté.
- Lisible : si le texte irait de droite à gauche (ou de bas en haut), il est posé dans l'autre sens du tracé.
- Plusieurs lignes : empilées parallèlement au tracé. Gras, italique, taille, couleur, halo gardés ; fond, souligné
  et barré non dessinés sur un texte qui suit le tracé.
- **Fini quand :** sur une flèche à angles droits ou arrondie, la case cochée fait courir le texte le long du tracé
  à travers le coude ; décochée, il redevient horizontal ; un déplacement de forme ou un glisser du texte le garde
  sur le tracé ; `make check` vert.
- Fait : `render/textPath.ts` (`layoutOnPath`, pur) pose chaque lettre du texte mis en page (`layoutRichText`) sur
  le trait dessiné (`userData.path` : coudes arrondis, courbes), tournée selon la tangente, avec l'écart de côté et
  le décalage du placement ; tracé parcouru à l'envers si le texte se lirait de droite à gauche ou de bas en haut ;
  prolongé en ligne droite au-delà des bouts. `TextSpec.along` (`render/types.ts`) : la fabrique troika crée alors
  un texte SDF par lettre (`render/troikaText.ts`) ; `render/edges/edge.ts` le demande pour le texte du milieu
  quand `spatial.labelFollow=1`. La rotation d'un bloc de 133 (`labelAngle`) est retirée. SPEC §14.1 et §14.3,
  tests `tests/engine/render/edges/labelFollow.test.ts`. Vérifié dans l'appli sur `simple.drawio` : case cochée,
  texte tiré au coude de la flèche « appelle » = « app » sur le segment horizontal, « elle » tourné le long du
  segment vertical ; annulé ensuite.
