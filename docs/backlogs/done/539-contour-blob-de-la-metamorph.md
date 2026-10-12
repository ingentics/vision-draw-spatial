# Contour en blob de la Metamorph

> Itération — forme Metamorph (`plugins/shapes/general/metamorph/`), reprise de 538

- Le contour de la Metamorph n'est plus un rectangle mais un **blob** : le contour **exact** de l'image fournie (bord
  extérieur du trait relevé au pixel, simplifié à 2,5 px près), courbe lisse fermée passant par ces points en fraction
  des bornes, étirée avec la forme.
- Le contour sert au dessin (2D, bloc en iso), au clic et à la mini-carte ; le halo suit le contour (6 px vers
  l'extérieur).
- **Plus d'icônes** (ni loader, ni étoile) : l'état se lit au halo. **Brouillon** : aucun halo, aucune animation.
  **« Morphing… »** : le halo qui tourne et pulse (« vou vou, pause pause »), **en gris** (bande claire qui tourne).
  **Prêt** (en attente de décision) : le même en **arc-en-ciel**.
- Taille par défaut : **60 × 60** (au lieu de 80 × 100).
- La demande de propositions (`metamorphRequest`) envoie aussi le **commentaire** de la forme (`comment`, texte brut,
  vide sans commentaire), entre le texte et les instructions.
- Texte par défaut **sous la forme** (`verticalLabelPosition=bottom;verticalAlign=top`).
- Inchangé : noir et blanc, bordure de 1 px.
- **Fini quand :** dans l'appli, une Metamorph déposée (60 × 60) a le contour en blob, en 2D et en iso, sans icône ni
  halo ; « Valider » fait tourner et pulser un halo gris qui suit le blob, puis arc-en-ciel quand les propositions
  arrivent ; le clic ne la prend que dans le blob.
- Fait : contour relevé au pixel sur l'image fournie (bord extérieur du trait, tracé de Moore puis Douglas-Peucker à
  2,5 px, 58 points ramenés à leur cadre) dans `plugins/shapes/general/metamorph/blob.ts` (`blobOutline` : courbe de
  Catmull-Rom ; `outerRing` : anneau du halo selon les normales) ; icône de la palette tirée des mêmes points. Icônes
  (loader, étoile) retirées, et avec elles la brique de rotation (`spinObject`) ; le halo suit le contour et l'état :
  aucun au brouillon, gris en « Morphing… » (`spinHues` avec `gray` : bande claire qui tourne), arc-en-ciel quand les
  propositions sont prêtes. Taille par défaut 60 × 60, texte sous la forme. `metamorphRequest` porte `comment` (texte
  brut du commentaire, vide sans commentaire). `unit` offert par l'API des plugins. Docs : SPEC §8.3, COMPOSANT.
  Validé : tests (`tests/engine/plugins/shapes/metamorph.test.ts`, animation, domaine) ; dans l'appli, blob en 2D et
  halos selon l'état relevés dans la scène ; rendu, taille et texte sous la forme testés par l'utilisateur.
