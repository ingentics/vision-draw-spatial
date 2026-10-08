# Texte du triangle vers le haut ou le bas loin de la pointe

> Itération — texte des formes ; triangles orientés vers le haut ou le bas (36, 340)

- Sur un triangle pointe en haut, la **zone de texte** (texte affiché et cadre de l'éditeur en place) ne couvre plus
  toute la boîte de la forme : elle garde la **largeur de la base**, s'appuie sur la **base** et monte aux **2/3 de la
  hauteur**. Le texte est centré dans cette zone, sous la pointe.
- Pointe en bas, même chose retournée : la zone s'appuie sur la base, en haut, et descend aux 2/3 de la hauteur.
- Les poignées (redimensionner, connecter) restent sur la boîte du triangle ; redimensionner le triangle garde la zone
  de texte aux 2/3 côté base.
- En 2D seulement (en iso, le texte reste sur tout le dessus du prisme, comme les autres boîtes). Seulement quand la
  pointe est en haut ou en bas ; pointe à gauche ou à droite et les autres formes sont inchangées. Le fichier
  `.drawio` n'est pas touché ; draw.io, lui, centre toujours le texte sur toute la boîte.
- **Fini quand :** dans l'appli, le texte d'un triangle vers le haut est centré dans ses 2/3 bas, celui d'un triangle
  vers le bas dans ses 2/3 haut, et le cadre pointillé de l'éditeur entoure ces 2/3 ; triangle vers la droite
  inchangé ; `make check` vert.
- Fait : le triangle passe une zone de texte à `box` (option `label`, `plugins/shapes/geometry/triangle/index.ts`) :
  d'après `orientation`, pointe en haut à l'écran (`direction=north`, ou `south` retourné verticalement) : les 2/3
  bas ; pointe en bas : les 2/3 haut ; sinon les bornes. `triangle-up` en hérite. Texte affiché et éditeur en place
  suivent (`textZone`). Test : `shapes/geometry.test.ts`. Vérifié dans l'appli (`orientation.drawio`) : triangle vers
  le bas et retourné vers le haut, poignées sur toute la boîte, texte et cadre pointillé de l'éditeur dans les 2/3
  côté base ; `make check` vert.
