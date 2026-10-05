# Décalage du texte qui suit appliqué en direct

> Itération — texte des flèches (section « Position des textes ») ; reprise de 141

- Le champ « Décalage le long du trait (px) » s'applique à chaque frappe (et aux flèches du champ), sans attendre
  Entrée ou la sortie du champ ; une saisie incomplète (`-`, vide) n'est appliquée qu'en quittant le champ.
- Une seule étape d'annulation par passage dans le champ (les valeurs tapées à la suite sont fusionnées).
- Le champ garde le focus pendant la saisie et se remet à jour après une annulation.
- **Fini quand :** taper `-40` fait glisser le texte au fil des frappes, un seul Ctrl+Z le ramène à sa place
  d'avant ; `make check` vert.
- Fait : `NumberField` (`app/Fields.tsx`) : `onLive` appelé à chaque saisie d'une valeur complète, et le champ suit
  `value` hors saisie. `setElementsStyle(…, merge)` (`engine/Engine.ts`) : même clé de fusion et rien d'enregistré
  entre-temps = même étape d'annulation (compteur `editCount`, remis en jeu par annuler / rétablir) ; pour une clé
  qui ne touche que le texte d'une flèche (`LIVE_EDGE_TEXT_KEYS` : `spatial.labelFollowShift`), seule la flèche est
  redessinée (`retraceEdges`, comme un glisser) : sans cela, toute la page était reconstruite et tous ses textes
  clignotaient à chaque frappe. Le champ (`app/ContextPanel.tsx`) fusionne les frappes d'un passage dans le champ
  (clé par passage) ; `onEdgeStyle` transmet la clé (`app/Viewer.tsx`). Vérifié dans l'appli sur `simple.drawio` :
  `-80` tapé au fil des frappes, texte glissé à chaque frappe sans clignotement du reste de la page, focus gardé,
  un seul Ctrl+Z ramène −40 ; style de la flèche remis comme avant ensuite.
