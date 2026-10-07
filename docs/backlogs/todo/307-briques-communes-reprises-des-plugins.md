# Briques communes reprises des plugins

> Architecture du moteur — tronc commun ; suite de 291. Audit du 2026-10-07. Peut être découpé.

- Le tronc garde privées des fonctions que les plugins refont à la main ; on les exporte par `core/plugins` (ou on
  les crée) et les plugins les utilisent :
  - **trait lu du style** (couleur, épaisseur, opacité, pointillés) : `styleStroke(style, fallback)` dans
    `render/styleColors.ts`, utilisé par `flat/box`, `iso/block`, `edges/edge` et une dizaine de copies (box,
    cylinder, building, actors, table et région RDD) ;
  - **`size` / `fixedSize`** en px ou en fraction : `perimeterSize` (`perimeters/polygons.ts:78`, privé) dans
    `render/geometry/paths.ts` ; step, hexagon, parallelogram, process ;
  - **contour rectangle / rectangle arrondi** selon `rounded` : `boxOutline(bounds, style)` dans `paths.ts` ;
    rectangle, process, tagged-process, table RDD (process et tagged-process passent par `cornerRadius`) ;
  - **orientation** (`direction`, `flipH`, `flipV`) : `orientation(bounds, style)` dans `geometry/orient.ts`, dont
    `orientedPath` devient un cas particulier ; cylinder, tagged-process, process ;
  - **flèches** : `facingSide`, `endAttachmentOf`, `constraintPrefix` exportés ; `rdd/relations/edgeLook.ts:23` ;
  - **géométrie** : `inflate` (`edit/anchoring/routing.ts:51`) et `boundsOfPoints` dans `model/geometry.ts`,
    `rectDistance(rect, point)` créé (forêt, `effects/room.ts`) ; copies du tronc reprises aussi ;
  - **style** : `formatStyle` (inverse de `parseStyle`) et `fontStyleValue({ bold, italic })` (inverse de
    `fontStyleBits`) ; tables et régions RDD, tagged-process, palettes ;
  - **couleurs** : `darken` (`render/decorations.ts:198`) exporté, accepte un `Color` ; `readableOn` accepte un
    `Color` et une opacité (fond translucide sur la page) ; building, table, région ;
  - **nom numéroté libre** : `firstFreeName(prefix, used)` ; flux, champs RDD, pages ;
  - **éclairage des volumes** : `LIGHT`, `SHADE_LIGHT`, `SHADE_DARK` exportés, et réglages d'ombrage passés à
    `volume()` d'un effet ; forêt ;
  - **déjà exportés mais pas utilisés** : `cubicTo` (onglet de région RDD), `ellipsePath` (marques d'entête RDD,
    façade de queue), `unionOf`.
- Comportement inchangé, sauf les bugs latents que la reprise corrige (dette 308 à 311, à fermer ici s'ils le
  sont).
- **Fini quand :** les plugins n'ont plus de copie de ces calculs (recherche relue) ; rendu identique à l'œil sur
  les fixtures des formes, RDD et forêt, dans les trois vues ; `make check` vert.
