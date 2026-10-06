# Flèche coupée en deux (fondu ou étiquettes de renvoi)

> Formes et flèches — option de toute flèche ; s'appuie sur 163 (découpage du tracé des arêtes)

- Toute flèche peut être **coupée en deux** (option `split=1` dans son style, case « Couper la flèche » dans le
  panneau de la flèche) : on ne dessine pas la ligne entière, seulement un tronçon au départ de la source et un
  tronçon à l'arrivée sur la cible, chacun avec sa pointe d'origine ; le milieu n'est pas tracé.
- **Sans étiquette de renvoi :** chaque tronçon s'efface en fondu (opacité 1 → 0) sur ses derniers pixels, à
  partir d'une longueur visible de quelques dizaines de pixels.
- **Étiquettes de renvoi :** deux textes facultatifs, `splitLabelLeft` (côté source) et `splitLabelRight` (côté
  cible), saisis dans le panneau de la flèche. S'il y en a une, un petit cadre avec ce texte est posé au bout du
  tronçon correspondant, et **le fondu est désactivé** (le tronçon s'arrête net sur le cadre).
- Paramètres globaux (section `shapes`, Paramètres › Formes et flèches, sous-section « Flèches coupées ») :
  - **Longueur visible d'un tronçon** (`shapes.edgeSplitLength`, 40 px, 10–200) ;
  - **Longueur du fondu** (`shapes.edgeSplitFade`, 20 px, 0–100, compris dans la longueur visible) ;
  - **Marge du cadre de renvoi** (`shapes.edgeSplitLabelPadding`, 4 px, 0–16) ;
  - **Taille du texte de renvoi** (`shapes.edgeSplitLabelSize`, 7 pt, 4–24 ; demandé en cours de route : la taille
    du texte de la flèche donnait des cadres trop gros).
- Le fichier draw.io garde la flèche complète (source, cible, points) : les clés `split`, `splitLabelLeft`,
  `splitLabelRight` sont conservées telles quelles par draw.io, qui dessine la flèche entière.
- La sélection, le survol et les poignées portent sur la flèche entière (le tracé complet reste la zone de clic
  quand la flèche est sélectionnée).
- **Fini quand :** une flèche cochée « Couper » ne montre que deux tronçons de 40 px qui s'estompent ; avec un
  `splitLabelLeft`, le tronçon source s'arrête sans fondu sur un cadre portant le texte ; changer les paramètres
  globaux modifie toutes les flèches coupées ; le fichier réenregistré par draw.io (`make drawio-check`) garde les
  trois clés ; `make check` vert.
- Fait : `render/edges/split.ts` (tronçons découpés sur le trait dessiné, après raccourcissement par les pointes :
  longueur visible bornée à la moitié de la flèche, point de début du fondu inséré dans le tracé, opacité par point ;
  cadre de renvoi posé bord contre le bout du tronçon) ; `fadedStrokeMesh` (`render/meshes.ts`, couleur de sommet à
  4 composantes) ; `edge.ts` dessine les tronçons (pointillés compris, sans saut aux croisements) et le cadre (fond
  de la page, bord de la couleur du trait, texte à `shapes.edgeSplitLabelSize` mesuré par `approximateMeasure`). Clic : `edgePieces` de
  `interaction/pick.ts`, les tronçons tant que la flèche n'est pas sélectionnée. Paramètres `shapes.edgeSplitLength`,
  `edgeSplitFade`, `edgeSplitLabelPadding` (Paramètres › Formes et flèches › Flèches coupées) ; panneau de la
  flèche : case « Couper la flèche » et champs « Renvoi départ / arrivée » (point-virgule retiré). Tests
  `tests/engine/render/edges/split.test.ts` ; flèche `coupee` ajoutée à `spatial.drawio`, `make drawio-check` : draw.io
  garde les trois clés (test de conservation étendu). Vérifié dans l'appli : fondu sur une flèche pointillée, cadre
  « vers Stockage » au bout du tronçon de départ, sélection par le tronçon. SPEC §8 (tableau des réglages) à jour.
