# Décalage le long du trait du texte qui suit la flèche

> Itération — texte des flèches (section « Position des textes ») ; reprise de 138

- Case « suit la flèche » cochée : un champ « Décalage le long du trait » en pixels de page, négatif possible, pour
  l'ajustement fin : positif = vers la fin de la flèche, négatif = vers le début ; vide ou 0 = aucun.
- Écrit dans le style de la flèche sous `spatial.labelFollowShift` (draw.io l'ignore, son placement horizontal
  reste intact) ; sans effet quand la case est décochée.
- L'éditeur en place et sa poignée ◇ suivent le texte décalé ; tirer la poignée garde le décalage.
- **Fini quand :** sur une flèche, case cochée, `20` fait glisser le texte de 20 px vers la pointe, `-20` vers le
  début, l'éditeur s'ouvre sur le texte décalé ; `make check` vert.
- Fait : clé `spatial.labelFollowShift` (`engine/spatial.ts`) ; `middleTextAlong` (`render/edges/edge.ts`) donne
  le placement du texte qui suit, glissement compris (`TextAlong.shift`, appliqué par `layoutOnPath`) ;
  `alongAnchor` (`render/textPath.ts`) donne son point d'ancrage, utilisé par l'éditeur (`labelEditScreen`,
  `withAngle`) ; le glisser de la poignée retire le glissement de la position visée (`dragLabel`). Champ
  « Décalage le long du trait (px) » (`app/ContextPanel.tsx`, `NumberField` signé dans `app/Fields.tsx`). SPEC
  §14.1 et §14.3, tests dans `labelFollow.test.ts`. Vérifié dans l'appli sur `simple.drawio` : 60 = le texte passe
  le coude vers la pointe, −40 = vers le début, éditeur ouvert sur le texte décalé, poignée tirée de 40 px = texte
  déplacé de 40 px ; annulé ensuite.
