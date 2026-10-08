# Ajouter une forme au moteur

Guide pour faire dessiner au moteur une forme draw.io qu'il ne connaît pas encore (aujourd'hui affichée en
placeholder gris). Il couvre les quatre rendus (2D, iso, 3D, mini-carte), l'origine de chaque valeur (style draw.io,
attributs `spatial.*`, paramètres) et tout ce qu'une forme déclare en plus du rendu : clic, poignées, flèches, palette,
panneau.

**En bref :** une forme est un dossier `src/engine/plugins/shapes/<catégorie>/<id>/` dont `index.ts` exporte
`definition`. Elle porte le nom de l'interface en anglais (`database`, `rounded-rectangle`…) et contient **tout** ce
qui la concerne : rendu 2D, subtilités iso / 3D (sa façade, son étiquette), palette, aperçu, réglages, interaction.
Elle peut étendre une base de `shapes/generic/` ou une autre forme. Dans le cas courant, déposer le dossier suffit :
le registre le trouve tout seul, et le moteur comme l'appli ne posent leurs questions qu'à la définition (via le
registre).
Des variantes d'une même forme se rangent en famille : `shapes/<catégorie>/<famille>/<variante>/index.ts`, le code
commun dans `<famille>/common/` (sans `index.ts`), l'id commençant par le nom de la famille au singulier (exemple :
[shapes/general/actors/](../src/engine/plugins/shapes/general/actors/), `human/` = `actor`, `droid/` = `actor-droid`).

> **Ce qui touche encore le tronc.** Trois cas demandent de modifier un fichier hors du dossier de la forme :
>
> - un synonyme du nom draw.io : `SHAPE_ALIASES` dans [core/format/style.ts](../src/engine/core/format/style.ts)
>   (section 1) ;
> - un périmètre d'accroche des flèches propre à la forme : `perimeterKind` dans
>   [core/render/edges/route/perimeters/index.ts](../src/engine/core/render/edges/route/perimeters/index.ts)
>   (section 6) ;
> - une nouvelle catégorie de palette, ou un réglage global lu par les formes d'une catégorie (déclaré par elle,
>   section 4.1) : [plugins/shapes/categories.ts](../src/engine/plugins/shapes/categories.ts), hors du tronc.

Références : SPEC §8.2 (registre), §8.3 (formes supportées), §8.4 (placeholder), §9.1 (volumes), §13 (paramètres).
Frontières d'un plugin (ce qu'il peut importer) : `.claude/rules/coding.md` §5.

---

## 1. Le parcours d'une forme

```
fichier .drawio
  └─ format/parse.ts ── style « shape=note;fillColor=#fff2cc;… »
        └─ format/style.ts  resolveShapeKind() ──► ShapeModel.kind = 'note'
              └─ shapes/registry.ts  ShapeRegistry.resolve(shape)
                    ├─ définition trouvée (supported: true)
                    └─ sinon placeholderShape (supported: false ► panneau Diagnostics)
                          └─ render/pageScene.ts  createShapeObject(shape, registry, ctx, level, elevation)
                                ├─ definition[level] ?? definition.flat   ► Object3D de la forme
                                ├─ pastille de lien posée sur le dessus
                                └─ hauteur (base), ordre de dessin, userData.elementId
```

Le moteur ne connaît que l'interface `ShapeDefinition` ([core/shapes/types.ts](../src/engine/core/shapes/types.ts)).
Ajouter une forme revient donc à **déposer son dossier** (sauf les cas de l'encadré du début). Ni la scène, ni la
caméra, ni l'édition, ni l'appli ne changent : la palette, le panneau, le clic, les poignées et les flèches
interrogent la définition (section 6).

### Le nom de la forme (`kind`)

Le parseur ([format/parse.ts](../src/engine/core/format/parse.ts)) prend d'abord l'attribut `spatial.kind` (style ou objet)
s'il y en a un : il impose la forme dessinée par Drawio Spatial sans toucher au style draw.io (pratique pour essayer
une définition sur une forme existante : `shape=note;spatial.kind=cylinder3;`). Sinon, `resolveShapeKind`
([format/style.ts](../src/engine/core/format/style.ts)) choisit, dans cet ordre :

1. `shape=…` explicite (`shape=cylinder3` ► `'cylinder3'`, `shape=mxgraph.aws4.lambda` ► tel quel) ;
2. sinon le premier nom de style sans valeur (`ellipse;whiteSpace=wrap;` ► `'ellipse'`) ;
3. sinon `'rectangle'` (forme par défaut de draw.io).

Un stencil embarqué (`shape=stencil(<XML compressé>)`) prend le nom `stencil:<nom>` de son `<shape name="…">` : c'est
la façon d'ajouter une forme que draw.io n'a pas, tout en restant dessinée par draw.io (exemple :
[shapes/architecture/plug/](../src/engine/plugins/shapes/architecture/plug/index.ts), XML tiré du même contour que le
moteur). La base [generic/stencil/](../src/engine/plugins/shapes/generic/stencil/index.ts) (`stencilBox`) fait les deux d'un
coup : à partir du contour, elle donne la valeur de `shape=` et le rendu, tirés des mêmes points. Un stencil s'étire
tout entier avec la forme : pour un détail de taille fixe, partir d'une forme native de draw.io et la désigner par
`spatial.kind` (exemple : [generic/tagged-process/](../src/engine/plugins/shapes/generic/tagged-process/index.ts), dont
héritent `event-consumer`, `background-task` et `recurring-task`).

`SHAPE_ALIASES` ramène des synonymes à un nom canonique (`rect`, `label` ► `rectangle`). Si draw.io écrit
la même forme de plusieurs façons, ajoutez l'alias à cet endroit plutôt que de multiplier les définitions.
Cas particulier : `swimlane` a un alias mais **aucune définition**, donc il s'affiche en placeholder.

