# Forme « Bouclier »

> Milestone 5 — Formes ; catégorie « Géométrie » de la palette

- **Forme** : `plugins/shapes/geometry/shield/`, nommée « Bouclier » ; contour « sécurité » (proposition B) : haut
  bombé (coins plus bas que le sommet central), flancs verticaux, puis deux courbes qui se rejoignent en pointe en bas
  au centre. Symétrique.
- **Le haut et la pointe ne s'étirent pas** (demande de l'utilisateur) : haut bombé de 10 px et pointe de 50 px de
  haut quelle que soit la taille ; seuls les flancs droits s'allongent, la largeur s'étire. Si la forme fait moins de
  60 px de haut, haut et pointe se réduisent ensemble.
- Pas de bouclier natif dans draw.io : **stencil embarqué** dans le style (`shape=stencil(…)`, nom `shield`), comme la
  prise (courbes échantillonnées en segments), dessiné à la taille posée ; draw.io l'étire en entier (haut et pointe
  compris) : l'export s'ouvre, le rendu peut différer (sujet 408).
- Texte dans la partie haute (entre les flancs droits), pas dans la pointe. Contour noir, fond blanc. Prisme du contour
  en iso / 3D.
- Palette « Géométrie », en dernier (après l'étoile à six branches) ; taille posée 80 × 100.
- Fixture `tests/fixtures/shield.drawio` : une forme normale, une très large, une très haute, une petite, une colorée reliée par une
  flèche.
- **Fini quand :** dans l'appli, poser la forme depuis « Géométrie » ; elle a le contour B ; au
  redimensionnement, le haut et la pointe gardent leur taille ; le texte s'écrit dans le haut ; la fixture se lit en 2D, iso et 3D ; `make check` vert.
- Fait : forme `plugins/shapes/geometry/shield/` (contour B en Bézier quadratiques échantillonnées, `box` du contour
  orienté, texte dans la partie haute), reconnue par `stencil:shield` ; reprise demandée : haut bombé (10 px) et pointe
  (50 px) de hauteur fixe, seuls les flancs s'allongent. Export : stencil embarqué à la taille posée (80 × 100), que
  draw.io étire en entier. `quadTo` ajouté à l'API des plugins. Fixture `tests/fixtures/shield.drawio` vérifiée à l'œil
  en 2D et en iso, pose depuis la palette et redimensionnement à la main vérifiés ; listes de `palette.test.ts` mises
  à jour ; SPEC §8.3. Vue 3D et ouverture de l'export dans draw.io non vérifiées (`make drawio-check` non lancé).
