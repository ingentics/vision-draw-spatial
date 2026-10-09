# Post-it

> Milestone — Palette, catégorie « Général » (`plugins/shapes/categories.ts`). Reprend le calcul de taille de 57
> (« Ajuster ») en l'étendant. Export draw.io seulement (408).

- Nouvelle forme « Post-it » dans « Général » : un carré de 160 × 160 px qui **ressemble à un post-it** :
  - fond plein, sans contour, coins droits ;
  - **ombre portée en dessous** : ombre douce décalée vers le bas (4 px), floue (8 px), noire à 25 % d'opacité, un
    peu plus marquée vers le bas du post-it (comme un papier légèrement décollé) ;
  - en iso, la forme reste à plat au sol (sans volume), l'ombre est dessinée au sol sous le post-it.
- **Couleur par défaut** : le jaune le plus vif des styles de l'engine (`DRAWIO_STYLES`, `core/edit/stylePresets.ts`)
  → « Jaune », fond `#fff2cc`. Les autres styles s'appliquent normalement (fond seulement : le contour reste absent).
- **Texte noir** (`#000000`), centré horizontalement et verticalement, marges de 8 px.
- **Texte toujours ajusté à la forme**, dans les deux sens (contrairement à 57 qui ne fait que réduire) :
  - la taille est la plus grande qui fait tenir le texte dans la zone (largeur et hauteur, marges comprises, retour
    à la ligne appliqué) : un texte court est agrandi pour remplir le post-it, un texte long est réduit ;
  - **minimum 6 pt** : si à 6 pt le texte dépasse encore, il est coupé à la dernière ligne qui tient et terminé par
    une **ellipse** « … » ;
  - recalcul en direct : à la saisie, au redimensionnement, au changement de police ou de contenu, à l'ouverture
    d'un fichier ; l'éditeur en place montre la même taille que le texte dessiné. Pendant la saisie, le texte
    entier reste visible dans l'éditeur (l'ellipse n'apparaît qu'en dehors de l'édition).
  - pas de réglage de taille de texte pour le post-it : le panneau affiche la taille obtenue, non éditable.
- Export : le fichier enregistré s'ouvre dans draw.io (par ex. rectangle `fillColor=#fff2cc;strokeColor=none;
  shadow=1;fontColor=#000000` plus une clé propre au post-it) ; le rendu dans draw.io n'a pas à être identique.
- **Fini quand :** dans l'appli, un clic sur « Post-it » pose un post-it jaune avec son ombre ; un mot seul s'y
  affiche en grand, un long texte rapetisse, et au-delà de 6 pt il se termine par « … » ; agrandir le post-it fait
  grossir le texte ; fixture avec des post-its (texte court, long, trop long) ; tests du calcul (agrandissement,
  minimum 6 pt, ellipse) ; `make check` vert.
- Fait : forme `plugins/shapes/general/post-it/` (`spatial.kind=post-it`, après Titre) : `createBox` sans contour
  (forcé, même après un style du panneau), ombre en 16 couches superposées (trapèze élargi en bas), dessinée juste
  avant le fond (ordre de dessin `PART_ORDER.fill - 1` : en iso, départagée par la profondeur, elle passait devant le
  papier) ; pas de rendu `iso` (à plat au sol). Texte : mode « Remplir » `fitText=fill` (`fitTextMode`,
  `model/styleValues.ts`) : `fitFontSize` cherche la plus grande taille qui tient de `maxFillSize` (hauteur / 1,2) à
  `MIN_FILL_SIZE` (6) (`render/richLayout.ts`, `largestFitting` prend un minimum) ; `clipLayout` retire les lignes en
  trop et termine la dernière (ou une ligne trop large) par « … » (`troikaText.ts`) ; `createLabel` passe `fit.fill`.
  Éditeur en place (`app/LabelEditor.tsx`) : même recherche dans le DOM, sans ellipse ; panneau (`app/TextFormat.tsx`) :
  taille obtenue affichée, ni réglage ni bouton « Ajuster ». SPEC §8.3 et §14.1. Tests : `richLayout.test.ts`
  (agrandissement, minimum 6, ellipse), `styleValues.test.ts`, `tests/engine/plugins/shapes/postIt.test.ts`, palette.
  Fixture `tests/fixtures/post-it.drawio` (court, long, trop long, large). Vérifié à l'œil sur le serveur partagé : 2D
  et iso, ellipse, pose depuis la palette, saisie en place (le texte grossit pendant la frappe, même taille une fois
  validé). Non fait : `make drawio-check`.
