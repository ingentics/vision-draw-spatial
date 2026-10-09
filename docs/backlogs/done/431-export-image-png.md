# Export d'image (PNG)

> Milestone 2 — Editor ; export image (jusqu'ici hors périmètre, SUMMARY §7)

- **Bouton** : une icône « Exporter » (sans texte) dans la barre d'outils du haut, juste à droite du bouton
  « Enregistrer », avec l'infobulle « Exporter en image ». Il ouvre (ou referme) le panneau « Exporter » dans la
  barre de droite, qui prend la place du panneau contextuel le temps d'être ouvert, comme les Diagnostics (choisir un
  élément ne le referme pas) ; bouton
  de fermeture dans l'en-tête du panneau.
- **Réglages du panneau**, dans cet ordre :
  - **Densité** : nombre de pixels par unité du schéma, selon l'écran visé (rapport de largeur avec un écran HD de
    1920 px) : « HD » ×1, « 2K » ×1,5 (écran de 2560 px, arrondi), « 4K » ×2 (écran de 3840 px). La taille de l'image
    dépend donc du contenu exporté. Défaut : HD. Le PNG porte sa résolution (bloc `pHYs`) : 96 dpi × densité (HD 96,
    2K 144, 4K 192), pour s'afficher à la même taille, plus nette, dans les logiciels qui la lisent.
  - **Contenu** : « Sélection » (les éléments sélectionnés avec leur contenu, comme leur mise en valeur : enfants d'un
    groupe ou d'un conteneur, contenu d'une région RDD) ou « Tout le schéma » (toute la page courante). « Sélection »
    est grisé si rien n'est sélectionné. Défaut : « Sélection » s'il y a une sélection à l'ouverture, sinon « Tout le schéma ».
  - **Marge** : champ numérique, en unités du schéma (multipliée par la densité), autour du contenu de chaque côté ;
    de 0 à 200, pas de 1. Défaut : 10.
  - **Fond transparent** : case à cocher. Décochée : couleur de fond de la vue (paramètre `background.color`). Défaut : décochée.
  - **Format** : « PNG » ou « SVG » ; « SVG » est affiché mais désactivé (infobulle « Bientôt disponible »). PNG
    choisi.
  - Bouton « Exporter » en pleine largeur en bas du panneau.
- **Rendu** : toujours en vue de dessus (2D), quelle que soit la vue courante (iso, 3D) ; cadré sur la boîte
  englobante du contenu choisi (formes, flèches et leurs textes), avec la marge choisie de chaque côté (mise à
  l'échelle avec l'image). Pour la sélection, seuls les éléments sélectionnés sont dessinés. Rendu hors écran : la
  vue, la caméra et la sélection affichées ne bougent pas.
- **Fichier** : généré puis téléchargé directement, nommé `<nom du fichier sans extension>-<nom de la page>.png`.
- Rien n'est écrit dans le fichier `.drawio` ; les réglages du panneau ne sont pas mémorisés (défauts à chaque
  ouverture).
- Hors ticket : le SVG (sujet à créer quand on s'y mettra).
- **Fini quand :** sur une fixture avec plusieurs formes et flèches, vue en iso, l'icône à droite de « Enregistrer »
  ouvre le panneau ; « Tout le schéma » + 4K + fond opaque télécharge un PNG deux fois plus grand en pixels qu'en HD, à 192 dpi,
  montrant la page à plat sur son fond ; « Sélection » + HD + fond transparent ne contient que les éléments sélectionnés
  sur fond transparent ; « SVG » n'est pas cliquable ; `make check` vert.
- Fait : moteur — `core/domains/view/imageExport.ts` (`Engine.exportImage`) construit une scène à plat de la page
  courante, attend la mise en page des textes (`textsSynced`, `render/troikaText.ts`), la cadre sur l'emprise dessinée
  plus la marge et la rend hors écran avec un renderer jetable, par morceaux d'au plus 4096 px (`render/png/imageTiles.ts`),
  puis écrit la résolution dans le PNG (`render/png/pngDensity.ts`, bloc `pHYs`). « Sélection avec son contenu » est
  désormais `Selections.withContent`, partagé avec la mise en valeur de la sélection (comportement de celle-ci
  inchangé). Appli — `ExportPanel.tsx` (panneau), icône dans `ViewerToolbar.tsx`, `Viewer.tsx` (panneau `export`, non
  refermé par la sélection) ; `ChoiceGroup` : option `disabled` (via `aria-disabled`, infobulle gardée) ;
  `download.ts` : téléchargement commun au fichier, au rapport des Diagnostics et à l'image. Tests : `imageTiles`,
  `pngDensity`. Vérifié dans l'appli : `rdd.drawio` tout le schéma en 4K (fond de la vue, textes) ; région « Comptes »
  sélectionnée en HD, fond transparent, avec ses tables ; `spatial.drawio` exporté depuis la vue Iso, rendu à plat ;
  4K à 192 dpi et deux fois plus de pixels qu'en HD ; SVG non cliquable. Non vérifié : un schéma assez grand pour être
  rendu en plusieurs morceaux (testé seulement par `imageTiles`).
