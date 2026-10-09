# Moteur : Tab passe au courant suivant de la barre du mode

> Itération — moteur, touches de page d'un mode (reprise de 415). Valable pour tout mode qui a une barre du courant
> (Séquences : flux suivant ; RDD : couche suivante, sujet 414).

- Quand la page a une barre du courant (`ModeCurrent.color`) avec au moins deux valeurs (`values`), Tab sur la zone de
  dessin, rien de sélectionné, hors saisie de texte, choisit la valeur suivante, en boucle (comme le bouton
  « Suivant » de la barre). Mêmes conditions que les touches de page (415) : sans Ctrl, ⌘ ni Alt ; maintenue, prise
  sans être refaite ; un raccourci de l'appli sur Tab passe avant.
- Une touche de page `Tab` déclarée par le mode (`pageKeys.Tab`) remplace ce comportement par défaut.
- Sans barre (pas de mode, pas de courant, pas de couleur, moins de deux valeurs) : Tab garde le comportement du
  navigateur.
- Le mode RDD n'a plus sa propre touche Tab (sujet 414) : il prend celle du moteur.
- Doc : `docs/AJOUTER_UN_MODE.md` (touches de page, courant) et SPEC (barre du courant).
- **Fini quand :** sur une page Séquences avec deux flux, Tab sans sélection passe au flux suivant (barre et
  estompage suivent) ; sur une page RDD, Tab bascule toujours la couche ; testé dans le moteur (barre, pas de barre,
  touche du mode prioritaire, sélection).
- Fait : `ModePanel.modePageKey` (`core/domains/modes/modePanel.ts`) : sans touche du mode pour la touche, Tab
  (`NEXT_CURRENT_KEY`) choisit le courant suivant de la barre (`getModeIndicator` : valeurs dans l'ordre, en boucle),
  seulement avec au moins deux valeurs ; une `pageKeys.Tab` du mode passe avant ; mêmes conditions que 415 (rien de
  sélectionné, focus, modificateurs, répétition). Doc : `AJOUTER_UN_MODE.md` (touches de page) et SPEC (barre du
  courant). Tests : `modePageKeys.test.ts` (suivant en boucle, maintenue, sans barre, une valeur, sélection, touche du
  mode prioritaire). Vérifié dans l'appli : Séquences, Tab fait Connexion → Paiement « carte » → Vide → Connexion ;
  RDD, Tab bascule la couche (414). Shift+Tab fait aussi « suivant ».