Exemples réels à lire : [shapes/architecture/database/](../src/engine/plugins/shapes/architecture/database/index.ts),
[queue/](../src/engine/plugins/shapes/architecture/queue/index.ts) et
[distributed-cache/](../src/engine/plugins/shapes/architecture/distributed-cache/index.ts) (tracés draw.io en courbes de
Bézier, « bâtiments » iso à toit plat, façade propre à chacune dans son `facade.ts`, repli à plat avec le dessin 2D).
Elles étendent les génériques [generic/cylinder/](../src/engine/plugins/shapes/generic/cylinder/index.ts) (tracés de
cylindre) et [generic/building/](../src/engine/plugins/shapes/generic/building/index.ts) (toit, faces, gravures, étiquette).

Pour trouver le nom exact d'une forme, insérez-la dans draw.io, ouvrez « Modifier le style », ou consultez le panneau
**Diagnostics** de l'appli, qui liste les noms non reconnus avec leur nombre d'occurrences.

---

## 2. La définition

Le contrat fait foi : [core/shapes/types.ts](../src/engine/core/shapes/types.ts) (`ShapeDefinition`, avec la JSDoc de
chaque champ). Seuls `id` et `flat` sont obligatoires ; tout le reste a un repli générique. Dans le cas nominal, le nom
draw.io est l'`id` (`text`, `ellipse`) et il n'y a pas de `kinds` à écrire.

| Champ | Rôle | Défaut (absent) | Exemple |
|---|---|---|---|
| `id` | nom de l'interface en anglais = nom du dossier, accepté par `spatial.kind` | obligatoire | `database`, `rounded-rectangle` |
| `kinds` | formes draw.io gérées (`ShapeModel.kind`) | `[id]` | BDD : `cylinder3` |
| `matches(shape)` | condition en plus du nom draw.io (variante) | aucune condition | rectangle arrondi : `rounded=1` |
| `outline(shape, ctx)` | contour au sol, polygone fermé en coordonnées page | rectangle des bornes | losange, hexagone |
| `details(shape)` | dessin intérieur (tracés, textes) par-dessus le fond | aucun | barres du process (`generic/box`) |
| `contains(shape, point, ctx)` | clic et survol | dans le contour s'il y en a un, sinon les bornes | ellipse exacte, acteur (toute la hauteur) |
| `hitBounds(shape, ctx)` | emprise prise au clic quand la forme dessine hors de ses bornes | les bornes | onglet d'une région RDD |
| `selectionStyle` | mise en valeur imposée de la forme sélectionnée | celle de la page | région RDD : `none` |
| `multiSelectionStyle` | idem dans une sélection de plusieurs éléments | `selectionStyle` | région RDD : `outline` |
| `flat` | rendu 2D, repli de tous les autres niveaux (§ 3.1) | obligatoire | `flatBox(outline)` |
| `iso` | rendu des vues iso **et** 3D (§ 3.2) | `flat` (à plat au sol) | `isoBlock(outline)` |
| `volume` | réservé (extrusion, SPEC §17) : jamais demandé aujourd'hui | `flat` | — |
| `volumeHeight(shape, ctx)` | hauteur du volume propre à la forme (§ 3.2) | `blockHeight` | acteur |
| `textZone(shape, level, ctx)` | zone du texte (affichage et éditeur en place) | les bornes | BDD, file, cache, tables RDD |
| `editStyle(style)` | style de l'éditeur en place quand le label dessiné ne suit pas le style draw.io | le style de la forme | nom d'une région RDD sur son onglet |
| `minimap` | peintre de la mini-carte (§ 3.3) ; `null` = rien | contour rempli | texte : `null` ; acteur |
| `resizable` | poignées de redimensionnement | oui | groupe : non |
| `movedHandles(shape, ctx)` | poignées placées ailleurs que sur les bornes | sur les bornes | coin de l'onglet d'une région RDD |
| `connectable` | flèches accrochables | oui | groupe : non |
| `connectSides` | côtés qui ont une poignée de connexion | les quatre | table RDD : gauche et droite |
| `plainText` | texte brut, sans mise en forme ni panneau de format | non | table RDD : oui |
| `flippable` | retournements proposés dans le panneau « Orientation » (§ 1, `orientedPath`) | aucun | triangle, accolade |
| `rotatable` | pivot par quarts de tour dans le panneau | non | triangle, accolade |
| `pickable` | prise au clic et au rectangle de sélection | `always` | groupe : `withLink` (on prend ses formes) |
| `movesAsBlock` | saisir un enfant déplace la forme avec ses enfants | non | groupe : oui |
| `palette` | élément de la palette (§ 6) | absente de la palette | rectangle / rectangle arrondi, BDD / queue |
| `properties` | réglages propres à la forme, dans le panneau (§ 6) | aucun | « Coins arrondis », étiquette de façade |
| `swatch(style)` | aperçu dans les styles du panneau | rectangle (arrondi si `rounded=1`) | ellipse, cylindre |

Un rendu (`SceneRenderer`) n'a qu'une méthode : `create(shape, ctx)`, qui renvoie un `Object3D` en espace page
(section 5).

### Enregistrement : déposer le dossier

