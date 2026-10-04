# Estomper ce qui est hors du flux courant ; paramètres « Modes › Séquences »

> Itération — mode Séquences (rendu) et paramètres ; reprise de 79, 80 et 77

- Quand il y a un flux courant, tout ce qui ne touche pas ses flèches est estompé : flèches hors du flux, formes qui
  ne sont ni le départ ni l'arrivée d'une de ses flèches. Opacité 30 % par défaut, réglable.
- Flux courant sans flèche : pas d'estompage.
- Le rendu suit le flux courant (clic sur une flèche, boutons de la barre) et les modifications du schéma.
- Paramètres : nouvelle catégorie **« Modes » › « Séquences »** (après « Formes et flèches ») qui regroupe
  l'opacité hors du flux courant, les réglages de la pastille (repris de « Formes et flèches › Pastilles des
  flèches ») et l'assombrissement du trait, rangés en groupes dans la sous-catégorie.
- Cadre générique : le mode donne les éléments à garder visibles pour son courant (`ModeCurrent.focus`) ; le moteur
  estompe les autres (opacité multipliée, compatible avec les fondus de transition).
- **Fini quand :** sur `sequences.drawio`, flux « Connexion » courant : Client, API, Base et leurs deux flèches
  nettes, « hors flux » et « payer » estompées ; flux « Vide » : rien d'estompé ; l'opacité change depuis
  « Modes › Séquences » ; `make check` vert.
- Fait :
  - Cadre : `ModeCurrent.focus` (`engine/modes/types.ts`) ; Séquences : flèches du flux courant et formes qu'elles
    relient, rien si le flux n'a pas de flèche.
  - Rendu : `setElementsDim` (`render/pageEffects.ts`) estompe des éléments par `userData.dim` ; `setPageOpacity`
    multiplie désormais l'opacité par l'estompage des ancêtres et retient l'alpha de la page (`pageAlpha`), pour
    rester juste pendant les fondus. Moteur : `applyModeFocus` avant chaque image (seuls les éléments qui changent),
    nouvelle image à chaque changement de courant.
  - Paramètres : `shapes.modeDimOpacity` (0,3) ; catégorie « Modes › Séquences » (`SettingsPanel.tsx`) en trois
    groupes (Flux courant, Pastilles, Flèches et couleurs), réglages de la pastille et assombrissement déplacés depuis
    « Formes et flèches » (mêmes clés), style `.settings-group`.
  - Tests : `setElementsDim` (`pageEffects.test.ts`), `focus` (`sequences.test.ts`). Docs : SPEC §13 et §14.5,
    `AJOUTER_UN_MODE.md`.
  - Vérifié dans l'appli sur `sequences.drawio` : « Connexion » estompe les deux diagonales, « Vide » rien,
    « Paiement » estompe API, « login », la flèche API → Base et « hors flux » ; opacité à 10 % depuis
    « Modes › Séquences » appliquée aussitôt (remise à 30 %).
