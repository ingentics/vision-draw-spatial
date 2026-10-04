# Ajouter une forme au moteur

Guide pour faire dessiner au moteur une forme draw.io qu'il ne connaît pas encore (aujourd'hui affichée en
placeholder gris). Il couvre les quatre rendus (2D, iso, 3D, mini-carte), l'origine de chaque valeur (style draw.io,
attributs `spatial.*`, paramètres) et ce qu'il faut vérifier en dehors du rendu : clic, flèches, sélection, édition,
diagnostics.

Références : SPEC §8.2 (registre), §8.3 (formes supportées), §8.4 (placeholder), §9.1 (volumes), §13 (paramètres).

---

## 1. Le parcours d'une forme

```
fichier .drawio
  └─ format/parse.ts ── style « shape=note;fillColor=#fff2cc;… »
        └─ format/style.ts  resolveShapeKind() ──► ShapeModel.kind = 'note'
              └─ render/shapes/registry.ts  ShapeRegistry.resolve(shape)
                    ├─ définition trouvée (supported: true)
                    └─ sinon placeholderShape (supported: false ► panneau Diagnostics)
                          └─ render/pageScene.ts  createShapeObject(shape, registry, ctx, level, elevation)
                                ├─ definition[level] ?? definition.flat   ► Object3D de la forme
                                ├─ pastille de lien posée sur le dessus
                                └─ hauteur (base), ordre de dessin, userData.elementId
```

Le moteur ne connaît que l'interface `ShapeDefinition` ([render/shapes/types.ts](../src/engine/render/shapes/types.ts)).
Ajouter une forme revient donc à **écrire une définition et l'enregistrer**. Ni la scène, ni la caméra, ni
l'édition ne changent, sauf pour les points de la section 6.

### Le nom de la forme (`kind`)

`resolveShapeKind` ([format/style.ts](../src/engine/format/style.ts)) choisit, dans cet ordre :

1. `shape=…` explicite (`shape=cylinder3` ► `'cylinder3'`, `shape=mxgraph.aws4.lambda` ► tel quel) ;
2. sinon le premier nom de style sans valeur (`ellipse;whiteSpace=wrap;` ► `'ellipse'`) ;
3. sinon `'rectangle'` (forme par défaut de draw.io).

Un stencil embarqué (`shape=stencil(<XML compressé>)`) prend le nom `stencil:<nom>` de son `<shape name="…">` : c'est
la façon d'ajouter une forme que draw.io n'a pas, tout en restant dessinée par draw.io (exemple :
[render/shapes/plug.ts](../src/engine/render/shapes/plug.ts), XML tiré du même contour que le moteur).

`SHAPE_ALIASES` ramène des synonymes à un nom canonique (`rect`, `label` ► `rectangle`). Si draw.io écrit
la même forme de plusieurs façons, ajoutez l'alias à cet endroit plutôt que de multiplier les définitions.
Cas particulier : `swimlane` a un alias mais **aucune définition**, donc il s'affiche en placeholder.

Exemples réels à lire : [render/shapes/storage.ts](../src/engine/render/shapes/storage.ts) (BDD, file, cache : tracés
draw.io en courbes de Bézier, « bâtiments » iso à toit plat et façade par type [render/iso/buildings.ts](../src/engine/render/iso/buildings.ts),
repli à plat avec le dessin 2D).

Pour trouver le nom exact d'une forme, insérez-la dans draw.io, ouvrez « Modifier le style », ou consultez le panneau
**Diagnostics** de l'appli, qui liste les noms non reconnus avec leur nombre d'occurrences.

---

## 2. La définition

```ts
interface ShapeDefinition {
  kind: string;                            // nom canonique (ShapeModel.kind)
  matches?(shape: ShapeModel): boolean;    // correspondance plus fine (défaut : kind === shape.kind)
  outline?(shape: ShapeModel): Point[];    // contour au sol, polygone fermé, coordonnées page
  flat: SceneRenderer;                     // OBLIGATOIRE : 2D, et repli de tous les autres niveaux
  iso?: SceneRenderer;                     // vues iso ET 3D (voir § 3)
  volume?: SceneRenderer;                  // réservé (extrusion, SPEC §17) : jamais demandé aujourd'hui
  volumeHeight?(shape, ctx): number;       // hauteur par défaut propre à la forme (défaut : blockHeight)
  minimap?: MinimapPainter | null;         // absent = contour rempli ; null = rien
}

interface SceneRenderer {
  create(shape: ShapeModel, ctx: RenderContext): Object3D;
}
```

### Enregistrement

Dans `createDefaultRegistry()` ([render/shapes/registry.ts](../src/engine/render/shapes/registry.ts)) :

