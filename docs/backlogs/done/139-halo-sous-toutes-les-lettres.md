# Halo sous toutes les lettres

> Itération — texte des flèches (halo) ; reprise de 138

- Un texte dessiné en plusieurs morceaux (une lettre par texte SDF le long du tracé, un mot par texte SDF pour un
  texte riche) : le halo d'un morceau passe aujourd'hui par-dessus les lettres de ses voisins.
- Deux couches : tous les halos d'abord (contour seul, remplissage transparent), puis toutes les lettres
  au-dessus (remplissage seul, sans contour). Le halo reste sous le texte, jamais sur une lettre voisine.
- **Fini quand :** sur un texte du milieu qui suit la flèche (halo par défaut), aucune lettre n'est rognée par le
  halo de sa voisine, à l'œil en zoomant ; `make check` vert.
- Fait : `render/troikaText.ts`, `layeredText` : avec un halo, chaque morceau donne deux textes SDF, le halo seul
  (`fillOpacity = 0`, rang −0,25 dans le groupe, au-dessus du fond à −0,5) et la lettre seule (rang 0) ; utilisé
  pour le texte le long du tracé (une lettre par texte) et le texte riche (un mot par texte). Vérifié dans l'appli
  sur `simple.drawio`, texte « appelle » qui suit la flèche, très zoomé : lettres entières, halos sous le texte
  seulement ; annulé ensuite.
