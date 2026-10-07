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
    rectangle, process, tagged-process, table RDD (l'écart des barres de process et les lignes de tagged-process
    gardent leur calcul en % sans `absoluteArcSize` : c'est celui de draw.io, vérifié pour la dette 309) ;
  - **orientation** (`direction`, `flipH`, `flipV`) : `orientation(bounds, style)` dans `geometry/orient.ts`, dont
    `orientedPath` devient un cas particulier ; tagged-process, process (le cylindre passe déjà par `orientedPath`,
    dette 310) ;
  - **flèches** : `facingSide`, `endAttachmentOf`, `constraintPrefix` exportés ; `rdd/relations/edgeLook.ts:23` ;
  - **géométrie** : `inflate` (`edit/anchoring/routing.ts:51`) et `boundsOfPoints` dans `model/geometry.ts`,
    `rectDistance(rect, point)` créé (forêt, `effects/room.ts`) ; copies du tronc reprises aussi ;
  - **style** : `formatStyle` (inverse de `parseStyle`) et `fontStyleValue({ bold, italic })` (inverse de
    `fontStyleBits`) ; tables et régions RDD, tagged-process, palettes ;
  - **couleurs** : `darken` (`render/decorations.ts:198`) exporté, accepte un `Color` ; `readableOn` accepte un
    `Color` et une opacité (fond translucide sur la page) ; building, table, région ;
  - **nom numéroté libre** : `firstFreeName(prefix, used)` ; flux, champs RDD, pages ;
  - **déjà exportés mais pas utilisés** : `cubicTo` (onglet de région RDD), `ellipsePath` (marques d'entête RDD,
    façade de queue), `unionOf`.
- Comportement inchangé. Les bugs latents relevés avec ce ticket (dette 308 à 311) sont traités à part.
- **Fini quand :** les plugins n'ont plus de copie de ces calculs (recherche relue) ; rendu identique à l'œil sur
  les fixtures des formes, RDD et forêt, dans les trois vues ; `make check` vert.
- Fait :
  - Ajouté au tronc et exporté par l'API des plugins, puis employé par les plugins (et par le tronc quand il avait sa
    propre copie) :
    - `styleStroke(style, fallback)` (`render/styleColors.ts`) : trait d'un style (couleur, opacité, épaisseur,
      pointillés) ; rendu à plat et arêtes des volumes du tronc ; box, cylindre, bâtiment (`strokeOf`), acteur (corps,
      silhouette, pancarte), table et région RDD ;
    - `sizeOffset` (`render/geometry/paths.ts`, ex-`perimeterSize` privé des périmètres) : étape, hexagone,
      parallélogramme et leurs périmètres ;
    - `boxOutline` : rectangle, process, process étiqueté, table RDD ;
    - `orientation(bounds, style)` (`render/geometry/orient.ts`) : cadre local, `map` d'un point, `direction` d'un
      vecteur ; `orientedPath` en devient un cas particulier ; le process étiqueté (angle du mot de la tranche) et le
      cylindre l'utilisent au lieu d'orienter des points de repère ;
    - `endAttachmentOf`, `facingSide` : `leavingDirection` des relations RDD ;
    - `inflate`, `rectDistance` (`model/geometry.ts`) ; `boundsOfPoints` exporté : régions RDD (agrandissement,
      ajustement), forêt, place prise par le schéma (`effects/room.ts`) ; copies du tronc reprises (obstacles,
      tracés automatiques, périmètres, décorations de sélection) ;
    - `fontStyleValue` (`model/styleValues.ts`, inverse de `fontStyleBits`) : entête des tables RDD ;
    - `readableOn(fond, opacité)` accepte une couleur Three.js et un fond translucide sur la page : table et région
      RDD (`regionTextColor` s'appuie dessus) ;
    - `firstFreeName` (`model/names.ts`) : flux de Séquences, champs RDD, pages du tronc ;
    - `arcPath` (`render/geometry/paths.ts`) : marques d'entête RDD, cercles de la façade de la queue ; `cubicTo` pour
      l'onglet de région RDD (même formule).
  - Choix et écarts avec le ticket (comportement inchangé exigé) :
    - pas de `formatStyle` : les styles des modèles de palette restent des chaînes littérales, recopiées de draw.io et
      comparables d'un coup d'œil ;
    - assombrissement non unifié : les trois algorithmes (HSL du tronc, multiplication RVB du bâtiment et des tables)
      donnent des couleurs différentes ; les unifier changerait le rendu ;
    - le process garde son calcul de l'écart des barres (port de `ProcessShape`, qui lit `fixedSize` autrement et
      tient compte de l'arrondi) ;
    - non repris : générateur pseudo-aléatoire de la forêt (un seul utilisateur), déplacement d'un élément dans une
      liste (deux variantes de deux lignes).
  - Dette notée en passant : 313 (l'appli relit les bits de `fontStyle` à la main).
  - Comportement inchangé : les tests de rendu existants, dont la comparaison au pixel des formes avec les exports de
    draw.io (`shapesFixture.test.ts`), passent sans changement.
  - Doc : `AJOUTER_UNE_FORME.md` (briques à employer, chercher dans l'API avant d'écrire un calcul).
  - Tests : `sizeOffset`, `boxOutline`, `arcPath`, `orientation` (`render/geometry.test.ts`) ; `inflate`,
    `rectDistance` (`model/geometry.test.ts`) ; `fontStyleValue` (`model/styleValues.test.ts`) ; `firstFreeName`
    (`model/names.test.ts`, nouveau) ; `styleStroke`, `readableOn` (`render/styleColors.test.ts`, nouveau).
  - Vérifié à l'œil dans l'appli (navigateur intégré, serveur 5173) : page RDD (tables, marques d'entête, onglet de
    région) ; cylindres en 2D ; en iso, bâtiments, cercles des queues et forêt.
