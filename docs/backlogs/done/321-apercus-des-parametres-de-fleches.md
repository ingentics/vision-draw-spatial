# Aperçus dans les paramètres des flèches

> Itération — paramètres, section « Formes et flèches ». Même principe que 320.

- **Flèches** : deux flèches qui se croisent, avec un texte ; croisements et taille du saut, couleur du texte, fond
  du texte (halo, fond uni, aucun), épaisseur et flou du halo.
- **Textes de début et de fin** : une flèche avec ses deux textes ; taille, couleur, écart le long de la flèche et
  depuis le trait.
- **Flèches coupées** : une flèche coupée avec ses deux tronçons, le fondu et les cadres de renvoi.
- **Nouvelles formes et flèches** : la marge d'une boucle (flèche vers la même forme).
- Les réglages de contournement (écarts, segments, détour, coûts des coudes) sont hors de ce sujet : leur aperçu
  demande de lancer le vrai routage (idée 322).
- **Fini quand :** dans les paramètres, chacune de ces sous-sections montre son aperçu, qui suit les réglages en
  direct.
- Fait : dans `src/app/settingsPreviews/` (mêmes briques que 320), aperçus calculés par les fonctions du moteur,
  exportées par `engine/index.ts` : Flèches (deux flèches qui se croisent, saut par `withJumps` / `jumpHalfLength`,
  texte de la couleur réglée sur halo, fond uni ou rien), Textes de début et de fin (placement par `edgeTextLayout`
  aux écarts réglés), Flèches coupées (`splitPieces`, tronçon de départ en fondu, celui d'arrivée sur son cadre de
  renvoi placé par `splitLabelFrame`), Nouvelles formes et flèches (forme au texte de la taille réglée, boucle par
  `loopWaypoints` à la marge réglée, marge en pointillé). Vérifié dans l'appli : chaque aperçu suit ses réglages en
  direct (saut en arc, halo, fondu et cadre, marge de boucle).
