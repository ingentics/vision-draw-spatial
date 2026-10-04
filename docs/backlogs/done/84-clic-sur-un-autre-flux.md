# Clic sur une flèche d'un autre flux : changer de flux sans sélectionner

> Itération — mode Séquences (interaction) ; reprise de 79

- Clic sur une flèche d'un autre flux que le flux courant : elle ne fait que devenir le flux courant (barre,
  estompage), sans être sélectionnée ; la sélection précédente est retirée.
- Clic sur une flèche du flux courant (ou hors flux, ou sur une forme) : sélection comme d'habitude. Un second clic
  sur la flèche de l'autre flux la sélectionne donc.
- Les autres sélections (diagnostics, collage, flèche créée, sélection multiple, rectangle) ne changent pas.
- Cadre générique : un clic sur un élément qui changerait le courant du mode (`ModeCurrent.pick`) ne fait que le
  changer.
- **Fini quand :** sur `sequences.drawio`, flux « Paiement » courant, un clic sur « login » passe à « Connexion »
  sans sélection, un second clic sélectionne « login » ; `make check` vert.
- Fait : `Engine.handleClick` — un clic simple dont l'élément change le courant du mode (`pickModeCurrent`, qui
  renvoie maintenant vrai s'il l'a changé) retire la sélection et s'arrête là ; `selectItems` garde le changement de
  courant pour les autres sélections. Commentaire de `ModeCurrent.pick`, SPEC §14.5. Vérifié dans l'appli sur
  `sequences.drawio` : courant « Paiement », un clic sur « login » passe à « Connexion » sans sélection, un second
  clic la sélectionne.
