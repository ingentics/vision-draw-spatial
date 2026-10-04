# Prise (plug)

> Milestone 5 — Formes ; palette Architecture (46)

draw.io n'a pas de forme « prise » : on la définit nous-mêmes, en **stencil embarqué** dans le style, pour que draw.io
la dessine à l'identique à la réouverture.

- **Dessin** : connecteur au sens logiciel (module qui se branche) : un corps rectangulaire sur les 7/10 de la
  largeur, et deux broches qui dépassent à droite (de 1/5 à 2/5 et de 3/5 à 4/5 de la hauteur). Un seul contour fermé,
  étiré dans les bornes (`aspect="variable"`), orienté par `direction`, `flipH` et `flipV` comme toute forme draw.io.
- **Style** (palette) : `shape=stencil(…);whiteSpace=wrap;html=1;`, 100 × 60. Le stencil est le XML
  `<shape name="plug" …>` compressé comme draw.io (`encodeURIComponent`, deflate raw, base64).
- **Nom de forme** : `resolveShapeKind` décode les `shape=stencil(…)` et renvoie `stencil:<nom>` (`stencil:plug`) ;
  un stencil illisible garde son nom brut. Les stencils inconnus apparaissent ainsi par leur nom dans Diagnostics.
- **Rendu** : 2D comme draw.io (fond, bordure, label dans les bornes) ; prisme du contour en iso / 3D.
- **Palette** : catégorie Architecture, nom « Prise », mots-clés plug, plugin, connecteur, prise, module ; aperçu.
- **Flèches** : périmètre rectangle, comme draw.io pour un stencil sans `perimeter`. Clic sur le contour réel.
- **Fini quand :** la prise se crée depuis la palette (Architecture), s'affiche en 2D et en volume en iso / 3D, se
  clique sur son contour ; dans la fixture `shapes.drawio`, ses contours (tailles, directions, retournements) tombent
  au pixel près sur l'export SVG de draw.io (`make drawio-check`) ; `make check` vert.
- Fait : `render/shapes/plug.ts` (contour, XML du stencil tiré du même contour, `PLUG_SHAPE` compressé par
  `encodeDiagram` ; rendu `flatBox` / `isoBlock`), `format/stencil.ts` (`stencilName` mémorisé, `stencilShape`),
  `resolveShapeKind` ► `stencil:<nom>` ; enregistrée dans `createDefaultRegistry`. Palette : « Prise » en
  Architecture, aperçu dans `app/Palette.tsx`. Fixture `shapes.drawio` : 20 prises (100 × 60 et 60 × 100, directions
  et retournements), flèches décalées plus bas ; `make drawio-check` : les 20 contours tombent au pixel près sur
  l'export SVG de draw.io, et draw.io conserve le stencil au réenregistrement. Tests de `resolveShapeKind` (stencil
  lisible, illisible) et de la palette. SPEC §8.3 et guide `AJOUTER_UNE_FORME.md` mis à jour. Vérifié dans l'appli :
  ajout par clic, rendu en 2D, mini-carte et volume en iso.
