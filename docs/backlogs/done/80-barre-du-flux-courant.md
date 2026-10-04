# Barre du flux courant en haut de la zone de dessin

> Itération — mode Séquences (édition) ; reprise de 79

- La barre de 3 px au bas de la zone de dessin est remplacée par une barre **en haut** de la zone de dessin, de la
  couleur du flux courant, avec le **titre du flux** centré.
- Au moins 2 flux : boutons « précédent » et « suivant » de part et d'autre du titre, qui changent le flux courant
  dans l'ordre de la liste (en boucle : après le dernier, le premier). Un seul flux : pas de boutons.
- Texte et boutons lisibles sur la couleur du flux (noir sur une couleur claire, blanc sur une couleur foncée).
- Cadre générique : le mode donne la liste ordonnée des valeurs de son courant et leur libellé ; le moteur permet de
  choisir le courant (`setModeCurrent`).
- **Fini quand :** sur `sequences.drawio`, la barre en haut montre « Connexion » sur sa couleur à l'ouverture,
  « suivant » passe à « Vide », « précédent » depuis le premier va au dernier ; une page à un seul flux n'a pas de
  boutons ; `make check` vert.
- Fait :
  - Cadre : `ModeCurrent.label` et `values` (`engine/modes/types.ts`) ; moteur : `getModeIndicator` renvoie
    `ModeIndicator` (valeur, couleur, libellé, valeurs), `setModeCurrent` (choix validé, `modeCurrentChange`).
  - Séquences : libellé = titre du flux (sinon son id), valeurs = flux dans l'ordre de la liste.
  - Appli : `app/ModeBar.tsx` (barre en haut de la zone de dessin, titre centré, ‹ › en boucle si au moins deux
    flux, texte noir ou blanc selon le contraste), `.mode-bar` (`main.css`) à la place de `.mode-indicator`.
  - Tests (`sequences.test.ts`) : libellé et valeurs du courant. Docs : SPEC §14.5, `AJOUTER_UN_MODE.md`.
  - Vérifié dans l'appli sur `sequences.drawio` : « Connexion » à l'ouverture, suivant → « Vide », précédent depuis
    « Connexion » → « Inscription » (le dernier) ; page « Rangs en désordre » (un flux) sans boutons.