```ts
return new ShapeRegistry()
  .register(rectangleShape)
  .register(ellipseShape)
  .register(textShape)
  .register(groupShape)
  .register(noteShape); // ◄
```

- **La dernière définition enregistrée gagne.** Pour surcharger une forme existante (par exemple un rectangle
  particulier repéré par `matches`), enregistrez-la après.
- `matches` sert quand `kind` ne suffit pas : par exemple `shape.kind === 'rectangle' && shape.style.rounded === '1'`.
  Gardez cette fonction rapide, elle est appelée pour chaque forme, à chaque construction de scène.
- Une forme enregistrée sort **automatiquement** du rapport « non supportées »
  ([diagnostics/unsupportedStyles.ts](../src/engine/diagnostics/unsupportedStyles.ts) appelle `registry.resolve`).
- `EngineOptions.registry` permet de passer un autre registre au moteur. En revanche, `ShapeRegistry` et
  `createDefaultRegistry` ne sont **pas exportés** par l'API publique ([src/index.ts](../src/index.ts)) : pour
  l'instant, une forme s'ajoute dans le moteur lui-même, pas depuis une application cliente.

### Le contour (`outline`)

C'est la géométrie de référence de la forme : un polygone fermé, en coordonnées **page** (x vers la droite, y vers le
bas, pixels draw.io). Il sert au rendu 2D (`flatBox`), aux volumes (`isoBlock`) et au repli de la mini-carte.
Utilisez les aides de [render/geometry/paths.ts](../src/engine/render/geometry/paths.ts) : `rectPath`,
`roundedRectPath`, `ellipsePath`, `cornerRadius` (lit `rounded` et `arcSize`).

Le contour est **retracé à chaque construction** de la forme. S'il est coûteux à calculer, mémorisez-le dans la
fonction, mais jamais entre deux formes : chaque forme a ses propres bornes.

---

## 3. Les rendus selon le mode de vue

| Mode de vue | Niveau demandé | Ce qui est appelé                          |
| ----------- | -------------- | ------------------------------------------ |
| 2D          | `flat`         | `definition.flat`                          |
| Iso         | `iso`          | `definition.iso ?? definition.flat`        |
| 3D          | `iso`          | idem iso (même scène, caméra en perspective) |
| Mini-carte  | —              | `definition.minimap ?? outlinePainter`     |

Trois subtilités :

- **La 3D utilise le niveau `iso`.** `Engine.requestedLevel()` ne demande jamais `volume`. Un rendu iso doit donc
  rester correct vu en perspective, sous tous les angles (rotation sur 360°, inclinaison jusqu'à
  `camera.maxTilt3dDeg`).
- **Si l'option « Formes en volume » est désactivée** (`view.isoVolume = false`), l'iso et la 3D demandent `flat`.
- **Une scène par niveau, seulement si nécessaire** : `effectiveLevel` réutilise la scène 2D en iso tant qu'aucune
  forme visible de la page n'a de rendu `iso`. Ajouter un rendu `iso` à une forme peut donc faire construire une
  seconde scène pour les pages qui la contiennent. C'est normal, et elles restent en cache (`preload.maxCachedPages`).

### 3.1 Rendu 2D (`flat`), obligatoire

Pour une forme « boîte » (fond + bordure + label), réutilisez `flatBox(outline, defaults)`
([render/flat/box.ts](../src/engine/render/flat/box.ts)). Elle lit `fillColor`, `strokeColor`, `strokeWidth`,
`dashed` / `dashPattern`, les opacités, puis place le label (`createLabel`). Pour ajouter un détail (pli, icône,
séparateur…), appelez `createBox` et ajoutez vos meshes au groupe renvoyé.

Le rendu 2D est aussi **le repli de tout le reste** : il doit être complet par lui-même.

### 3.2 Rendu iso / 3D (`iso`), optionnel

Pour un volume simple (prisme droit du contour), réutilisez `isoBlock(outline, defaults)`
([render/iso/block.ts](../src/engine/render/iso/block.ts)). Elle fournit :

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
  cachent entre eux. Les traits et les fonds plats utilisent `flatMaterial` (sans écriture de profondeur).
- **Billboard.** Un élément qui doit toujours faire face à la caméra (comme les arêtes verticales des blocs) porte
  `userData.billboard = true` : le moteur le tourne avec la vue.
- **Volume « fantôme ».** Une forme sans fond ne doit pas produire de volume : renvoyez le rendu 2D.

### 3.3 Mini-carte

- **Absent** : `outlinePainter` remplit le contour avec `fillColor` (blanc par défaut) et un trait gris fin.
- **`null`** : rien n'est dessiné. C'est le choix pour le texte et les groupes, illisibles à cette échelle.
- **Peintre sur mesure** : `(context, shape, map) => void` en Canvas 2D, avec `map.toMinimap(point)` et `map.scale`
  (pixels mini-carte par pixel de page). Le peintre ne reçoit **pas** le `RenderContext`, il n'a donc pas accès aux
  paramètres. C'est pour cette raison que le placeholder garde son gris par défaut dans la mini-carte.

