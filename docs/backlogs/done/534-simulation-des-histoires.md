# Simulation des histoires (Story telling)

> Milestone — mode Story telling ; suite du sujet 474, modèle : simulation de la Machine à états (462, 467) ; dépend
> du sujet 533 (voile qui masque)

On joue les histoires pas à pas, comme une présentation : tout est caché, sauf ce qui a déjà été montré.

- **Lancement** : bouton « ▶ Lancer la simulation » dans la section « Histoires » du panneau de la page et dans une
  barre en bas de la zone de dessin (comme la Machine à états) ; absent sans histoire. La simulation part du tout
  début (histoire 1). Édition bloquée pendant la simulation (verrou de la prise en main), caméra libre ; changer de
  page ou de fichier l'arrête.
- **Pas** : les histoires se jouent à la suite, dans l'ordre des numéros. Dans une histoire, le premier pas montre la
  forme de départ de sa flèche numérotée ; chaque pas suivant montre une flèche de l'histoire **et** sa forme
  d'arrivée. Un pas qui ne montrerait rien de nouveau (forme ou flèche déjà montrée par une histoire précédente) est
  sauté.
- **Ce qui est visible** : tout ce qui a été montré jusqu'au pas courant, histoires précédentes comprises
  (accumulation) ; le reste est caché (voile du sujet 533 : fond uni, grille masquée). Couleurs et pastilles des
  flèches comme hors simulation, l'histoire courante étant celle du pas.
- **Commandes** (barre en bas et touches) :
  - ⏮ « Tout début » (Début) : premier pas de l'histoire 1 ;
  - ⏪ « Histoire précédente » (↑) : premier pas de l'histoire en cours, ou de la précédente si on y est déjà ;
  - ◀ « Précédent » (← ou Page précédente) : un pas en arrière ;
  - ▶ « Suivant » (→ ou Page suivante, touches des télécommandes de présentation) : un pas en avant, d'une histoire
    à la suivante ;
  - ⏩ « Histoire suivante » (↓) : premier pas de l'histoire suivante (la fin de l'histoire en cours apparaît d'un
    coup) ;
  - ⏹ « Arrêter » (Échap) : retour à l'édition, tout réapparaît.
  - Boutons grisés quand ils sont sans effet ; libellé « Histoire 2 / 3 · Contrôler le stock · pas 2 / 4 ».
- **Caméra** : la forme montrée par le pas (sinon la flèche) reste dans la vue, avec ce qui est montré de l'histoire en
  cours.
- Rien n'est écrit dans le fichier ni annulable.
- **Fini quand :** sur `tests/fixtures/storytelling.drawio`, « Lancer » ne montre que Client ; → montre « Passer
  commande » et Panier, puis Payer et Paiement ; ↓ passe à l'histoire 2 : Expédier et Livraison (fin de l'histoire 1)
  apparaissent d'un coup avec Admin ; ← et ↑ reviennent en arrière en recachant ; Début repart de Client seul ; Échap rend tout et l'édition ; tests des
  pas (ordre, pas sautés, accumulation, commandes aux bouts) ; `make check` vert.
- Fait : `simulation/storyPlayback.ts` (pas, accumulation, sauts d'histoire) et `simulation/storySimulator.ts` (prise en
  main de la page : verrou, touches, voile qui masque, histoire du pas comme courant, cadrage) ; appli `StoryBar.tsx`,
  `storyRun.ts` et boutons de la section « Histoires ». Le reste montré des histoires précédentes est estompé (histoire
  courante = celle du pas). Squelette repris de `StatesSimulator` (dette 535). Tests
  `tests/engine/plugins/modes/storytelling/simulation/storyPlayback.test.ts`. Vu dans l'appli : lancement (Client
  seul), →, ↓, ↑, Échap ; boutons de la barre, Début et ← seulement par les tests. Le cadrage ne tient pas compte de la
  barre ni du panneau (comme la Machine à états).
