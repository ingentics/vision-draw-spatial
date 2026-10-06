# Forme « Titre » dans la catégorie Général

> Itération — palette (Général) ; reprise de la forme Texte (`src/engine/shapes/impl/general/text`)

- Nouvel élément **Titre** dans la catégorie `general` de la palette, rangé juste après **Texte**.
- C'est un texte : même rendu que la forme Texte (pas de fond ni de bordure, à plat en iso, absent de la
  mini-carte), seul le style change. Style draw.io créé :
  `text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=64;fontColor=#DEDEDE;`
  (64 pt, gris RVB 222, 222, 222), valeur `Titre`, taille par défaut adaptée à 64 pt (ordre de 240 × 80).
- Une forme ne déclare qu'un seul élément de palette (`palette?: PaletteEntry`, identifié par l'`id` de la
  forme) : soit la palette accepte plusieurs éléments par forme, soit Titre est une définition à part qui
  réutilise celle de Texte — à trancher au moment du code, sans changer le style `text` écrit dans le fichier.
- Mots-clés de recherche : `titre`, `title`, `heading`, `texte`.
- **Fini quand :** la palette Général propose Titre ; posé sur la page, il affiche « Titre » en 64 pt gris clair
  (#DEDEDE), se modifie comme un texte, et le fichier enregistré s'ouvre dans draw.io avec la même taille et la
  même couleur ; `make check` vert.
- Fait : Titre est une définition à part, `src/engine/shapes/impl/general/title/index.ts`, qui reprend celle de
  Texte (comme le rectangle arrondi reprend le rectangle) : `kinds: ['text']`, reconnue par `fontSize=64` et
  `fontColor=#DEDEDE` ; la palette garde un élément par forme. Rang 101 (juste après Texte), 240 × 80, icône « T ».
  `docs/SPEC.md` (§8.3), `tests/engine/edit/palette.test.ts` (catégorie Général, recherche « heading »,
  reconnaissance). Vérifié dans l'appli : Général propose Titre après Texte ; posé, il affiche « Titre » en 64 pt
  gris clair, style `text;…;fontSize=64;fontColor=#DEDEDE;`, et apparaît dans « Utilisées » ; `make check` vert.
  Pas rouvert dans draw.io (clés de style standard de draw.io).