### 3.4 Hauteurs, empilement, pastille de lien

C'est calculé par `volumeLayout` ([render/pageScene.ts](../src/engine/render/pageScene.ts)), pas par la définition :

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
| Pastille de lien | — | — | `selection.accentColor` | `#1a73e8` |

Règles à respecter :

- **Lisez le style avec les aides** de [render/styleValues.ts](../src/engine/render/styleValues.ts) :
  `styleColor(style, clé, défaut)` gère `none`, `default` et les couleurs invalides ; `styleNumber`, `styleFlag`,
  `styleOpacity`, `fontStyleBits`, `labelBackground`. Ne parsez pas les chaînes vous-même.
- **Attributs spatiaux** : passez par `spatialNumber(shape, SPATIAL.xxx)` / `spatialValue`
  ([spatial.ts](../src/engine/spatial.ts)), qui lisent le style **puis** les attributs de l'objet. Un nouvel
  attribut se déclare dans `SPATIAL`, avec le préfixe `spatial.`, que draw.io conserve (SPEC §14.3).
- **Défauts de fidélité** : les défauts propres à une forme draw.io (sa couleur, sa taille de pli…) restent des
  constantes de la définition. Ils doivent donner **le même rendu qu'à la réouverture dans draw.io** et ne vont pas
  dans les paramètres.
- **Paramètres de l'appli** : une valeur de ressenti ou de préférence (pas une valeur draw.io) va dans les paramètres.
  Voir 4.1.

### 4.1 Rendre une valeur réglable

Les paramètres sont la source de vérité ([engine/settings.ts](../src/engine/settings.ts)). Un renderer n'y accède
jamais directement : tout passe par le **`RenderContext`**, construit par `Engine.renderContext()`.

1. Ajoutez le champ dans l'interface de section (ex. `ShapeSettings`), dans `DEFAULT_SETTINGS`, dans `SETTINGS_LIMITS`
   pour un nombre, et dans `mergeSettings` (`num`, `color`, `bool` ou `oneOf` : une valeur invalide est ignorée).
2. Ajoutez le champ dans `RenderContext` ([render/types.ts](../src/engine/render/types.ts)), **optionnel**, avec un
   repli sur la constante dans le renderer (`ctx.monChamp ?? DEFAUT`). Les tests et les appels sans contexte complet
   continuent ainsi de fonctionner.
3. Remplissez-le dans `Engine.renderContext()`.
4. **Faites reconstruire les scènes** quand il change : dans `Engine.updateSettings`, la condition qui appelle
   `rebuildScenes()`. Une section entière se surveille avec `changed('shapes')`. C'est l'oubli le plus fréquent :
   sans cette ligne, le réglage ne s'applique qu'aux pages construites ensuite.
5. Ajoutez le champ au panneau ([app/SettingsPanel.tsx](../src/app/SettingsPanel.tsx)), dans la bonne section et
   sous-section. La recherche le trouve d'elle-même.
6. Mettez à jour SPEC §13 et `tests/engine/settings.test.ts`.

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
  avec `flatMaterial` / `solidMaterial` / `fillMesh` / `strokeMesh`. Seul le texte troika partage un matériau de
  base, et c'est géré par sa fabrique.
- **Opacité et voile** : le fondu entre pages et les bascules (`setPageOpacity`) et le voile de sélection
  (`liftAboveVeil`) parcourent votre objet. Ils mémorisent l'opacité et l'ordre de dessin de chaque mesh et les
  restaurent ensuite. Un objet ajouté **plus tard**, de façon asynchrone, échappe à cette restauration : c'est le bug
  corrigé pour le fond des labels (`followRenderOrder`, [render/renderOrder.ts](../src/engine/render/renderOrder.ts)).
  Si votre forme ajoute un enfant après coup (texture chargée, texte mis en page), son ordre de dessin doit suivre
  celui de son parent.
- **Textes** : passez toujours par `ctx.text.create(spec)` (ou `createLabel`), jamais par troika directement. Les
  tests injectent une fabrique factice, et le moteur gère polices, mise en page asynchrone et redessin.

---

## 6. En dehors du rendu

Ces points ne passent pas par la définition, et il faut les vérifier pour toute forme qui n'est ni un rectangle ni
une ellipse.