```
src/engine/plugins/shapes/      les formes, une par élément de la palette (sujet 286 : des plugins)
├── generic/                    bases à étendre (hors palette, hors registre)
│   ├── box/                    contour → rendu 2D + bloc iso (`roundable` : coins arrondis de draw.io ;
│   │                           `details` : dessin intérieur, traits et textes, sur le dessus en iso ;
│   │                           `label` : zone du texte 2D)
│   ├── stencil/                stencil embarqué : XML et rendu (box) tirés des mêmes points
│   ├── tagged-process/         process à tranche étiquetée (internalStorage + mot gris de bas en haut)
│   ├── cylinder/               tracés draw.io des cylindres, rendu 2D à lèvres
│   └── building/               bâtiment iso : toit, faces, gravures, étiquette
├── <catégorie>/                une catégorie de la palette par dossier (`geometry/`, `general/`, `architecture/`) :
│   │                           la liste des formes est le contenu du dossier (et SPEC §8.3)
│   └── <id>/                   ex. `architecture/database/`
│       ├── index.ts            export const definition: ShapeDefinition = { … }
│       └── facade.ts           sa façade iso (arcs gravés, étiquette « DB »)
└── categories.ts               catégories de la palette (nom, rang, réglages déclarés) ; une nouvelle catégorie s'y ajoute
src/engine/plugins/index.ts     racine de composition : collecte shapes/*/*/index.ts (import.meta.glob, sans generic/)
src/engine/core/shapes/         le tronc des formes
├── types.ts                    le contrat
├── registry.ts                 résolution forme → définition, replis génériques
├── placeholder.ts              repli des formes non supportées
├── minimapOutline.ts           repli de la mini-carte : le contour rempli
└── group.ts                    le groupe draw.io, hors palette (sans lui, un groupe ne se lit plus)
```

`SHAPE_DEFINITIONS` ([plugins/index.ts](../src/engine/plugins/index.ts)) importe tous les `shapes/*/*/index.ts` (et
`shapes/*/*/*/index.ts` pour une famille) et `createDefaultRegistry()` les enregistre après le groupe : **il n'y a
aucune liste à tenir à jour**. Plusieurs formes peuvent donc s'écrire en parallèle sans se marcher dessus. Un test
vérifie que l'`id` est le nom du dossier et que la catégorie de palette est celle du dossier.

- **Une forme contient tout ce qui la concerne**, en plusieurs fichiers si besoin (ex. `database/facade.ts`), y
  compris ses subtilités iso / 3D. Ce qu'elle partage avec d'autres vient d'une base de `generic/` ou d'une autre forme
  qu'elle étend ; les briques de rendu génériques restent dans le tronc (`core/render/flat`, `core/render/iso/block`,
  `core/render/geometry`). Une forme importe du tronc **seulement l'API des plugins**
  ([core/plugins/index.ts](../src/engine/core/plugins/index.ts), sujet 287) : règle complète des frontières dans
  `.claude/rules/coding.md` §5.
- **Étendre** : on reprend une définition et on change ce dont on a besoin.
  `rounded-rectangle` = `{ ...rectangle, id: 'rounded-rectangle', kinds: ['rectangle'], matches: rounded=1, palette }` ;
  une base générique se compose : `{ id: 'diamond', kinds: ['rhombus'], ...box(outline), palette }`.
- **Résolution**, de la plus précise à la plus générale (à égalité, la dernière enregistrée l'emporte) :
  1. une définition qui gère le nom draw.io et dont la condition `matches` est vérifiée (rectangle arrondi, queue) ;
  2. celle dont l'`id` est le nom de la forme (`spatial.kind=database`) ;
  3. une définition qui gère le nom draw.io sans condition (rectangle, BDD).
  Gardez `matches` rapide : elle est appelée pour chaque forme, à chaque construction de scène.
- Une forme enregistrée sort **automatiquement** du rapport « non supportées »
  ([diagnostics/unsupportedStyles.ts](../src/engine/core/diagnostics/unsupportedStyles.ts) appelle `registry.resolve`).
- `EngineOptions.registry` permet de passer un autre registre au moteur ; sinon, chaque moteur construit le sien
  (`createDefaultRegistry`, racine de composition `plugins/index.ts`). L'appli (palette, panneau) n'en voit qu'une
  vue en lecture seule (`engine.getShapeRegistry()`, sujet 304). Un id déjà pris est refusé à l'enregistrement : une
  forme ne remplace pas une autre. Une forme d'un mode a un id préfixé par celui du mode et ne déclare ni `kinds` ni
  `matches`. `ShapeRegistry` n'est **pas exporté** par l'API publique ([src/index.ts](../src/index.ts)) :
  une forme s'ajoute dans le moteur lui-même, pas depuis une application cliente.

### Le contour (`outline`)

C'est la géométrie de référence de la forme : un polygone fermé, en coordonnées **page** (x vers la droite, y vers le
bas, pixels draw.io). Il sert au rendu 2D (`flatBox`), aux volumes (`isoBlock`) et au repli de la mini-carte.
Utilisez les aides de [render/geometry/paths.ts](../src/engine/core/render/geometry/paths.ts) : `rectPath`,
`roundedRectPath`, `ellipsePath`, `arcPath`, `cornerRadius` (lit `rounded` et `arcSize`), `boxOutline` (rectangle,
arrondi avec `rounded=1`), `sizeOffset` (décalage `size` / `fixedSize` des formes à pans) ; pour l'orientation,
`orientation` et `orientedPath` ([render/geometry/orient.ts](../src/engine/core/render/geometry/orient.ts)) ; pour le
trait, `styleStroke` (couleur, opacité, épaisseur, pointillés). Pour qu'une forme se **retourne** ou **pivote**
depuis le panneau (section « Orientation », sujet 335), dessinez-la par `orientedPath` et déclarez
`flippable: { horizontal: true, vertical: true }` et / ou `rotatable: true` dans sa définition : sans cela, aucun
bouton (le texte, lui, ne se retourne ni ne pivote jamais).

Avant d'écrire un calcul, cherchez-le dans l'API des plugins
([core/plugins/index.ts](../src/engine/core/plugins/index.ts)), rangée par rubriques commentées : contrats ; modèle
neutre, attributs spatiaux et calculs purs ; briques de dessin (contours, traits, textes, couleurs) ; règles
d'édition partagées. Une brique qui manque s'y ajoute plutôt que d'être recopiée (sujets 307, 325).

Le contour est **retracé à chaque construction** de la forme. S'il est coûteux à calculer, mémorisez-le dans la
fonction, mais jamais entre deux formes : chaque forme a ses propres bornes.

### Ce que reçoit une forme

La forme reçue (`ShapeModel` de l'API des plugins) et le contexte de rendu (`RenderContext`, gelé pour la scène) sont
en lecture seule (sujet 303 ; gelés en dev et en test, sujet 312 : une écriture lève une exception, la forme est
alors dessinée en placeholder) : une forme dessine sans rien modifier ; pour un aperçu, elle crée une copie
(`{ ...shape, style: { ...shape.style, … } }`). Sa définition est gelée à l'enregistrement.

**Mesure du texte** (sujet 377) : une géométrie qui suit la largeur d'un texte (ex. onglet d'une région RDD) mesure
par `ctx.measureText(text, font)`, celle du moteur qui dessine : approchée tant que les polices ne sont pas chargées,
exacte ensuite (le moteur reconstruit alors ses scènes). Le contexte de rendu la porte, et les points d'entrée
géométriques (`outline`, `contains`, `hitBounds`, `textZone`, `movedHandles`) la reçoivent en dernier paramètre
(`MeasureContext`) : dessin, clic et poignées mesurent pareil. Pas de mesure globale : deux moteurs d'une page ont
chacun la leur. Ce qui se calcule sans moteur (taille d'un modèle de la palette) prend `approximateMeasure`.

### Une forme en panne

Le moteur appelle une forme par son registre, qui protège chaque appel (sujet 300 ; appel protégé commun aux formes,
modes et effets, `core/diagnostics/pluginCalls.ts`, sujet 378) : une fonction de la définition qui
lève une exception n'empêche ni d'ouvrir le fichier, ni de dessiner la page, ni de sélectionner ou d'éditer la forme.
Le point d'entrée est traité comme absent et l'erreur est signalée une fois par session dans les Diagnostics
(« Forme <id> : erreur dans <point d'entrée> ») :

| En panne | Repli |
|---|---|
| `matches` | la définition est ignorée pour cette forme (souvent : placeholder) |
| `flat.create`, `iso.create`, `volume.create` | le placeholder, au même niveau |
| `outline`, `contains`, `hitBounds`, `textZone` | les bornes de la forme |
| `volumeHeight` | l'épaisseur par défaut (`blockHeight`) |
| `editStyle` | le style de la forme, tel quel |
| `minimap` | les bornes, dans un contexte 2D remis comme avant |
| `swatch` | l'aperçu du rectangle |

---

## 3. Les rendus selon le mode de vue

| Mode de vue | Niveau demandé | Ce qui est appelé                          |
| ----------- | -------------- | ------------------------------------------ |
| 2D          | `flat`         | `definition.flat`                          |
| Iso         | `iso`          | `definition.iso ?? definition.flat`        |
| 3D          | `iso`          | idem iso (même scène, caméra en perspective) |
| Mini-carte  | —              | `definition.minimap ?? outlinePainter`     |

Trois subtilités :

- **La 3D utilise le niveau `iso`.** `Levels.requestedLevel()` (`core/domains/view/levels.ts`) ne demande jamais `volume`. Un rendu iso doit donc
  rester correct vu en perspective, sous tous les angles (rotation sur 360°, inclinaison jusqu'à
  `camera.maxTilt3dDeg`).
- **Si l'option « Formes en volume » est désactivée** (`view.isoVolume = false`), l'iso et la 3D demandent `flat`.
- **Une scène par niveau, seulement si nécessaire** : `effectiveLevel` réutilise la scène 2D en iso tant qu'aucune
  forme visible de la page n'a de rendu `iso`. Ajouter un rendu `iso` à une forme peut donc faire construire une
  seconde scène pour les pages qui la contiennent. C'est normal, et elles restent en cache (`preload.maxCachedPages`).

### 3.1 Rendu 2D (`flat`), obligatoire

Pour une forme « boîte » (fond + bordure + label), réutilisez `flatBox(outline, defaults)`
([render/flat/box.ts](../src/engine/core/render/flat/box.ts)). Elle lit `fillColor`, `strokeColor`, `strokeWidth`,
`dashed` / `dashPattern`, les opacités, puis place le label (`createLabel`). Pour ajouter un détail (pli, icône,
séparateur…), appelez `createBox` et ajoutez vos meshes au groupe renvoyé.

Le rendu 2D est aussi **le repli de tout le reste** : il doit être complet par lui-même.

### 3.2 Rendu iso / 3D (`iso`), optionnel

Pour un volume simple (prisme droit du contour), réutilisez `isoBlock(outline, defaults)`
([render/iso/block.ts](../src/engine/core/render/iso/block.ts)). Elle fournit :

- le **dessus** : fond opaque et rendu 2D surélevé (label, détails) ;
- les **côtés**, ombrés selon leur orientation (paramètres `view.shadeLight` et `view.shadeDark`) ;
- les **arêtes du volume**, avec la couleur, l'épaisseur et les pointillés de la bordure 2D : contour du dessus
  centré sur le bord (formes accolées : une seule ligne), contour du bas et arêtes verticales à l'extérieur. Les arêtes verticales ne sont tracées qu'aux angles vifs (> 30°), pas sur les courbes ;
- le **repli à plat** si la forme n'a pas de fond (`fillColor=none`) ou une épaisseur nulle.

Sans rendu `iso`, la forme reste **à plat au sol** en iso et en 3D, sans hauteur. Si elle est dans un conteneur en
volume, elle est quand même posée sur le dessus de ce conteneur (voir 3.4).

Pour un rendu iso sur mesure :

- **Coordonnées.** Le groupe est en espace page. `z` est la **hauteur au-dessus de la base**, en pixels de page.
  `createShapeObject` pose ensuite le groupe à sa base (`object.position.z = base`). Ne mettez donc pas l'élévation
  vous-même.
- **Hauteur.** Lisez-la avec `blockHeight(shape, ctx)`, pour respecter `spatial.height` et le réglage d'épaisseur.
  Écrivez la hauteur réelle dans `group.userData.height`. Si la forme a une hauteur par défaut qui lui est propre
  (ex. une forme qui serait aussi haute que large), déclarez-la dans `volumeHeight` **et** utilisez-la dans le
  rendu : l'empilement, la pastille de lien et la sélection passent par `registry.volumeHeight`, pas par le rendu.
  `blockHeight(shape, ctx, défaut)` garde `spatial.height` prioritaire.
- **Z-fighting.** Décalez légèrement ce qui est posé sur une face (`TOP_OFFSET = 0.05` dans `block.ts`).
- **Matériaux.** Les faces opaques avec test de profondeur doivent utiliser `solidMaterial`, pour que les blocs se
  cachent entre eux. Les traits et les fonds plats passent par `fillMesh` / `strokeMesh` (matériau sans écriture de
  profondeur).
- **Billboard.** Un élément qui doit toujours faire face à la caméra (silhouette de l'Actor) porte
  `userData.billboard = true` : avant chaque image, le moteur le tourne autour de la verticale pour que son axe −y
  vise la caméra (sa position en perspective, `render/billboard.ts`).
- **Silhouette debout.** Une forme dessinée debout face à la caméra (Actor) le déclare par `setStandingFigure(groupe,
  silhouette, figure)` de l'API des plugins (`render/standing.ts`, sujet 306) : cadre de la tête, pièces pleines et
  traits dans le plan de la silhouette, pancarte éventuelle et style de son texte. Le moteur s'en sert pour le clic
  (toute la hauteur, la silhouette seule), la mise en valeur de la tête et l'édition du texte sur la pancarte.
- **Volume « fantôme ».** Une forme sans fond ne doit pas produire de volume : renvoyez le rendu 2D.

### 3.3 Mini-carte

- **Absent** : `outlinePainter` remplit le contour avec `fillColor` (blanc par défaut) et un trait gris fin.
- **`null`** : rien n'est dessiné. C'est le choix pour le texte et les groupes, illisibles à cette échelle.
- **Peintre sur mesure** : `(brush, shape, map) => void`, avec `map.toMinimap(point)` et `map.scale` (pixels
  mini-carte par pixel de page). Le `brush` (`MinimapBrush`) n'a que `polygon(points, { fill?, stroke?, lineWidth? })`
  et `polyline(points, { stroke, lineWidth? })` (trait de 0,75 px par défaut) : la forme ne reçoit jamais le contexte
  2D, par lequel elle atteindrait le DOM. L'acteur dessine ses pièces en `polygon(part, { stroke })` et ses traits en
  `polyline(trait, { stroke })`. Le peintre ne reçoit **pas** le `RenderContext`, il n'a donc pas accès aux
  paramètres. C'est pour cette raison que le placeholder garde son gris par défaut dans la mini-carte.

### 3.4 Hauteurs, empilement, pastille de lien

C'est calculé par `volumeLayout` ([render/pageScene.ts](../src/engine/core/render/pageScene.ts)), pas par la définition :

- **épaisseur** : 0 sans rendu `iso` ou avec `fillColor=none` ; sinon `registry.volumeHeight(shape, ctx)` (la `volumeHeight` de la définition, sinon `blockHeight`) ;
- **base** : dessus du conteneur parent s'il est en volume, plus `spatial.elevation` ;
- **flèches** : à la hauteur de la plus haute de leurs extrémités ;
- **pastille de lien** : posée sur le dessus (`elevation.height + 0.1`). Si votre rendu n'est pas un prisme, elle
  sera posée à la hauteur déclarée, pas sur votre géométrie.

---

## 4. D'où vient chaque valeur

L'ordre de priorité est toujours le même : **le fichier d'abord, puis les paramètres de l'appli, puis les défauts
draw.io codés dans le moteur.**

| Valeur | 1. Fichier (style draw.io) | 2. Attribut d'objet | 3. Paramètre (`Settings`) | 4. Défaut moteur |
| --- | --- | --- | --- | --- |
| Fond | `fillColor` (`none` = rien, `default` = défaut) | — | — | `VERTEX_DEFAULTS.fill` `#ffffff` |
| Bordure | `strokeColor`, `strokeWidth`, `dashed`, `dashPattern` | — | — | `#000000`, 1 |
| Opacités | `opacity` × `fillOpacity` / `strokeOpacity` / `textOpacity` | — | — | 100 % |
| Texte | `fontColor`, `fontSize`, `fontStyle`, `align`, `verticalAlign`, `spacing*`, `whiteSpace` | — | — | noir, 11, centré |
| Fond du label | `labelBackgroundColor` (`default` = fond de la vue) | — | `background.color` | aucun |
| Épaisseur (iso) | `spatial.height` | `spatial.height` (`<UserObject>`) | `view.isoDepth` (toutes les formes) | 32 |
| Élévation | `spatial.elevation` | `spatial.elevation` | — | 0 |
| Ombrage des côtés | — | — | `view.shadeLight`, `view.shadeDark` | 0,9 / 0,62 |
| Étiquette de façade | `spatial.tag` (vide = aucune) | `spatial.tag` | `shapeCategories.architecture.facadeTags` (`ctx.values`, 4.1) | affichée |
| Pastille de lien | — | — | `selection.accentColor` | `#1a73e8` |

Règles à respecter :

- **Lisez le style avec les aides** de [model/styleValues.ts](../src/engine/core/model/styleValues.ts) (`styleNumber`,
  `styleFlag`, `styleOpacity`, `fontStyleValue`) et de [render/styleColors.ts](../src/engine/core/render/styleColors.ts)
  (`styleColor(style, clé, défaut)`, qui gère `none`, `default` et les couleurs invalides ; `styleStroke`), par l'API
  des plugins. Ne
  parsez pas les chaînes vous-même.
- **Attributs spatiaux** : passez par `spatialNumber(shape, SPATIAL.xxx)` / `spatialValue`
  ([spatial.ts](../src/engine/core/spatial.ts)), qui lisent le style **puis** les attributs de l'objet. Un nouvel
  attribut se déclare dans `SPATIAL`, avec le préfixe `spatial.`, que draw.io conserve (SPEC §14.3).
- **Défauts de fidélité** : les défauts propres à une forme draw.io (sa couleur, sa taille de pli…) restent des
  constantes de la définition. Ils doivent donner **le même rendu qu'à la réouverture dans draw.io** et ne vont pas
  dans les paramètres.
- **Paramètres de l'appli** : une valeur de ressenti ou de préférence (pas une valeur draw.io) va dans les paramètres.
  Voir 4.1.

### 4.1 Rendre une valeur réglable : déclarer `settings`

Un réglage global lu par des formes (une préférence, pas une valeur draw.io) est **déclaré par leur catégorie**, comme
les modes et les effets déclarent les leurs (sujet 380) : aucun fichier du tronc ni de l'appli à toucher.

1. Déclarez le réglage (`PluginSetting`, par l'API des plugins) près de la forme ou de la base qui le lit, et
   ajoutez-le aux `settings` de la catégorie dans
   [plugins/shapes/categories.ts](../src/engine/plugins/shapes/categories.ts). Mêmes types que pour un mode
   (`AJOUTER_UN_MODE.md` section 3) : nombre borné, case, couleur, choix, adresse ; `label`, `hint`, `group`.
   Exemple : `FACADE_TAGS_SETTING` dans [generic/building](../src/engine/plugins/shapes/generic/building/index.ts),
   déclaré par la catégorie Architecture.
2. Lisez la valeur dans `ctx.values` (contexte de rendu) : le registre y remet, à chaque forme dont la
   `palette.category` est cette catégorie, les valeurs bornées et complétées par le défaut. `ctx.values` est absent
   pour une forme d'une autre catégorie et dans les tests sans contexte complet : gardez un repli sur le défaut
   (`ctx.values?.[clé] === false`), ou utilisez `booleanValue` / `numberValue` / `stringValue` si la valeur est
   forcément là.

Le reste découle de la déclaration : la sous-page **Paramètres › Formes › <catégorie>** (générique, comme celle des
modes), l'enregistrement dans `settings.shapeCategories[catégorie][clé]` (seulement les écarts au défaut) et la
reconstruction des scènes quand la valeur change. Un réglage qui change de place garde la préférence enregistrée :
déclarez son ancienne clé par `legacy` (chemin depuis la racine des paramètres, ex. `view.facadeTags`), reprise au
chargement tant que la nouvelle n'a pas de valeur. Ne renommez jamais la clé d'un réglage déclaré : la préférence
serait perdue.

Une valeur commune à toutes les formes (épaisseur `view.isoDepth`, ombrage des côtés) reste un paramètre du tronc,
passé par un champ du `RenderContext` rempli par `SceneView.renderContext()`
([core/domains/view/scene.ts](../src/engine/core/domains/view/scene.ts)) : ce n'est plus le travail d'une forme
(SPEC §13).

---

## 5. Contraintes du moteur sur l'objet renvoyé

Le moteur manipule l'`Object3D` renvoyé par `create` après coup. Pour que tout fonctionne :

- **Nom** : `shape:<id>` sur le groupe racine (convention des formes existantes). Le moteur ajoute
  `userData.elementId` lui-même.
- **Ordre de dessin** : chaque élément de la page a 4 places (`PARTS_PER_ELEMENT`). Utilisez
  `PART_ORDER.fill` (0), `.stroke` (1) et `.label` (2) pour les sous-parties. Le moteur ajoute ensuite
  `rang × 4`. Ne dépassez pas 3, sinon vous passez devant l'élément suivant.
- **Fonction pure de (forme, contexte)** : pas d'état global ni de cache entre formes. La même fonction sert à la
  construction de la page, à la reconstruction d'une seule forme pendant un redimensionnement
  (`rebuildShapeObject`) et après chaque modification du fichier.
- **Matériaux propres à chaque mesh** : `disposeObject` libère géométries **et matériaux** quand une scène est jetée.
  Un matériau partagé entre formes (constante de module) serait libéré une fois, puis réutilisé cassé. Créez-les
  avec `solidMaterial` / `fillMesh` / `strokeMesh`. Seul le texte troika partage un matériau de
  base, et c'est géré par sa fabrique.
- **Opacité et voile** : le fondu entre pages et les bascules (`setPageOpacity`) et le voile de sélection
  (`liftAboveVeil`) parcourent votre objet. Ils mémorisent l'opacité et l'ordre de dessin de chaque mesh et les
  restaurent ensuite. Un objet ajouté **plus tard**, de façon asynchrone, échappe à cette restauration : c'est le bug
  corrigé pour le fond des labels (`followRenderOrder`, [render/renderOrder.ts](../src/engine/core/render/renderOrder.ts)).
  Si votre forme ajoute un enfant après coup (texture chargée, texte mis en page), son ordre de dessin doit suivre
  celui de son parent.
- **Textes** : passez toujours par `ctx.text.create(spec)` (ou `createLabel`), jamais par troika directement. Les
  tests injectent une fabrique factice, et le moteur gère polices, mise en page asynchrone et redessin.

---

## 6. En dehors du rendu

Tout passe par la définition : le moteur et l'appli interrogent le registre (`registry.contains`, `isResizable`,
`isConnectable`, `isPickable`, `movesAsBlock`, `templates`, `templateOf`, `swatch`, `properties`), jamais le nom d'une
forme.

Les champs concernés (clic, poignées, accroche des flèches, texte brut, prise, déplacement, palette, aperçu, réglages)
sont dans le tableau de la section 2, avec leur défaut et un exemple.

Un élément de palette (`PaletteEntry`, exposé comme `ShapeTemplate` avec l'`id` de la forme) porte le style **et** la taille par défaut de draw.io, une catégorie, un rang
`order` (ordre d'affichage, toutes formes confondues), des mots-clés de recherche et une icône (contenu SVG d'un cadre
`0 0 40 28`, sans couleurs). Un réglage (`ShapeProperty`) est une case (`toggle`, écrit `1` / `0`), un nombre ou un
texte ; une clé `spatial.…` est écrite comme attribut spatial, et sa constante vit dans la forme (le tronc n'en connaît
aucune, sujet 306). Un texte `live: true` est réglé en direct : chaque frappe est écrite en une seule étape
d'annulation et seule la forme est redessinée (ex. étiquette des façades). Sa `section` le range dans le panneau :

- `shape` : **paramètre de l'instance**, dans la section de la forme elle-même, titrée de son nom de palette et placée
  sous « Texte » (absente si la forme n'en déclare pas). C'est la place des valeurs propres à chaque forme posée, ex.
  le mot de la tranche d'un process étiqueté (`spatial.tag`, vide = le mot par défaut de la forme) ;
- `border` ou `volume` : réglage qui précise ces sections communes (« Coins arrondis », nœuds du cache, étiquette
  de façade).

Restent hors de la définition, parce que ce sont des règles du format draw.io et non d'une forme :

| Aspect | Où | Comportement |
| --- | --- | --- |
| Accroche des flèches : périmètre | `perimeterKind` dans [render/edges/route/perimeters/index.ts](../src/engine/core/render/edges/route/perimeters/index.ts) | `perimeter=…`, sinon style nommé (`ellipse`, `rhombus`, `triangle`), sinon **rectangle** ; à porter de draw.io (mxPerimeter) si la forme en a un propre (un périmètre polygonal : son contour dans `perimeterPolygon`, ex. `hexagonPerimeter2`) |
| Nom de la forme | `SHAPE_ALIASES` dans [format/style.ts](../src/engine/core/format/style.ts) | synonymes draw.io (`rect`, `label` ► `rectangle`) |
| Position du label | `createLabel` | `labelPosition` / `verticalLabelPosition` gérés par le registre (`textZone`) |
| Conteneurs en volume | `volumeLayout` | un conteneur en volume porte ses enfants (3.4) |

---

## 7. Exemple : la note à coin plié (`shape=note`)

draw.io : `shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;size=15;` (il y en a une dans
`docs/test.drawio`).

```ts
// src/engine/plugins/shapes/geometry/note/index.ts
import {
  createBox,
  isoBlock,
  PART_ORDER,
  strokeMesh,
  styleColor,
  styleNumber,
  styleOpacity,
  VERTEX_DEFAULTS,
} from '../../../../core/plugins';
import type { Point, ShapeDefinition, ShapeModel } from '../../../../core/plugins';

/** Taille du pli par défaut dans draw.io (`size`). */
const DEFAULT_FOLD = 30;

const fold = (shape: ShapeModel) =>
  Math.min(styleNumber(shape.style, 'size', DEFAULT_FOLD), shape.bounds.width, shape.bounds.height);

/** Contour : rectangle au coin haut-droit coupé. */
function outline(shape: ShapeModel): Point[] {
  const { x, y, width, height } = shape.bounds;
  const s = fold(shape);
  return [
    { x, y },
    { x: x + width - s, y },
    { x: x + width, y: y + s },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/** Note à coin plié (SPEC §8.3) : contour coupé, pli tracé, volume en iso. */
export const definition: ShapeDefinition = {
  id: 'note', // nom draw.io = nom de l'interface : pas de `kinds` à écrire
  outline,
  flat: {
    create(shape, ctx) {
      const box = createBox(shape, outline(shape), ctx, VERTEX_DEFAULTS);
      // Le pli : même couleur et même épaisseur que la bordure.
      const { x, y, width } = shape.bounds;
      const s = fold(shape);
      const color = styleColor(shape.style, 'strokeColor', VERTEX_DEFAULTS.stroke);
      const crease = color
        ? strokeMesh(
            [
              { x: x + width - s, y },
              { x: x + width - s, y: y + s },
              { x: x + width, y: y + s },
            ],
            color,
            styleOpacity(shape.style, 'strokeOpacity'),
            { width: styleNumber(shape.style, 'strokeWidth', 1), closed: false },
          )
        : null;
      if (crease) {
        crease.renderOrder = PART_ORDER.stroke;
        box.add(crease);
      }
      return box;
    },
  },
  // Volume : prisme du contour coupé ; le dessus reprend le rendu 2D (avec le pli).
  iso: isoBlock(outline),
  // Mini-carte : le contour rempli (repli par défaut), rien à écrire.
  // Palette : le modèle de draw.io (style et taille), rangée après les formes de la Géométrie (rang libre).
  palette: {
    name: 'Note',
    category: 'geometry',
    order: 200,
    keywords: ['note', 'post-it', 'mémo'],
    style: 'shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;size=15;',
    value: '',
    width: 80,
    height: 100,
    icon: '<path d="M10 3h14l6 6v16H10zM24 3v6h6"/>',
  },
  // Aperçu des styles : la note plutôt que le rectangle par défaut.
  swatch: () => '<path d="M8 5h18l6 6v12H8zM26 5v6h6"/>',
};
```

Attention : `isoBlock` construit son dessus avec `createBox`, pas avec votre `flat.create`. Dans cet exemple, le pli
n'apparaît donc **pas** sur le dessus du bloc. Pour l'avoir, écrivez un `iso.create` qui appelle
`isoBlock(outline).create(shape, ctx)`, puis ajoutez le pli à `group.userData.height + 0.05`.

Enfin :

1. rien à enregistrer : le dossier `shapes/geometry/note/` suffit (palette, panneau et rendu la trouvent ; voir
   l'encadré du début pour les cas qui touchent encore le tronc) ;
2. ajoutez `note` dans le tableau de SPEC §8.3 ;
3. écrivez les tests (section 8).

---

## 8. Tests

**Orientation et contour contre draw.io.** Dessinez le contour dans le cadre local avec `orientedPath`
([render/geometry/orient.ts](../src/engine/core/render/geometry/orient.ts)), qui reproduit `direction`, `flipH` / `flipV`
comme draw.io, puis ajoutez la forme et ses variantes à la fixture `shapes.drawio`
([tests/engine/plugins/shapes/shapesFixture.test.ts](../tests/engine/plugins/shapes/shapesFixture.test.ts)) :
`make drawio-check` la fait exporter en SVG par draw.io et compare chaque contour et chaque flèche au pixel près.


Les rendus se testent sans navigateur, avec une fabrique de texte factice. Modèles à suivre :
[tests/engine/core/render/pageScene.test.ts](../tests/engine/core/render/pageScene.test.ts) (2D),
[volume.test.ts](../tests/engine/core/render/volume.test.ts) (iso),
[levels.test.ts](../tests/engine/core/render/levels.test.ts) (niveaux et replis).

```ts
const texts: TextSpec[] = [];
const ctx: RenderContext = {
  text: { create: (spec) => (texts.push(spec), Object.assign(new Object3D(), { userData: { spec } })) },
  volume: { depth: 20 },
};
const page = parseDrawio(fixture('note.drawio')).pages[0]!;
const scene = buildPageScene(page, createDefaultRegistry(), ctx, 'iso');
```

À couvrir au minimum :

- la forme est **supportée** : `registry.resolve(shape).supported === true`, et elle n'apparaît plus dans
  `collectUnsupported` ; le contrat commun (`id` = dossier, palette valide et reconnue…) est vérifié pour toutes les
  formes par [tests/engine/core/shapes/registry.test.ts](../tests/engine/core/shapes/registry.test.ts) ;
- **2D** : contour attendu (bornes du mesh `fill`), couleurs lues du style, label présent avec les bonnes valeurs ;
- **iso** : bloc de `0` à l'épaisseur (`spatial.height` respecté), repli à plat avec `fillColor=none` ;
- **replis** : `sceneRenderer(shape, 'volume')` renvoie le rendu `iso` ou `flat` attendu ;
- **fixture** : un petit fichier `tests/fixtures/<forme>.drawio` **enregistré par draw.io** (pas écrit à la main),
  pour coller à ce que draw.io produit vraiment. `make drawio-check` le réenregistre avec draw.io et vérifie la
  conservation.

Ensuite, vérifiez dans l'appli (`make dev`) : 2D, iso, 3D (rotation complète), sélection (voile et contour),
mini-carte, redimensionnement, flèches reliées, et réouverture du fichier dans draw.io.

---

## 9. Récapitulatif

- [ ] Nom de forme identifié (Diagnostics) ; alias dans `SHAPE_ALIASES` si besoin
- [ ] `plugins/shapes/<catégorie>/<id>/index.ts` qui exporte `definition` : `id` (nom de l'interface), `kinds` si le nom
      draw.io diffère, `outline`, `flat` (complet à lui seul) ; une variante étend sa forme avec `matches`
- [ ] `iso` (souvent `isoBlock(outline)`), à vérifier aussi en 3D et sous tous les angles
- [ ] `minimap` : défaut, `null` ou peintre sur mesure
- [ ] Valeurs lues avec `styleValues` / `styleColors` / `spatialNumber` ; défauts draw.io en constantes ; préférences via `RenderContext`
- [ ] Ordres de dessin dans `PART_ORDER`, matériaux propres à chaque mesh, enfants tardifs qui suivent leur parent
- [ ] Tout ce qui est propre à la forme (iso / 3D compris) dans son dossier ; ce qu'elle partage vient de `generic/`
- [ ] Interaction si elle diffère du défaut : `contains`, `resizable`, `connectable`, `pickable`, `movesAsBlock`
- [ ] Périmètre d'accroche des flèches (`perimeterKind`) si draw.io lui en donne un propre
- [ ] `palette` si la forme doit être créable (une variante = une forme qui étend la sienne) ; `swatch`, `properties`
- [ ] Tests, fixture enregistrée par draw.io, SPEC §8.3 (et §13 si un paramètre a été ajouté)