| Aspect | Où | Comportement actuel | À faire pour une forme non rectangulaire |
| --- | --- | --- | --- |
| Clic, survol | `shapeContains` dans [interaction/pick.ts](../src/engine/interaction/pick.ts) | rectangle et ellipse exacts ; sinon le **contour** (`outline`) de la définition | Rien : fournir un `outline` suffit (les coins vides d'un losange ne se cliquent pas). |
| Accroche des flèches | `perimeterKind` dans [render/edges/route.ts](../src/engine/render/edges/route.ts) | périmètre de draw.io : `perimeter=…`, sinon style nommé (`ellipse`, `rhombus`), sinon **rectangle** | Porter le périmètre de draw.io de la forme (mxPerimeter, ou celui de draw.io) s'il en a un ; sinon draw.io lui-même s'arrête sur le rectangle. |
| Poignées, redimensionnement | [edit/handles.ts](../src/engine/edit/handles.ts) | sur les **bornes**, sans `aspect=fixed` | Rien d'obligatoire ; à noter si la forme doit garder ses proportions. |
| Création | palette, [edit/palette.ts](../src/engine/edit/palette.ts) | 8 formes | Ajouter un modèle (style **et** taille par défaut de draw.io) si la forme doit être créable. |
| Position du label | `createLabel` | dans les bornes (`align`, `verticalAlign`, `spacing*`) | `labelPosition` / `verticalLabelPosition` (label **hors** de la forme, ex. `umlActor`) ne sont pas gérés : à ajouter à `createLabel` s'il le faut. |
| Groupes et conteneurs | `moveTarget`, `collectMoveSet` | un groupe déplace son contenu | Rien de spécial. Un conteneur en volume porte ses enfants (3.4). |

---

## 7. Exemple : la note à coin plié (`shape=note`)

draw.io : `shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;size=15;` (il y en a une dans
`docs/test.drawio`).

```ts
// src/engine/render/shapes/note.ts
import type { Point, ShapeModel } from '../../model/types';
import { createBox, VERTEX_DEFAULTS } from '../flat/box';
import { isoBlock } from '../iso/block';
import { strokeMesh } from '../meshes';
import { styleColor, styleNumber, styleOpacity } from '../styleValues';
import { PART_ORDER } from '../types';
import type { ShapeDefinition } from './types';

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
export const noteShape: ShapeDefinition = {
  kind: 'note',
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
};
```

Attention : `isoBlock` construit son dessus avec `createBox`, pas avec votre `flat.create`. Dans cet exemple, le pli
n'apparaît donc **pas** sur le dessus du bloc. Pour l'avoir, écrivez un `iso.create` qui appelle
`isoBlock(outline).create(shape, ctx)`, puis ajoutez le pli à `group.userData.height + 0.05`.

Enfin :

1. enregistrez `noteShape` dans `createDefaultRegistry()` ;
2. ajoutez `note` dans le tableau de SPEC §8.3 ;
3. écrivez les tests (section 8).

---

## 8. Tests

**Orientation et contour contre draw.io.** Dessinez le contour dans le cadre local avec `orientedPath`
([render/geometry/orient.ts](../src/engine/render/geometry/orient.ts)), qui reproduit `direction`, `flipH` / `flipV`
comme draw.io, puis ajoutez la forme et ses variantes à la fixture `shapes.drawio`
([tests/engine/render/shapes/shapesFixture.test.ts](../tests/engine/render/shapes/shapesFixture.test.ts)) :
`make drawio-check` la fait exporter en SVG par draw.io et compare chaque contour et chaque flèche au pixel près.


Les rendus se testent sans navigateur, avec une fabrique de texte factice. Modèles à suivre :
[tests/engine/render/pageScene.test.ts](../tests/engine/render/pageScene.test.ts) (2D),
[volume.test.ts](../tests/engine/render/volume.test.ts) (iso),
[levels.test.ts](../tests/engine/render/levels.test.ts) (niveaux et replis).

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
  `collectUnsupported` ;
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
- [ ] `render/shapes/<forme>.ts` : `kind`, `outline`, `flat` (complet à lui seul)
- [ ] `iso` (souvent `isoBlock(outline)`), à vérifier aussi en 3D et sous tous les angles
- [ ] `minimap` : défaut, `null` ou peintre sur mesure
- [ ] Valeurs lues avec `styleValues` / `spatialNumber` ; défauts draw.io en constantes ; préférences via `RenderContext`
- [ ] Ordres de dessin dans `PART_ORDER`, matériaux propres à chaque mesh, enfants tardifs qui suivent leur parent
- [ ] Enregistrée dans `createDefaultRegistry()`
- [ ] Clic (`shapeContains`) et accroche des flèches (`toTerminal`) si la forme n'est pas rectangulaire
- [ ] Modèle de palette si la forme doit être créable
- [ ] Tests, fixture enregistrée par draw.io, SPEC §8.3 (et §13 si un paramètre a été ajouté)
