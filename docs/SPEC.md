# Spécification — Drawio Spatial

> Un viewer puis éditeur de fichiers draw.io dans un environnement spatial (2D/3D), pensé comme un composant React réutilisable.
> Document destiné à servir de référence pour l'implémentation avec Claude Code.

---

## 1. Vision

L'objectif est de pouvoir **poser des idées de manière spatiale** (schémas techniques, architecture, modélisation d'objets, documentation) en partant du format draw.io, sans le remplacer.

Principe fondateur : **la 3D est un mode, pas une rupture.** En vue de dessus, caméra orthographique, sans perspective, l'utilisateur retrouve l'expérience draw.io classique. En inclinant la caméra, le même schéma devient une projection isométrique posée « au sol », dans laquelle on peut se déplacer.

Autrement dit : on ajoute un mode 3D à draw.io, tout en restant 100 % compatible avec le format et l'application d'origine.

---

## 2. Périmètre global

| Milestone | Contenu | Statut |
|---|---|---|
| M1 — Viewer | Ouvrir, afficher, naviguer, suivre les liens entre pages | Prioritaire |
| M2 — Editor | Créer, déplacer, modifier des formes, sauvegarder en `.drawio` compatible | Second temps |
| M3 — Packaging | Composant React publiable, wrapper Electron/Tauri | Plus tard |

Hors périmètre initial : collaboration temps réel, export image/PDF, rendu volumique des formes (extrusion), optimisation mémoire avancée.

---

## 3. Choix techniques

### 3.1 Stack

- **TypeScript** strict partout.
- **Three.js** pour le rendu.
- **React** uniquement pour l'enveloppe UI et le composant final.
- **Vite** pour le dev/build.
- **Vitest** pour les tests unitaires et d'aller-retour XML.
- **pako** (ou équivalent) pour la décompression des diagrammes draw.io.
- **@xmldom/xmldom** pour le XML : même arbre DOM dans le navigateur et sous Node (tests), base de l'écriture in situ en M2.
- **troika-three-text** pour le texte (SDF), avec la police **Roboto** embarquée (voir §8.5).

### 3.2 Règle d'architecture n°1 : moteur indépendant de React

Tout le moteur (parsing, modèle, rendu, interaction, persistance) est écrit en **TypeScript pur, sans aucune dépendance à React**. React n'est qu'une coquille fine qui :

- monte le canvas,
- passe le fichier (ou son contenu) en entrée,
- expose quelques callbacks (`onPageChange`, `onSelectionChange`, `onSave`…),
- affiche l'UI annexe (lanceur, palette, barre de menu, boutons).

Conséquences : le moteur est testable seul, et le composant `<DrawioSpatial />` reste trivial à intégrer dans une autre application React. Documentation du composant : [`docs/COMPOSANT.md`](COMPOSANT.md).

### 3.3 Appli web d'abord, binaire ensuite

On développe une **application web**. Le jour où un binaire natif est nécessaire, on l'emballe dans **Electron ou Tauri** sans réécriture. Le seul point à anticiper est l'accès aux fichiers, abstrait derrière une interface (voir §5).

### 3.4 Environnement de développement

- **Conteneurisé** : Node est figé par l'image Docker (`node:24.21.0-bookworm-slim`), les dépendances installées par `npm ci` depuis le lockfile. Aucune version de Node n'est requise sur la machine, seulement Docker.
- **Makefile** comme point d'entrée unique : `make dev` (affiche le lien cliquable), `make test`, `make lint`, `make check`, `make build`, `make lib` (bibliothèque), `make drawio-check` (conservation par draw.io), `make desktop` / `desktop-dev` / `desktop-package` (appli native, §16), `make preview`, `make lock` (régénère le lockfile dans le conteneur), `make shell`, `make down`, `make clean`.
- **Hot reload permanent** : pendant toute la phase de dev, un seul serveur (`make dev`, port 5173) reste ouvert et on travaille directement dessus.
  - Une modification de l'UI React est appliquée à chaud.
  - Une modification du moteur (`src/engine`) recharge la page (le moteur n'est pas remplaçable à chaud) ; l'appli de démo restaure alors le fichier, la page et la caméra en cours (stockage de l'onglet), on reste au même endroit.
- En dev, le moteur est accessible dans la console du navigateur via `window.engine`.

---

## 4. Architecture

### 4.1 Couches

```
┌───────────────────────────────────────────────┐
│ UI React (coquille)                           │  lanceur, palette, menus, minimap overlay
├───────────────────────────────────────────────┤
│ Interaction                                   │  caméra, clavier, souris, sélection, transitions
├───────────────────────────────────────────────┤
│ Rendu                                         │  registre de renderers, scènes Three.js
├───────────────────────────────────────────────┤
│ Modèle neutre                                 │  Document, Page, Shape, Edge, Link
├───────────────────────────────────────────────┤
│ Format draw.io (parsing / écriture)           │  XML, compression, préservation de l'arbre
├───────────────────────────────────────────────┤
│ Persistance                                   │  FileStore (IndexedDB → système de fichiers)
└───────────────────────────────────────────────┘
```

Règles de dépendance :

- Le **parsing** ne connaît ni Three.js ni React. Il produit le modèle neutre.
- Le **rendu** consomme le modèle neutre, jamais le XML.
- L'**interaction** ne touche jamais au parsing.
- Le **modèle neutre** ne contient aucune notion propre à draw.io (pas de chaîne de style brute exposée hors du format, sauf dans un champ `raw` pour le debug et les placeholders).

### 4.2 Arborescence suggérée

```
src/
  engine/
    format/            # draw.io <-> modèle
      decode.ts        # décompression base64 + inflate + URI decode
      parse.ts         # XML -> DocumentModel
      style.ts         # parsing des chaînes de style "key=value;..."
      xmlTree.ts       # conservation de l'arbre XML d'origine (M2)
      write.ts         # écriture in situ (M2)
    model/
      types.ts         # DocumentModel, PageModel, ShapeModel, EdgeModel, LinkModel
      graph.ts         # graphe de navigation entre pages
    render/
    graph/
      graphPage.ts     # vue graphe : page générée (cartes, flèches), disposition en couches
      graphScene.ts    # scène du graphe avec les miniatures des pages
      flat/            # briques du rendu à plat (boîte, label)
      edges/           # arêtes : tracé, pointes, labels
        route.ts       # façade du tracé porté de draw.io (route/ : périmètres, bouts, un fichier par routeur)
      geometry/        # contours, traits épais, pointillés
      pageScene.ts     # construction de la scène d'une page à un niveau donné
      sceneManager.ts  # scènes construites (par page et par niveau), visibilité, cache
    shapes/            # les formes, en plugins (§8.2)
      types.ts         # ShapeDefinition : rendus, géométrie, interaction, palette, panneau
      registry.ts      # collecte des dossiers, résolution forme → définition, replis génériques
      placeholder.ts   # repli des formes non supportées
      minimap.ts       # repli mini-carte : contour de la forme
      generic/         # bases à étendre : box/, stencil/, tagged-process/, cylinder/, building/
      impl/            # une forme par élément de la palette, nommée comme l'interface
        geometry/      # rectangle/, rounded-rectangle/, ellipse/, circle/, diamond/
        general/       # text/
        architecture/  # database/, queue/, distributed-cache/, plug/, process/, event-consumer/, background-task/,
                       # recurring-task/, labeled-process/
        internal/      # hors palette : group/
    interaction/
      camera.ts        # ortho / iso, pan, zoom, état sérialisable
      controls.ts      # façade des contrôles (controls/ : raccourcis, réglages, inertie, souris, clavier)
      keyboard.ts
      pointer.ts       # pan souris, sélection, double-clic
      transitions.ts   # zoom + fondu entre pages
      history.ts       # pile de navigation
      minimap.ts
    persistence/
      FileStore.ts     # interface
      IndexedDbStore.ts
    diagnostics/
      unsupportedStyles.ts
    settings.ts        # façade des paramètres (settings/ : types, défauts, bornes, validateurs, fusion par section)
    Engine.ts          # façade publique du moteur : délègue à core/
    core/              # comportement du moteur, un dossier par domaine
      EngineCore.ts    # infrastructure partagée et câblage des domaines
      types.ts         # types publics (réexportés par Engine.ts)
      runtime/         # paramètres, rendu WebGL, taille du canvas
      document/        # fichier chargé, annuler / rétablir, pages
      view/            # caméra, modes de vue, niveaux 2D / volume, scènes, vue graphe, mini-carte
      selection/       # sélection, ce qui est sous le pointeur, mise en valeur
      input/           # gestes du pointeur, touches maintenues, branchement des contrôles
      navigation/      # liens, retour, transitions entre pages
      modes/           # modes et effets de page
      edit/            # cibles modifiables, poignées
        edges/         # flèches : poignées, ancrages, points, agencement, sauts
        drag/          # glisser : geste, un fichier par type de glisser, aperçu, modifications en direct
        text/          # éditeur en place, textes de flèche, texte et format
        commands/      # éléments, styles, ordre et alignement, presse-papier, lien et attributs
  react/
    DrawioSpatial.tsx  # composant principal
    Launcher.tsx
    Toolbar.tsx
    Palette.tsx        # M2
    BackButton.tsx
  app/
    main.tsx           # application de démonstration
tests/
  fixtures/            # fichiers .drawio de test
```

### 4.3 Façade du moteur

```ts
interface EngineOptions {
  canvas: HTMLCanvasElement;
  settings?: Partial<Settings>;
}

class Engine {
  constructor(options: EngineOptions);
  /** `initialView` : page et caméra à restaurer (§5.3). */
  load(xml: string, fileId: string, initialView?: { pageId?: string; camera?: CameraState }): Promise<void>;
  goToPage(pageId: string, opts?: { transition?: boolean }): void;
  back(): void;
  setViewMode(mode: 'top' | 'iso' | '3d'): void;
  getCameraState(): CameraState;
  setCameraState(state: CameraState): void;
  animateCameraTo(state: CameraState, durationMs?: number): void;
  toggleOverview(screenPoint?: Point): void; // vue globale ↔ 1:1 (§9.3)
  resetRotation(): void; // remet le nord en haut (§9.1)
  resetView(): void; // vue par défaut du mode : orientation de référence, page entière (§9.1)
  setControls(patch: Partial<ControlSettings>): void;
  on(event: EngineEvent, handler: (...args: any[]) => void): () => void;
  dispose(): void;
}

interface CameraState {
  mode: 'top' | 'iso';
  center: Point;    // point de la page (au sol) au centre de l'écran (coordonnées draw.io)
  zoom: number;     // pixels écran par pixel draw.io (axe horizontal de l'écran)
  rotation: number; // orientation autour de la verticale, en radians
  tilt: number;     // inclinaison par rapport à la verticale, en radians (0 = dessus)
}
```

---

## 5. Persistance et fichiers récents

### 5.1 Interface `FileStore`

```ts
interface StoredFile {
  id: string;
  name: string;
  content: string;          // XML draw.io brut
  lastOpenedAt: number;
  lastPageId?: string;
  cameraByPage: Record<string, CameraState>;
}

interface FileStore {
  listRecent(limit?: number): Promise<StoredFileMeta[]>;
  get(id: string): Promise<StoredFile | undefined>;
  put(file: StoredFile): Promise<void>;
  updateMeta(id: string, patch: Partial<StoredFile>): Promise<void>;
  remove(id: string): Promise<void>;
}
```

### 5.2 Implémentations

- **M1 :** `IndexedDbStore`. Le fichier choisi par l'utilisateur est lu (input file / drag & drop) et son contenu stocké avec ses métadonnées.
- **`FsStore`** (appli native, §16) : l'id d'un fichier est son chemin ; le contenu est lu et écrit sur le disque, l'état de consultation (vue, historique…) gardé dans `library.json` (dossier de l'application). Les autres ids (exemples embarqués) gardent leur contenu dans la bibliothèque. Retirer un fichier de la liste ne le supprime jamais ; un fichier déplacé hors de l'appli reste listé mais ne s'ouvre plus. L'interface et l'UI ne changent pas.

### 5.3 Restauration

- À la réouverture d'un fichier récent : on restaure **la dernière page active** et **la position de caméra de chaque page** (position, zoom, mode, inclinaison).
- La position de caméra est sauvegardée de manière débouncée (ex. 500 ms après le dernier mouvement) et à la fermeture.

Réalisation retenue :

- `StoredFile` contient aussi la **pile de navigation** (`history`) et l'**usage des liens** (`linkUsage`, SPEC §11.3) : rouvrir un fichier rend aussi le bouton « Retour » tel qu'on l'avait laissé.
- Sauvegarde 500 ms après le dernier changement (caméra, page, historique, lien suivi), et immédiatement en revenant au lanceur, en masquant ou en fermant l'onglet.
- Rouvrir un fichier du disque **du même nom** met à jour son contenu et garde ses vues (pratique après une modification dans draw.io). Deux fichiers homonymes de dossiers différents partagent donc leur entrée : limite assumée jusqu'au `FsStore` (vrais chemins).
- Navigateur sans IndexedDB (navigation privée stricte) : `MemoryStore`, rien n'est conservé.
- **État de vue enregistré dans le fichier** (§14.2) : à l'ouverture, la caméra de chaque page est celle de l'attribut `spatial.view` de sa `<diagram>`, sauf si une caméra plus récente est mémorisée localement pour ce fichier ; ses réglages iso (élévation, orientation, volumes, épaisseur) sont repris en arrivant sur la page.
- Rechargement de l'onglet (hot reload) : le fichier ouvert dans l'onglet est rouvert directement, sans repasser par le lanceur ; nouvel onglet ou nouvelle session : lanceur.

---

## 6. Lanceur

Au démarrage :

- liste des **fichiers récents** (nom, date de dernière ouverture), triée par récence,
- bouton **« Ouvrir un fichier »** (sélecteur + glisser-déposer d'un `.drawio` / `.xml`),
- bouton **« Nouveau fichier »** (squelette draw.io vide valide, utile surtout en M2),
- possibilité de retirer un fichier de la liste.
- glisser-déposer accepté **n'importe où dans la fenêtre**, lanceur comme visionneuse (cadre d'indication pendant le survol) ;
- fichier illisible : retour au lanceur avec un message clair (« Impossible d'ouvrir « x.drawio » : XML invalide (…) ») ;
- section **Exemples** (fixtures et fichiers de `docs/`) pendant le développement ;
- dans la visionneuse, le nom du fichier (barre d'outils) ramène au lanceur.

---

## 7. Format draw.io — lecture

### 7.1 Structure à gérer

- Racine `<mxfile>` contenant **une ou plusieurs `<diagram>`** = pages / onglets (attributs `id`, `name`).
- Contenu d'une page :
  - soit un `<mxGraphModel>` en clair,
  - soit un texte **compressé** : `base64` → `inflate raw` → `decodeURIComponent` → XML `<mxGraphModel>`.
- Cellules `<mxCell>` sous `<root>` :
  - cellules `0` et `1` (racine et calque par défaut), et éventuels autres calques,
  - `vertex="1"` → forme, `edge="1"` → connecteur,
  - `<mxGeometry>` (`x`, `y`, `width`, `height`, points intermédiaires d'arêtes),
  - `style` sous forme `clé=valeur;clé=valeur;` (le premier token peut être un nom de forme sans valeur).
- Cellules enveloppées dans `<UserObject>` ou `<object>` (attributs `label`, `link`, attributs personnalisés).
- **Coordonnées relatives au parent** pour les formes contenues dans des groupes / conteneurs : il faut cumuler les offsets.
- Labels pouvant contenir du **HTML** (`html=1`) : en M1 on peut en extraire le texte brut.

### 7.2 Liens entre pages

- Un lien interne a la forme `link="data:page/id,<pageId>"`.
- Les autres liens (URL externes) sont conservés et affichés comme tels (ouverture dans un nouvel onglet navigateur, avec confirmation éventuelle).

### 7.3 Modèle neutre (indicatif)

```ts
interface DocumentModel { pages: PageModel[]; }

interface PageModel {
  id: string;
  name: string;
  shapes: ShapeModel[];
  edges: EdgeModel[];
  bounds: Rect;
}

interface ShapeModel {
  id: string;
  kind: string;             // 'rectangle', 'ellipse', 'text', ... ou 'unknown'
  bounds: Rect;             // coordonnées absolues
  label: string;
  style: Record<string, string>;
  link?: LinkModel;
  parentId?: string;
  raw: { styleString: string };
}

type LinkModel =
  | { type: 'page'; pageId: string }
  | { type: 'url'; href: string };
```

### 7.4 Chargement

- **Tout le fichier est parsé en mémoire** (toutes les pages). C'est un choix assumé : un fichier draw.io reste petit.
- En revanche, **les objets Three.js ne sont construits que pour les pages affichées** (page courante, page en préchargement, page en transition). Les scènes construites peuvent être gardées en cache.
- Les optimisations mémoire viendront plus tard, uniquement si un problème est constaté.

---

## 8. Rendu

### 8.1 Repère

- Le schéma est posé **au sol** : `x` draw.io → `X` Three.js, `y` draw.io → `Z` Three.js (axe Y vers le haut).
- Unité : 1 pixel draw.io = 1 unité de scène.

### 8.2 Registre de renderers

Chaque forme est décrite par une **définition**, dans son dossier `src/engine/shapes/impl/<catégorie>/<id>/` (`index.ts` exporte `definition`), collectée toute seule par le registre. Elle porte le nom de l'interface en anglais (`database`, `rounded-rectangle`…), gère une ou plusieurs formes draw.io (`kinds`, défaut `[id]`), avec au besoin une condition (`matches`, ex. `rounded=1`), et contient tout ce qui la concerne, iso / 3D compris ; elle étend une base de `shapes/generic/` ou une autre forme pour ce qu'elle partage. Des variantes d'une même forme forment une **famille** : `impl/<catégorie>/<famille>/<variante>/` (ex. `general/actors/human/` et `droid/`), le code partagé dans `<famille>/common/`, l'id commençant par le nom de la famille au singulier (`actor`, `actor-droid`). Le moteur et l'appli ne connaissent que l'interface commune : ils ne testent jamais le nom d'une forme, ils interrogent le registre. Guide pas à pas pour en ajouter une : [AJOUTER_UNE_FORME.md](AJOUTER_UNE_FORME.md).

Une forme a **plusieurs niveaux de rendu** selon le contexte, avec un **repli systématique sur le rendu à plat** :

| Niveau | Où | Obligatoire | Repli |
|---|---|---|---|
| `flat` | à plat sur le sol (vue de dessus, et par défaut partout) | **oui** | — |
| `iso` | vue isométrique (ex. éléments dressés face à la caméra) | non | `flat` |
| `volume` | 3D (ex. extrusion, §17) | non | `flat` |
| `minimap` | mini-carte (Canvas 2D) | non (`null` = rien) | contour de la forme, sinon ses bornes |

```ts
type SceneLevel = 'flat' | 'iso' | 'volume';

interface ShapeDefinition {
  id: string;                                  // nom de l'interface = nom du dossier (accepté par spatial.kind)
  kinds?: string[];                            // formes draw.io gérées (défaut : [id])
  matches?(shape: ShapeModel): boolean;        // condition de variante (rounded=1, aspect=fixed, cylindre couché…)
  outline?(shape: ShapeModel): Point[];        // contour au sol : géométrie de référence (rendu à plat, replis)
  contains?(shape: ShapeModel, p: Point): boolean; // clic ; par défaut : le contour, sinon les bornes
  flat: SceneRenderer;                         // obligatoire
  iso?: SceneRenderer;
  volume?: SceneRenderer;
  volumeHeight?(shape, ctx): number;
  textZone?(shape, level): Rect;
  minimap?: MinimapPainter | null;
  resizable?: boolean;                         // défaut : oui
  connectable?: boolean;                       // défaut : oui
  pickable?: 'always' | 'withLink';            // défaut : always (groupe : withLink)
  movesAsBlock?: boolean;                      // défaut : non (groupe : oui)
  palette?: PaletteEntry;                      // élément de la palette (§14.1) ; modèle d'id = id de la forme
  swatch?(style): string;                      // aperçu des styles du panneau
  properties?: ShapeProperty[];                // réglages propres à la forme, dans le panneau
}

interface SceneRenderer {
  create(shape: ShapeModel, ctx: RenderContext): THREE.Object3D; // en espace page
}
```

- Le registre résout la définition d'une forme, de la plus précise à la plus générale : condition `matches` vérifiée, puis `id` égal au nom de la forme (`spatial.kind`), puis nom draw.io sans condition (placeholder si aucune) ; puis le rendu d'un niveau : `registry.sceneRenderer(shape, level)` (repli `flat`), `registry.minimapPainter(shape)` (repli contour).
- Une page est construite **au niveau du mode de vue** (iso en mode iso, à plat sinon). Si aucune forme de la page n'a de rendu propre à ce niveau, la scène à plat est réutilisée telle quelle : pas de reconstruction en basculant de mode. Le cache de scènes est donc indexé par page **et** niveau.
- Rectangles, ellipses et placeholders ont un rendu `iso` en volume (§9.1) ; le texte et les groupes restent à plat.
- Les arêtes ont pour l'instant un rendu unique (à plat), et un tracé simplifié en mini-carte.

Ajouter une forme = **déposer son dossier** (au minimum `kind` et `flat`, idéalement `outline`). Aucune autre modification : palette, panneau, clic, poignées et flèches la prennent en compte d'après sa définition ; les niveaux plus riches s'ajoutent ensuite, forme par forme. Le code partagé entre formes va dans `shapes/utils/`.

### 8.3 Formes supportées en M1

- Rectangle (y compris arrondi),
- Ellipse,
- **Titre** (`general/title`, palette « Général », après Texte, 240 × 80 ; ticket 176) : la forme Texte en 64 pt gris
  clair (`fontSize=64;fontColor=#DEDEDE`, valeur « Titre »), même rendu et même style `text` dans le fichier ; un texte
  qui porte cette taille et cette couleur est reconnu comme un titre (palette « Utilisées »).
- **Actor** (`shape=umlActor`, palette « Général », 30 × 60) : le bonhomme de draw.io en 2D (tête remplie, traits),
  label sous la forme ; en iso / 3D, pas d'extrusion : il se tient **debout face à la caméra** (silhouette dans un
  plan vertical, pieds au centre de l'emprise, hauteur de la forme ou `spatial.height`), tourné à chaque image vers
  la caméra, exactement en perspective (`userData.billboard`, `render/billboard.ts`) ; il tient son texte sur une
  **pancarte** entre ses mains (texte ajusté au panneau ; case « Pancarte en iso / 3D » du panneau, `spatial.sign=0` :
  label au sol) ; seule sa silhouette se clique (tête, traits, pancarte), sélection = cercle autour de la tête ; il
  reçoit les flèches sur ses bornes (`outlineConnect=0`).
- **Droid** (`actor-droid`, palette « Général », 30 × 60) : l'Actor (même famille `general/actors/`, mêmes rendus,
  pancarte et interaction) avec une tête de robot (rectangle arrondi) surmontée d'une petite antenne ; pas de droid
  natif dans draw.io : stencil embarqué (`stencil:actor-droid`), tiré des mêmes points que le moteur.
- **Géométrie** (formes natives de draw.io, dessinées comme draw.io en 2D, prisme du contour en iso / 3D, palette
  « Géométrie ») : losange (`rhombus`), hexagone (`shape=hexagon`, pans de `size` px avec `fixedSize=1`, sinon
  fraction de la largeur ; périmètre `hexagonPerimeter2`), octogone (`shape=mxgraph.basic.octagon2`, coins coupés de
  2 × `dx`, au plus la moitié du petit côté ; flèches sur les bornes), pentagone (`shape=mxgraph.basic.pentagon`,
  stencil de draw.io étiré dans les bornes ; flèches sur les bornes), triangles (`triangle`, vers la droite, et
  `triangle;direction=north`, vers le haut ; périmètre `trianglePerimeter`), parallélogramme (`shape=parallelogram`,
  côtés obliques décalés de `size` ; périmètre `parallelogramPerimeter`), étape (`shape=step`, chevron de profondeur
  `size` ; périmètre `stepPerimeter`), étoile à 4 branches (`shape=mxgraph.basic.4_point_star_2`, creux à `dx / 2`
  des bornes ; palette « Basic » de draw.io, label sous la forme ; flèches sur les bornes), étoile à 6 branches
  (`shape=mxgraph.basic.6_point_star`, stencil de draw.io étiré dans les bornes ; palette « Basic » ; flèches sur
  les bornes). **Coins arrondis** (`rounded=1`, case du panneau) sur le losange, l'hexagone,
  les triangles, le parallélogramme et l'étape, comme draw.io (`mxShape.addPoints` : rayon `arcSize / 2`, 10 px par
  défaut), en 2D, en volume et sur la mini-carte,
- Texte seul,
- **Stockage** (formes natives de draw.io, dessinées comme draw.io en 2D, en vrai volume en iso / 3D ; aussi dans la palette) :

  | Usage | Style draw.io | 2D | Iso / 3D |
  |---|---|---|---|
  | Base de données | `shape=cylinder3` (`size`, 8 dans la palette ; `boundedLbl`) | le cache avec une seule lèvre (même ellipse de 8 px), label sous l'ellipse du haut | bloc plein et droit, dont les quatre faces portent 2 ou 3 arcs « sourire » **gravés** (les lèvres du pictogramme BDD ; même gravure que les chevrons de la file : rainure sombre et arête claire) |
  | File (queue) | `shape=cylinder3;direction=south` (palette : 100 × 30, `size=8`) ; `shape=mxgraph.flowchart.direct_data` aussi | cylindre couché, bout visible à droite (`north` : à gauche) ; label décalé comme dans draw.io | bloc dont les faces longues portent une rangée de chevrons ▶ **creusés** (rainure sombre et arête claire) dans le sens du flux (vers le bout visible en 2D) ; chaque bout porte un cercle gravé au même niveau, centré sur la face |
  | Cache distribué | `shape=datastore` | cylindre à trois anneaux, de taille fixe ; label sous les anneaux, comme draw.io | tranches empilées, une par nœud (`spatial.nodes`, 3 par défaut, 1–12), séparées par une rainure en retrait plus sombre, voyants (couleur d'accent) sur les quatre faces |

  En iso / 3D, ce sont des **« bâtiments »** (`render/iso/buildings.ts`), comme les familles de bâtiments d'un jeu de construction : emprise = le rectangle 2D de la forme, **toit plat et rectangulaire** en haut (bordé, avec le label : toujours lisible), et une **façade propre au type** dans l'épaisseur, sur les quatre côtés (lisible sous tous les angles). Hauteur par défaut : la **même épaisseur que toutes les formes** (réglage `view.isoDepth`, 32 px), `spatial.height` prioritaire. **Étiquette de façade**, comme une enseigne : « DB », « QUEUE » ou « CACHE » en bas à droite de chaque face, à l'endroit vu de l'extérieur, discrète (teinte des gravures) ; les motifs (arcs, chevrons) se placent au-dessus ; sur le cache, dans la tranche du bas (voyants à l'autre bout). `spatial.tag` la remplace (ex. `PostgreSQL`, `Kafka`), vide = aucune ; réglage `view.facadeTags` (activé) pour toutes les couper. Sans fond (`fillColor=none`), le dessin 2D reste à plat.

  **Redimensionnement** : le corps du cylindre s'étire, les ellipses gardent leur taille. Les trois formes ont la **même ellipse**, de 8 px (celle de draw.io pour un cache de 60 px de haut) ; le bout de `direct_data` reste à 9/98 de la largeur, comme draw.io. **Écarts assumés avec draw.io** : draw.io agrandit les anneaux du cache avec sa hauteur, et dessine l'ellipse du `cylinder3` de hauteur `size` (15 par défaut) ; avec les valeurs de la palette (`size=8`, cache de 60 px), le rendu est identique dans les deux. Contour par défaut : épaisseur 1, comme les autres formes.

  **Zone de texte**, en 2D, comme draw.io : le texte se place dans le corps du cylindre, sous l'ellipse (BDD) ou à gauche du bout visible (file) avec `boundedLbl=1` (sinon dans toute la forme), et toujours sous les anneaux pour le cache (draw.io y ignore `boundedLbl`). En iso / 3D, sur le toit entier. L'éditeur en place s'ouvre sur cette même zone (`textZone` des définitions de formes, bornes par défaut) : le texte ne bouge pas entre affichage et édition.
- **Prise** (connecteur logiciel, module qui se branche ; palette « Architecture », 96 × 80) : draw.io n'a pas de prise
  native, c'est un **stencil embarqué** dans le style (`shape=stencil(…)`, XML `<shape name="plug">` compressé comme
  draw.io), que draw.io dessine donc à l'identique : fiche électrique vue de face (deux broches en haut, corps, bas en
  trapèze), étirée dans les bornes et orientée par `direction` / `flipH` / `flipV` ; prisme du contour en iso / 3D ;
  périmètre rectangle.
  Un `shape=stencil(…)` prend le nom de forme `stencil:<nom>` (`format/stencil.ts`) : les stencils inconnus apparaissent
  sous ce nom dans Diagnostics.
- **Process** (palette « Architecture », 120 × 60) : forme native de draw.io
  (`shape=process;whiteSpace=wrap;html=1;backgroundOutline=1;`), rectangle (arrondi si `rounded=1`) et deux barres
  sur toute la hauteur à `round(size × largeur)` des bords (`size` 0,1 ; en px avec `fixedSize=1` ; au moins le coin
  avec `rounded=1`), orientées par `direction` ; texte entre les barres en 2D, comme `ProcessShape.getLabelBounds` ;
  prisme du contour en iso / 3D, barres sur le dessus.
- **Event consumer, Tâche de fond, Tâche récurrente** (palette « Architecture », 120 × 60) : process à **tranche
  étiquetée** (base `generic/tagged-process`) : forme native `internalStorage` de draw.io
  (`dx=16;dy=0;flipH=1;spacingRight=16`), une seule ligne à `dx` px du bord droit, désignée par `spatial.kind`
  (`event-consumer`, `background-task`, `recurring-task`). La tranche garde sa largeur au redimensionnement ; elle
  porte un mot en capitales grises (teinte des étiquettes de façade), écrit de bas en haut : « CONSUMER », « TASK »,
  « CRON » ; le **Process étiqueté** (`labeled-process`) est la forme générique, « PROCESS » par défaut. Le mot est
  un paramètre de l'instance : champ « Étiquette » de la section de la forme dans le panneau (`spatial.tag`, vide =
  le mot par défaut). **Écart assumé** : seul Drawio Spatial dessine le mot, draw.io montre la tranche vide. Prisme
  du contour en iso / 3D, ligne et mot sur le dessus (comme en 2D), mot aussi **en façade**, en bas à droite de chaque face, comme l'étiquette
  des bâtiments (coupé avec elles par `view.facadeTags`) ; se cliquent sur toutes leurs bornes.
- Connecteurs (arêtes) : segments, points intermédiaires, flèche de fin,
- Couleurs de remplissage, de bordure, épaisseur de trait, pointillés, label centré.
- **Position du label**, comme draw.io : dans la forme selon `align` / `verticalAlign` (marges `spacing*`, plus
  les 5 px que draw.io ajoute au-dessus d'un texte aligné en haut et le 1 px sous un texte aligné en bas) ; **hors
  de la forme** avec `labelPosition=left|right` (cadre du label décalé d'une largeur) et
  `verticalLabelPosition=top|bottom` (d'une hauteur), la zone propre à la forme (`boundedLbl`, anneaux du cache)
  étant alors ignorée (`render/labelPosition.ts`). En iso / 3D, un label hors de la forme est **posé au sol** à côté
  du volume (sur la base de la forme), et l'éditeur en place s'y ouvre. Vérifié contre draw.io : la fixture
  `labels.drawio` (toutes les combinaisons de position et d'alignement) est exportée en SVG par draw.io
  (`make drawio-check`) et chaque texte doit y être ancré au même point que le nôtre.

**Connecteurs.** draw.io n'enregistre que les points intermédiaires posés par l'utilisateur : le tracé (coudes, points d'attache) est **recalculé à l'affichage**, avec les **algorithmes de draw.io portés tels quels** (`render/edges/route.ts` et `route/`, d'après mxGraph, Apache 2.0) : une flèche s'affiche comme dans draw.io, et un point posé ici y reste au même endroit :

- styles : droit (de contour à contour, par les points intermédiaires), `orthogonalEdgeStyle` (routeur local de draw.io ; avec des points intermédiaires, `segmentEdgeStyle`), `segmentEdgeStyle`, `elbowEdgeStyle` (horizontal / vertical, bascule selon le point intermédiaire), `sideToSideEdgeStyle`, `topToBottomEdgeStyle`, `entityRelationEdgeStyle`, boucles (`loopEdgeStyle`) ; un style inconnu est approché par l'orthogonal et journalisé (§8.4) ;
- bouts comme draw.io : points d'attache imposés (`exitX/exitY`, `entryX/entryY`, décalages, projection sur le contour sauf `exitPerimeter=0`), extrémités libres, puis bouts flottants sur le contour (rectangle ou ellipse) visés depuis le point voisin, projetés dans l'axe pour les styles orthogonaux ; `jettySize` (10 par défaut, `auto`), `portConstraint`, `perimeterSpacing`, `routingCenterX/Y`, `flipH/V` ; non repris : rotation des formes, ports (`sourcePort`) ;
- **vérifié contre draw.io** : la fixture `edge-routing.drawio` (144 tracés de tous ces styles, dans des positions variées) est exportée en SVG par draw.io (`make drawio-check`) et chaque tracé doit tomber au pixel près sur le nôtre ;
- pointes `startArrow` / `endArrow` aux proportions draw.io : classic, block, open, oval, diamond (et variantes `Thin`), pleines ou creuses ; une pointe inconnue devient classic et est journalisée ;
- arêtes arrondies (`rounded=1`) ;
- labels d'arête (principal et cellules enfants) positionnés comme draw.io, avec un **fond de la couleur de la page** par défaut, qui coupe la ligne.

**Labels.** Avec `whiteSpace=wrap`, retour à la ligne entre les mots seulement, comme draw.io : un mot plus long que la forme déborde au lieu d'être coupé.

Formes et arêtes sont dessinées dans l'**ordre du document** (une arête déclarée avant une forme passe dessous).

### 8.4 Formes non supportées

- Affichées avec un **placeholder** : rectangle gris en pointillés aux dimensions de la forme, avec le nom du style non reconnu sous le label. En iso et en 3D, le même rendu sur le dessus d'un bloc gris, arêtes en pointillés (attributs spatiaux de la forme conservés, ex. `spatial.height`).
- Le chargement d'un fichier **n'échoue jamais** à cause d'une forme inconnue.
- Chaque style inconnu est **journalisé** avec son nombre d'occurrences (module `diagnostics/unsupportedStyles`), consultable dans l'UI (panneau debug) et exportable en JSON. Cela sert de **backlog priorisé par fréquence réelle**.
- Sont recensés : les formes dessinées en placeholder, les tracés d'arête approchés (`edgeStyle` inconnu) et les pointes inconnues (`startArrow` / `endArrow`). Le recensement porte sur **tout le document** (pas seulement les pages affichées) et est calculé au chargement.
- **Panneau Diagnostics** (bouton dans la barre d'outils, avec le nombre de problèmes) :
  - onglet **Ce fichier** : entrées triées par fréquence, avec type, pages, un exemple de chaîne de style (pour écrire le renderer) et les occurrences ; cliquer une occurrence va à sa page et **cadre l'élément** ; les avertissements de lecture (page illisible, parent manquant, lien cassé…) y sont aussi listés ;
  - onglet **Tous les fichiers** : cumul des fichiers ouverts dans ce navigateur (chaque fichier compte pour son dernier état), avec le nombre de fichiers concernés ; peut être vidé ;
  - **Exporter JSON** : fichier courant (rapport + avertissements) et cumul.
- Le panneau s'ouvre à côté de la vue (qui se réduit), pas par-dessus.

### 8.5 Texte

- Le texte doit rester net en vue de dessus et lisible en isométrique.
- **Retenu** : texte SDF `troika-three-text`, posé à plat sur le sol, net à tous les zooms.
- Police **Roboto** (regular + bold) embarquée : le texte latin courant ne dépend pas du réseau. Pour les autres caractères (emoji, autres alphabets), troika charge des polices de secours depuis un CDN.
- En M1 les labels HTML sont convertis en texte brut (gras, italique, couleurs internes ignorés).

---

## 9. Caméra et navigation

### 9.1 Modes de vue

- **Vue de dessus (`top`)** : caméra **orthographique**, perpendiculaire au sol, sans perspective. Équivalent fonctionnel de draw.io (même ratio au zoom, même ressenti au pan).
- **Vue isométrique (`iso`)** : caméra inclinée, projection isométrique sur le plan au sol.
- **Vue 3D (`3d`)** : caméra **en perspective**, comme un jeu de construction (§9.1, « Vue 3D » ci-dessous).
- Bascule entre les modes par des boutons liés « 2D | Iso | 3D » et des raccourcis (I : 2D ↔ iso, P : 3D ↔ dernier mode 2D / iso), avec une animation douce.
- **Réalisation retenue pour l'iso** : la même caméra orthographique, inclinée de `tilt` au-dessus du sol (vers le haut de l'écran). Par défaut, élévation de 35,26° (inclinaison 54,74°) **et** rotation de −45° (« vers la droite ») : l'isométrie vraie (losanges). En entrant en iso (depuis la 2D ou la 3D), la vue prend l'orientation iso (`isoAzimuthDeg`) ; en revenant en 2D, le nord est en haut. Le centre de l'écran et le zoom ne bougent pas pendant la bascule (≈ 450 ms, animée).
- **Réglages de la vue iso** (section « Vue isométrique » du panneau Paramètres, §13) : orientation **vers la droite** (−45°, défaut), **vers la gauche** (+45°) ou **sans rotation** (0°), chacune avec un aperçu dessiné, ou un **angle libre** au curseur (tour complet : 180° à gauche à 180° à droite) ; **élévation** de la caméra de 10° (rasante) à 80° (presque de dessus), avec un retour à l'isométrie vraie (35°). Les changements s'appliquent immédiatement en iso (animés) et sont mémorisés avec les autres paramètres ; l'orientation est absolue : un clic sur une orientation prédéfinie ramène toujours la vue exactement à cet angle, même déjà sélectionnée (y compris après une rotation à la souris). Changer seulement l'élévation garde la rotation faite à la souris.
- **Volume en iso** (niveau de rendu `iso`, §8.2) : rectangles, ellipses et placeholders deviennent des **blocs** posés au sol. Le dessus reprend le rendu à plat (fond, bordure, label) ; les côtés reprennent la couleur de fond, assombrie selon l'orientation de chaque face (lumière fixe dans la page : en iso par défaut, face visible gauche claire, droite plus sombre). Matériaux opaques avec test de profondeur : les blocs se cachent entre eux et cachent ce qui est derrière.
  - **Toutes les arêtes du bloc** reprennent la bordure 2D de la forme (couleur, épaisseur, pointillés, opacité) : contour du dessus, contour du bas et arêtes verticales aux angles vifs (> 30° ; pas sur les courbes : ellipses et coins arrondis n'en ont pas). Ce sont des **lignes d'épaisseur constante à l'écran quelle que soit leur orientation** (`render/lines`, rubans tournés vers la caméra, épaisseur en pixels de page, extrémités arrondies) : une arête couchée et une arête debout paraissent aussi épaisses, sans effet de gras aux angles. Le **contour du dessus est centré sur le bord**, comme la bordure 2D : deux formes accolées partagent une seule ligne (la dernière dessinée l'emporte, comme dans draw.io) au lieu de déborder l'une sur l'autre. Le contour du bas et les arêtes verticales passent à une demi-épaisseur à l'extérieur des angles (sur la bissectrice) : ils touchent les faces sans être mangés par elles, et chaque arête verticale finit dans l'épaisseur du contour du dessus. Elles écrivent la profondeur : ce qui est derrière (ex. le label d'une flèche) reste caché. En 2D, la bordure reste centrée sur le bord, comme dans draw.io.
  - Épaisseur réglable, **la même par défaut pour toutes les formes** (32 px, §13), et par forme avec le style draw.io **`spatial.height=…`** (préfixe spatial, §14.3). Une forme sans fond reste à plat. Migration : l'ancienne valeur par défaut (16), enregistrée dans les paramètres ou dans l'état de vue d'une page (`spatial.view` sans `v=2`), est relue à 32 ; une valeur choisie depuis est gardée.
  - Les formes contenues sont **posées sur le dessus** de leur conteneur ; une arête est à la hauteur de la plus haute de ses extrémités (ou du dessus de son conteneur). Les groupes, invisibles, n'ont pas de volume.
  - La hauteur suit l'inclinaison (ou, en 3D, la perspective) : les blocs **poussent** pendant la bascule 2D → iso / 3D et **s'aplatissent progressivement** pendant la bascule inverse (ils restent en volume jusqu'à l'arrivée, la page ne passe à plat qu'une fois la caméra à la verticale).
  - Pendant toute la bascule, **fondu enchaîné** des deux rendus : la page en volume a une opacité égale à la hauteur relative des blocs, la page à plat l'opacité inverse. Le rendu se fait en deux passes (page à plat puis volumes, profondeur remise à zéro entre les deux) : les blocs s'occultent entre eux, mais des blocs presque aplatis ne masquent pas les traits et labels à plat. Une bascule interrompue ou instantanée (animations réduites) termine le fondu.
  - Le clic vise le **dessus** des blocs (point décalé de hauteur × tan(inclinaison) vers la caméra) ; le contour de sélection y est posé et reste toujours visible.
  - Les arêtes restent au sol : une pointe qui arrive contre la face arrière d'un bloc est masquée par lui (occlusion normale).
- **Navigation cohérente** : les conversions écran ↔ sol tiennent compte de l'inclinaison (raccourcissement vertical de cos(tilt)) ; zoom au curseur, déplacement, rotation, clic, sélection et liens se comportent de la même façon dans les deux modes. Le texte reste posé à plat sur le sol (lisible, raccourci en iso).
- **Vue 3D** : mêmes volumes qu'en iso (pleine hauteur, même vue d'aplomb), vus en perspective (champ vertical 45°).
  - **Contrôles** : molette = zoom au curseur, **borné** (dézoom maximal ×0,1, zoom maximal ×4) ; **glisser molette enfoncée** = déplacer (le point du sol attrapé reste sous le curseur) ; **glisser clic droit** = orienter la caméra en orbite autour du centre de l'écran : c'est la caméra qui bouge, la page reste fixe : à l'horizontale, rotation libre (vers la droite, la caméra tourne vers la droite autour du centre) ; à la verticale, inclinaison de 0 (d'aplomb) à 65° (vers le haut, la caméra monte vers la vue d'aplomb ; vers le bas, elle descend vers l'horizon, qui reste hors de l'écran). Clavier, Espace + glisser, Entrée, clic, liens : comme dans les autres modes.
  - **Bascule** : depuis la 2D, la 3D part de l'orientation iso (élévation et azimut des réglages iso) ; depuis l'iso, elle garde l'orientation courante. En sortant, la 2D revient au nord en haut, l'iso à son azimut. La perspective s'ouvre (et se referme) progressivement pendant la bascule, depuis une vue quasi orthographique : pas de saut d'image.
  - Le zoom (`CameraState.zoom`) est celui du centre de l'écran : la caméra est placée à la distance qui donne ce zoom ; `CameraState.fov` (champ de vision) n'est présent qu'en perspective.
  - Conversions écran ↔ sol par lancer de rayon ; la mini-carte montre une emprise en **trapèze**.
- **Rotation de la vue** (`CameraState.rotation`) : **jamais en 2D** (nord en haut, comme draw.io ; une caméra enregistrée tournée est remise droite). En iso et en 3D, **clic droit + glisser** fait tourner la caméra autour du centre de l'écran (la page reste fixe ; en iso, seule la rotation change, l'élévation reste celle des réglages) ; aussi par les réglages iso et l'état de vue enregistré. Le bouton **Réinitialiser la vue** de la barre d'outils (à côté de « 2D | Iso | 3D », dans tous les modes) revient en animation à la vue par défaut du mode, comme à l'ouverture de la page : orientation de référence (nord en haut en 2D, orientation et élévation des réglages iso en iso et en 3D) et page entière à l'écran (au plus 100 %). `engine.resetRotation()` reste disponible, et la bascule de mode redonne aussi une orientation de référence.

### 9.2 Contrôles

| Action | Contrôle |
|---|---|
| Se déplacer | **Z Q S D** (AZERTY) = W A S D (QWERTY), et les flèches ; dans le sens de l'écran, même vue tournée |
| Zoomer | Molette, **zoom centré sur le curseur** (pincement trackpad pris en compte) |
| Pan | Glisser molette enfoncée, clic droit + glisser (en 2D seulement), ou Espace + glisser |
| Orienter (iso, 3D) | Clic droit + glisser : la caméra tourne autour du centre (horizontal) ; en 3D, s'incline aussi (vertical) (§9.1) |
| Pivoter (iso, 3D) | **A / E** (AZERTY) = Q / E (QWERTY), par position physique : la vue pivote autour du centre de l'écran, vers la gauche / la droite, tant que la touche est enfoncée (`controls.rotateSpeed`, 90°/s), puis courte glissade (`controls.decelerationMs`) ; sans effet en 2D. Touches non attribuables à un raccourci |
| Vue globale ↔ 1:1 | **Entrée** (§9.3) |
| Vue graphe ↔ dernière page | Onglet « Vue graphe », touche **G** (§12) |
| Mini-carte | Bouton × / « Mini-carte », touche **M** (§10) |
| Aplatir les volumes (iso, 3D) | Touche **V** : rendu à plat (épaisseur nulle), caméra inchangée ; un second appui, ou un clic sur l'icône apparue en bas à gauche de la zone de dessin (infobulle au survol), rétablit les volumes. État passager, non enregistré ; sans effet en 2D |
| Sélectionner | Clic gauche |
| Déplacer une forme | Clic gauche + glisser sur la forme (vue de dessus comme iso), aimanté à la grille de la page ; **Alt** maintenu : sans grille (§14.1) |
| Sauvegarder | Bouton « Enregistrer sous », **Ctrl+S** / ⌘S (§14.1) |
| Ajouter une forme | Glisser une forme de la palette sur le plan (déposée au point visé, au sol), ou clic dessus (centre de la vue) ; la trouver par la recherche ou dans sa catégorie (§14.1) |
| Pages | Onglets : **+** ajoute, double-clic renomme, **×** supprime la page affichée (§14.1) |
| Redimensionner / connecter | Poignées de la forme sélectionnée : carrés = redimensionner (grille, Alt = libre), disques bleus sur les quatre côtés (nord, est, sud, ouest) = tirer vers une autre forme pour la relier, la flèche partant de ce côté (sortie fixe `exitX/exitY`) (§14.1) |
| Éditer un texte | Double-clic (sans la touche pour suivre un lien), **F2** ou « Modifier » dans le panneau contextuel : **édition en place**, dans la police, la taille, la couleur et l'alignement du label (le label dessiné est masqué pendant la saisie) ; en iso, en 3D, ou vue tournée, l'éditeur d'une forme est plaqué sur le plan de sa zone de texte (toit, en perspective : homographie CSS `matrix3d` des coins projetés, `LabelEditRequest.plane`), avec le même sens et le même retour à la ligne que le label dessiné ; texte d'une flèche : ancré sur son point, à la taille du texte, avec le même fond que le label dessiné ; le curseur (bleu, clignotant) est posé en fin de texte, rien n'est sélectionné. Pendant l'édition, le panneau contextuel montre le **format du texte**, avec en haut un lien « ← Forme » ou « ← Flèche » qui valide la saisie et revient au panneau de l'élément (resté sélectionné) : styles de texte (paramètre `styles.text` : **Classique** 12 px, **Feutré** gris 9 px, **Code** en police à chasse fixe `fontFamily=Courier New`, dessinée en Roboto Mono), gras, italique, souligné, barré (**Ctrl+B**, **Ctrl+I**, **Ctrl+U**), taille, couleur, alignement horizontal et vertical (pas de vertical pour une flèche). **Avec une partie du texte sélectionnée**, gras, italique, souligné, barré, taille, couleur et styles de texte s'appliquent à la sélection : **texte riche** écrit en HTML draw.io (`<b>`, `<i>`, `<u>`, `<strike>`, `<span style="font-size; color; font-family">`, le style passe en `html=1`), relu tel quel par draw.io et dessiné par le moteur (mise en page des segments `render/richLayout`, un texte SDF par mot, traits de souligné et de barré). **Sans sélection**, tout le texte : clés `fontStyle` (bits 1 gras, 2 italique, 4 souligné, 8 barré), `fontSize`, `fontColor`, `fontFamily`, `align`, `verticalAlign` du style, une étape d'annulation par changement, et les mises en forme partielles de même nature sont retirées. L'alignement vaut toujours pour tout le texte. **Ajuster** (texte d'une forme, bouton à côté de la taille) : la taille réglée devient une taille maximale, le texte est réduit (tailles entières, tailles partielles à proportion, jamais sous 1) pour tenir dans la zone de texte de la forme, en direct pendant la saisie, au redimensionnement et à l'ouverture ; le réglage de taille est alors remplacé par la taille obtenue. Écrit `fitText=1` (clé propre à l'appli, conservée par draw.io) ; `fontSize` garde la taille réglée, que draw.io dessine telle quelle. Ctrl+Entrée ou clic ailleurs valide, Échap annule le texte (§14.1) |
| Lien, suppression | Panneau contextuel (à droite) : section « Lien » (page ou URL), « Supprimer » / **Suppr** ; **Échap** désélectionne (§14.1) |
| Tracé d'une flèche | Panneau contextuel, section « Tracé » : droite (« Straight » de draw.io : `edgeStyle` retiré, ligne droite par les points posés ; revenir aux coudes remet `edgeStyle=orthogonalEdgeStyle`), angles droits (`rounded=0`), coudes arrondis (`rounded=1`, tracé par défaut des flèches créées, paramètre `shapes.edgeLineStyle`) ou courbe (`curved=1` : courbes quadratiques par les coudes, passant par le milieu des segments, comme draw.io) ; la sélection au clic et le voile suivent le trait dessiné |
| Croisements d'une flèche | Panneau contextuel, section « Tracé » : saut là où la flèche passe au-dessus d'une autre, comme draw.io (`jumpStyle` : aucun, arc, coupure, marche, ligne ; `jumpSize` en pt, défaut 6, demi-longueur `(jumpSize − 2) / 2 + strokeWidth`) ; seule la flèche du dessus saute, pas de saut pour une flèche courbe ; une flèche sans `jumpStyle` suit sa page (panneau de la page, `spatial.jumps` sur `<diagram>`), sinon le paramètre `shapes.edgeJumpStyle` (taille sans `jumpSize` : `shapes.edgeJumpSize`) ; draw.io ne connaît que le `jumpStyle` de la flèche |
| Flèche coupée | Panneau contextuel, section « Tracé », case « Couper la flèche » (`split=1`, ticket 219) : seuls un tronçon au départ et un à l'arrivée sont dessinés (`render/edges/split.ts`), chacun avec sa pointe, sur `shapes.edgeSplitLength` (40 px, au plus la moitié de la flèche) ; sans texte de renvoi, il s'efface en fondu sur ses `shapes.edgeSplitFade` derniers pixels (opacité par sommet, `fadedStrokeMesh`) ; un texte de renvoi (`splitLabelLeft` côté source, `splitLabelRight` côté cible, champs « Renvoi départ / arrivée ») pose au bout un cadre (fond de la page, bord du trait, marge `shapes.edgeSplitLabelPadding`, texte à `shapes.edgeSplitLabelSize`, 7 pt) sur lequel le tronçon s'arrête net ; pas de saut aux croisements ; non sélectionnée, seuls les tronçons se cliquent (`userData.splitPaths`), sélectionnée, tout le tracé ; au survol (ticket 224), tronçons et bords de cadre 1 px plus épais et ligne droite entre les deux bouts coupés, depuis le bord d'un cadre de renvoi tourné vers l'autre bout (1 px à l'écran, noire à 30 %, ticket 225) au-dessus du schéma (`splitHoverOverlay`, `core/selection/splitHover.ts`) ; draw.io garde les clés et dessine la flèche entière |
| Bordure d'une forme | Panneau contextuel, section « Bordure » (formes sélectionnées, une étape d'annulation) : couleur (ou aucune), épaisseur, trait plein / tirets / pointillés, coins arrondis (rectangles) — clés `strokeColor`, `strokeWidth`, `dashed`, `dashPattern`, `rounded` ; c'est aussi le trait des arêtes du volume en iso / 3D |
| Position du texte d'une forme | Format du texte, pendant l'édition en place d'un texte de forme (section « Alignement », ligne « Position ») : grille 3 × 3 comme le menu « Position » de draw.io — au milieu (dans la forme) ou collé à un côté ou un coin ; clés `labelPosition`, `verticalLabelPosition` et l'alignement qui fait toucher la forme (`align`, `verticalAlign`), valeurs par défaut retirées (`edit/labelPosition.ts`, §8.3), une étape d'annulation ; l'éditeur suit le texte à sa nouvelle place et la saisie continue |
| Volume d'une forme | Panneau contextuel, section « Volume » : « Épaisseur » (`spatial.height`), « Élévation » (`spatial.elevation`) (§14.3) |
| Annuler / rétablir | Boutons de la barre d'outils, **Ctrl+Z**, **Ctrl+Maj+Z** / Ctrl+Y (§14.1) |
| Entrer dans un lien | **⌘ + clic** (touche et geste réglables : `controls.followLinkKey`, `controls.followLinkGesture`) ; maintenir ⌘ fait ressortir les zones liées |
| Retour | Bouton « Retour » + raccourci (ex. Backspace / Alt+←) |
| Basculer 2D ↔ iso | Boutons « 2D \| Iso » de la barre d'outils, touche **I** |

Le déplacement s'appuie sur les touches physiques (`KeyboardEvent.code`) pour gérer correctement les dispositions AZERTY / QWERTY ; les raccourcis (I, G, M, Entrée, Retour arrière) suivent la touche affichée (`KeyboardEvent.key`) et sont configurables (§13). Les touches sont ignorées pendant une saisie (champ, liste) ; Entrée est laissée aux boutons qui ont le focus.

**Glissade (drift).** Pour éviter les à-coups, un déplacement ne s'arrête pas net :

- **pas d'accélération** : pleine vitesse dès l'appui sur une touche ;
- **courte décélération** au relâchement (exponentielle, constante de temps ≈ 80 ms : arrêt en ≈ 250 ms, ≈ 50 px à la vitesse par défaut) ;
- même glissade au relâchement d'un glisser-déplacer si le pointeur était en mouvement (rien s'il était immobile) ;
- toute nouvelle action (molette, glisser, Entrée) interrompt la glissade ; réglable, 0 = arrêt net.

### 9.3 Barre d'outils de navigation

- **Entrée** bascule entre :
  - la **vue globale** : toute la page visible, dans l'orientation actuelle, sans plafond de zoom (un petit schéma remplit l'écran) ;
  - la vue **1:1** (zoom 100 %), autour du curseur s'il est sur le plan, sinon autour du centre.
  Depuis la vue globale on passe en 1:1 ; depuis toute autre vue, on revient à la vue globale. Transition animée courte (≈ 250 ms), instantanée si `prefers-reduced-motion`.
- À l'ouverture d'une page, le cadrage reste celui de draw.io : toute la page, **plafonné à 100 %**, nord en haut.

### 9.4 Changement de page

- Sélecteur de page (onglets) dans l'UI, comme dans draw.io.
- Chaque page conserve sa propre position de caméra : en revenant sur une page, on retrouve la vue de la dernière visite ; à la première visite, la page entière est cadrée.
- Changer de page ne reconstruit pas une scène déjà construite : les scènes restent en cache (`render/sceneManager`), une seule est visible. Le cache est plafonné (`preload.maxCachedPages`, 8 par défaut) et libère d'abord la page la moins récemment affichée, jamais la page courante.

---

### 9.5 Fond et grille

- La vue a un **fond** de couleur réglable (blanc par défaut) et une **grille** au sol, affichée par défaut, dans les trois modes (2D, iso, 3D) et la vue graphe.
- Grille par défaut comme draw.io : pas de **10 px**, une **ligne principale toutes les 4 cases**, lignes gris clair (les secondaires plus légères). Par défaut, le pas est celui de la page draw.io (`gridSize` de `<mxGraphModel>`, le même que l'aimantation à la grille §14.1) ; une page sans grille (`grid="0"`) prend le pas des paramètres.
- Réalisation : un plan au sol sous tout le reste, peint par un shader (couleur de fond + lignes) : lignes d'un pixel, nettes à tout zoom, couchées sur le sol en iso et en perspective en 3D. Quand les cases deviennent trop petites à l'écran (dézoom, lointain de la vue 3D), les lignes s'estompent au lieu de produire du moiré. Les formes, arêtes et volumes passent par-dessus ; la grille ne cache rien.
- Les labels `labelBackgroundColor=default` et le fond de la mini-carte suivent la couleur du fond.
- **Taille du texte créé** (paramètres `shapes.textSize`, 12 px, et `shapes.edgeEndTextSize`, 9 px) : écrite (`fontSize`) dans le style des formes de la palette, des flèches créées et des textes de début et de fin créés ; les fichiers existants gardent leur rendu (sans `fontSize`, 11 px comme draw.io).
- **Fond du texte des flèches** (paramètres `shapes.edgeLabelBackdrop`, `edgeLabelHaloWidth`, `edgeLabelHaloBlur`) : sans couleur de fond explicite dans le style (`labelBackgroundColor=#…`, qui l'emporte), le texte n'a pas de fond mais un **halo** de la couleur du fond autour de chaque lettre (1,5 px, bord flouté de 1 px par défaut) : lisible sur le trait, sans cacher la flèche. Au choix : **fond uni** (rectangle de la couleur du fond) ou **aucun**.
- Réglages : section « Fond et grille » du panneau Paramètres (§13).

## 10. Mini-carte

- En **bas à droite**.
- Toujours affichée **en vue de dessus**, même quand la caméra principale est en isométrique : c'est un repère stable.
- Affiche les formes de la page en version simplifiée.
- Affiche l'**emprise du viewport** : un rectangle en vue de dessus, un **trapèze** en vue isométrique (projection du frustum sur le sol).
- Clic / glisser sur la mini-carte pour déplacer la caméra.

Réalisation retenue :

- Canvas 2D superposé (`interaction/minimap.ts`), indépendant du rendu WebGL ; toujours **nord en haut**, quelle que soit la rotation de la vue principale. Largeur 200 px (`minimap.size`), hauteur selon les proportions de la page (bornée).
- Formes simplifiées : couleur de remplissage du style, contour fin gris ; arêtes en traits fins le long de leur tracé ; textes et groupes non dessinés. Le fond est mis en cache et redessiné seulement quand la page change ; l'emprise est redessinée à chaque mouvement de caméra.
- **Emprise exacte** : les quatre coins de l'écran projetés sur le sol. La caméra iso étant orthographique (§9.1), l'emprise en iso est un **rectangle tourné et allongé** (de 1 / cos(inclinaison)), et non un trapèze : il n'y a pas de perspective. En 3D (perspective), c'est un trapèze. Elle peut déborder de la mini-carte quand la vue couvre plus que la page.
- Clic ou glisser : la vue principale se recentre sur le point visé (zoom, rotation et inclinaison conservés).
- Repliable : bouton × sur la mini-carte, bouton « Mini-carte » pour la rouvrir, touche **M** ; choix mémorisé (`minimap.visible`).

---

## 11. Liens entre pages et transitions

### 11.1 Intention puis engagement

- **Simple clic** sur une forme ayant un lien vers une page : sélection + **préchargement** de la page cible en arrière-plan (construction de sa scène), sans rien afficher.
- **Touche pour suivre un lien + clic** (paramètres `controls.followLinkKey`, **⌘** par défaut, ou Ctrl, Maj, Alt ; `controls.followLinkGesture`, **clic** par défaut, ou double-clic ; sans touche = double-clic seul) : déclenche la **transition**. Sans la touche, le clic sélectionne et le double-clic édite le texte de la forme, comme draw.io. Dans la vue graphe, le double-clic seul suffit aussi.
- **Zones liées** : tant que la touche pour suivre un lien est maintenue seule, chaque forme ou flèche de la page qui porte un lien navigable est encadrée (voile d'accent léger et contour plein, au-dessus de tout, épaisseur constante à l'écran) ; relâchée (ou une autre touche pressée, ou la fenêtre quitte le premier plan), elles disparaissent. Masquées pendant une transition, elles reviennent sur la page d'arrivée si la touche est toujours maintenue.
- **Aide de la barre du bas** (appli de démo) : à droite de la barre des onglets, texte gris foncé aligné à droite, vide par défaut ; « Mode navigation » tant que la touche pour suivre un lien est maintenue, « Mode sélection multiple » tant que la touche de sélection multiple l'est avec une sélection. API : événement `modeHint` (`'navigation' | 'multiSelect' | undefined`), `engine.getModeHint()`.
- Option : préchargement au **survol prolongé** (≈ 300 ms, configurable), avec un **plafond** sur le nombre de scènes préchargées gardées en cache.
- **Sélection** : clic gauche sur une forme ou une arête (tolérance ≈ 6 px écran autour du tracé) ; mise en valeur par un **voile d'ombre** sur le reste de la page (défaut) : l'élément sélectionné est redessiné intact par-dessus (en iso, un bloc devant lui continue de le cacher, assombri) ; dans la vue graphe, la miniature suit sa carte ; pour une **flèche ou liaison**, le voile est **percé** d'une bande d'≈ 10 px (écran) de chaque côté de son tracé, extrémités arrondies (masque stencil, testé en profondeur : un bloc devant reste voilé). Variante (paramètre `selection.style`) : **contour** bleu pointillé d'épaisseur constante à l'écran, dont les tirets défilent lentement (« fourmis », 12 px/s ; fixe si les animations sont réduites). Clic dans le vide = désélection. **Changer de vue (2D ↔ iso ↔ 3D) garde la sélection** : voile, contour et poignées passent sur le rendu du nouveau mode.
- **Sélection multiple** : clic avec la touche de sélection multiple (paramètre `controls.multiSelectKey`, **Ctrl** par défaut ; ⌘ / Windows, Maj ou Alt au choix) = ajouter l'élément à la sélection, ou l'en retirer ; dans le vide, la sélection est gardée. Sur Mac, Ctrl+clic (qui ouvre normalement le menu contextuel) compte comme un clic avec Ctrl. Tous les éléments sélectionnés sont mis en valeur (voile percé autour de chaque flèche, ou un contour par élément) ; les poignées n'apparaissent que pour une forme ou une flèche seule. Glisser une forme sélectionnée déplace **toutes** les formes sélectionnées (une forme déjà emportée par un conteneur sélectionné ne bouge pas deux fois ; un seul « Déplacement » à annuler), et les **flèches sélectionnées** avec elles, comme draw.io : points intermédiaires et bouts libres décalés, un bout dont la forme ne bouge pas est **détaché** (`disconnectOnMove`, il devient libre là où il est) ; une flèche non sélectionnée garde ses points, ses points d'attache suivent les formes ; Suppr les supprime toutes. Le panneau contextuel affiche le nombre d'éléments, les styles (appliqués aux formes) et « Supprimer ». API : `Selection.items` (tous les éléments, dans l'ordre), `Selection.picked` (le dernier) ; `engine.toggleSelect(picked)`, `engine.selectItems(items)`. L'élément le plus haut dans l'ordre de dessin gagne (un enfant avant son conteneur) ; les groupes invisibles ne sont attrapés que s'ils portent un lien. Un appui suivi d'un glisser n'est pas un clic.
- **Aligner et répartir** (ticket 136, comme « Arrange › Align / Distribute » de draw.io) : avec au moins deux formes sélectionnées, section « Aligner » du panneau contextuel. **Par rapport à** (réglage `edit.alignReference`) : la sélection (son cadre), le premier ou le **dernier sélectionné** (défaut), qui ne bouge pas. Aligner : placer à gauche de la référence (bord contre bord), bords gauches, centres, bords droits, placer à droite ; de même au-dessus, hauts, milieux, bas, en dessous. **Répartir** (à partir de trois formes, grisé sinon) : bords gauches, centres, bords droits ou espacement égaux en largeur, de même en hauteur ; formes rangées par position, la première et la dernière restent en place. La forme déplacée est celle qui bouge vraiment (son groupe) ; une forme contenue dans une autre de la sélection suit celle-ci ; une forme verrouillée compte mais ne bouge pas ; les flèches de la sélection ne bougent pas d'elles-mêmes. Écrit dans `mxGeometry` (x / y), une étape d'annulation par clic (« Aligner », « Répartir »), répartition des flèches en ancrage automatique dans la même étape (`edit/align.ts`, `engine.alignSelection(move, reference)`, `engine.distributeSelection(move)`).
- **Repérage des liens** : au survol, curseur main et infobulle (« ⌘ + clic : aller à « Page-2 » », ou l'URL).

### 11.2 Transition « zoom + fondu »

1. La caméra s'anime vers la forme cliquée jusqu'à ce qu'elle **occupe tout l'écran**.
2. Pendant la fin du zoom, l'opacité de la forme (et de la page source) diminue.
3. La page cible apparaît en fondu, dans la même position visuelle, puis la caméra se recale sur la position mémorisée de la page cible (ou une vue d'ensemble).
4. Durée totale ≈ 1 s, configurable. Courbe d'animation configurable.

Contraintes :

- La page cible doit être **construite avant** le démarrage de l'animation (sinon à-coup). Si elle ne l'est pas, on la construit puis on lance l'animation.
- Les entrées utilisateur sont ignorées ou mises en file pendant la transition.
- Une option permet de désactiver les animations (accessibilité, `prefers-reduced-motion`).

Réalisation retenue — **un seul trajet de caméra**, sans étape intermédiaire :

- La page cible est **posée dans la forme** (similitude de son espace page : centrée, à l'échelle de la forme avec 10 % de marge) et grossit avec elle.
- La vue finale (caméra mémorisée de la page cible, sinon sa vue d'ensemble) est exprimée dans ce repère ; la caméra y va **directement**, en un zoom continu où un point de l'écran reste fixe (vrai zoom, pas de glissade du centre).
- Le fondu croisé (page source 1 → 0, cible 0 → 1) a lieu entre 25 % et 75 % de la durée.
- À l'arrivée, **bascule invisible** : la page cible devient la page courante sans transformation, avec sa vue finale (image identique à l'écran).
- La page source garde la caméra d'avant le plongeon (pour le retour).
- Changer de page ou de fichier pendant une transition l'interrompt proprement (opacités et transformations restaurées).

### 11.3 Retour

- **Pile de navigation** : à chaque transition on empile `{ pageId source, shapeId d'origine, état de caméra }`.
- **Retour** : dépile et ramène exactement à la position d'origine, avec une transition inverse (dézoom + fondu).
- **Si la pile est vide** et que la page courante est la cible de liens depuis plusieurs pages : on affiche un **menu des pages parentes possibles**, triées par **usage récent** (la plus récemment utilisée en haut). S'il n'y a qu'un parent, on y va directement.
- L'historique d'usage des liens est persisté par fichier.

Réalisation retenue :

- **Transition inverse** : la même transition que l'aller, jouée à l'envers en un seul trajet de caméra. La page courante est posée dans la forme d'origine (image identique au départ), la caméra recule jusqu'à la vue mémorisée de la page d'origine, la page courante rétrécit et s'efface.
- **Bouton « Retour »** (coquille React, `react/BackButton.tsx`) à gauche de la barre d'outils ; raccourcis **Retour arrière** et **Alt+←**. Infobulle indiquant la destination ; grisé s'il n'y a nulle part où revenir.
- **Pile vide** : le haut de pile ne compte que s'il mène à la page courante ; sinon on cherche les **pages parentes** (pages ayant un lien — forme de préférence, sinon arête — vers la page courante). Un seul parent : on y remonte directement, en sortant par la forme qui porte le lien. Plusieurs : **menu** sous le bouton, trié par usage récent (« il y a 5 min », « jamais utilisé »), fermé par Échap ou clic extérieur.
- **Usage des liens** (`from>to` → date) : enregistré à chaque lien suivi, persisté avec le fichier dans le `FileStore` (§5), comme la pile de navigation.
- Transitions désactivées ou `prefers-reduced-motion` : retour instantané, même pile, même vue d'arrivée.

### 11.4 Liens externes

Les liens URL ouvrent un nouvel onglet du navigateur (avec indication visuelle sur la forme), au ⌘ + clic (§11.1), sans accès retour à l'application (`noopener`).

Seules les URL `http:`, `https:` et `mailto:` sont considérées comme navigables. Les autres (`javascript:`, `file:`…) restent dans le modèle, pour la fidélité au fichier, mais ne sont ni signalées ni suivies.

---

## 12. Vue graphe de la documentation

- À partir des liens, on construit le **graphe de navigation** entre pages. Ce n'est **pas un arbre** : les cycles sont possibles.
- Vue dédiée, rendue dans le même moteur : chaque page devient un **plan flottant** (vignette de la page), reliée aux autres par des **arcs** orientés.
- Mise en évidence des **pages orphelines** (aucun lien entrant ni sortant) et des pages inaccessibles depuis la première page.
- Double-clic sur un plan = aller à la page.
- Disposition : algorithme de placement de graphe simple (force-directed ou couches), à affiner.

Réalisation retenue :

- Le graphe (`model/graph.ts`) vient des liens `data:page/id,…` des formes et des arêtes (comptés par paire de pages, liens vers soi exclus). Accessibilité et distance par parcours en largeur depuis la **première page**.
- La vue graphe est une **page générée** (`graph/graphPage.ts`, id `__graph__`) : une carte par page (cadre arrondi + titre), une flèche par paire de pages liées (`×n` s'il y a plusieurs liens ; deux flèches décalées pour un aller-retour). Rendu, sélection, survol, mini-carte, Entrée, iso… fonctionnent donc tels quels.
- **Disposition en couches**, de gauche à droite : distance depuis la page de départ, puis une colonne pour les pages **inaccessibles** (orange, pointillé), puis une pour les **orphelines** (rouge, pointillé) ; la page de départ est en bleu. Ordre du document dans chaque colonne.
- Chaque carte contient la **vraie page en miniature** (`graph/graphScene.ts`), nette à tous les zooms, posée exactement comme pendant une transition de lien : **double-clic sur une carte = plongée continue** dans la page (transition de lien, empilée dans l'historique) ; « Retour » ressort vers le graphe par la transition inverse.
- Accès : onglet **« Vue graphe »** en tête des onglets de pages (la page courante rétrécit dans sa carte), touche **G** (graphe ↔ dernière page affichée).
- Les cartes du graphe ne comptent pas dans l'usage des liens (§11.3).

---

## 13. Paramètres

Tout ce qui touche à l'expérience utilisateur est paramétrable, avec des valeurs par défaut agréables (`engine/settings/defaults.ts`) :

```ts
interface Settings {
  transition: {
    enabled: boolean; durationMs: number; easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'; // true, 1000, ease-in-out
    fadeStart: number; fadeEnd: number;                                                               // fondu croisé (§11.2) : 0.25, 0.75
  };
  preload: { onClick: boolean; onHover: boolean; hoverDelayMs: number; maxCachedPages: number };            // true, false, 300, 8
  controls: {
    moveKeys: 'letters' | 'arrows' | 'all'; // 'letters' = ZQSD (AZERTY) = WASD (QWERTY), mêmes touches physiques
    moveSpeed: number;                      // px écran / s au clavier (600)
    zoomSpeed: number;
    decelerationMs: number;                 // glissade à l'arrêt (§9.2), 0 = arrêt net (80)
    orbitSpeed: number;                     // rotation au clic droit, rad / px écran (0.005)
    clickSlop: number;                      // au-delà (px écran), un appui-relâché devient un glisser (4)
    maxReleaseSpeed: number; releaseWindowMs: number; stopSpeed: number; // glissade après un glisser : 3000 px/s, 80 ms, arrêt sous 8 px/s
    multiSelectKey: 'ctrl' | 'meta' | 'shift' | 'alt'; // touche + clic = sélection multiple (§11.1) : 'ctrl'
    followLinkKey: 'ctrl' | 'meta' | 'shift' | 'alt' | 'none'; // touche + geste = suivre un lien (§11.1) : 'meta'
    followLinkGesture: 'click' | 'doubleClick'; // geste pour suivre un lien, avec la touche : 'click'
    shortcuts: { toggleViewMode: 'i'; toggle3d: 'p'; toggleGraph: 'g'; toggleMinimap: 'm'; toggleFlatten: 'v'; overview: 'Enter'; back: 'Backspace'; deleteSelection: 'Backspace' };
  };
  view: {
    defaultMode: 'top' | 'iso' | '3d'; isoAngleDeg: number; isoAzimuthDeg: number; switchDurationMs: number; // 'top', 35.26, -45, 450
    isoVolume: boolean; isoDepth: number;                                                              // true, 32 (px), toutes les formes
    shadeLight: number; shadeDark: number;                    // luminosité des côtés des volumes : 0.9, 0.62
    facadeTags: boolean;                                      // étiquettes DB / QUEUE / CACHE sur les façades : true
  };
  camera: {                                                   // bornes et animations de la caméra (§9)
    minZoom: number; maxZoom: number;                         // 2D et iso : 0.05, 16
    minZoom3d: number; maxZoom3d: number;                     // 3D : 0.1, 4
    maxTilt3dDeg: number; fovDeg: number;                     // 3D : 65, 45
    animationMs: number;                                      // vue globale, réinitialiser la vue, aller à un élément : 250
    focusMaxZoom: number; focusPadding: number;               // aller à un élément : 2, 80 (px écran)
  };
  background: {                                                   // fond et grille (§9.5)
    color: string; grid: boolean; gridFromPage: boolean;          // '#ffffff', true, true
    gridSize: number; majorEvery: number; gridColor: string;      // 10 (2–200), 4 (1 = aucune), '#d4d9e0'
    minorStrength: number;                                        // intensité des lignes secondaires : 0.55
  };
  minimap: { visible: boolean; size: number;                      // true, 200
    edgeColor: string; outlineColor: string };                    // flèches, contour des formes : '#80868b', '#9aa0a6'
  selection: {
    style: 'veil' | 'outline'; veilOpacity: number; animated: boolean; speed: number; // 'veil', 0.35, true, 12
    veilColor: string; veilPadding: number;                       // '#202124', 10 (px écran autour d'une flèche)
    accentColor: string;                                          // contour, poignées, mini-carte : '#1a73e8'
  };
  shapes: {
    edgeFontColor: string;                                        // texte des flèches sans fontColor : '#000000'
    edgeLoopMargin: number;                                       // coudes d'une boucle, écart au cadre de la forme (px de page) : 20
    edgeBadgeRadius: number; edgeBadgeTextSize: number;           // pastille d'une flèche avec texte (§14.5) : 12, 15
    edgeBadgeSmallRadius: number; edgeBadgeSmallTextSize: number; // pastille d'une flèche sans texte : 5.5, 7
    edgeBadgeBorderColor: string; edgeBadgeBorderWidth: number;   // '#000000', 1
    edgeBadgeTextColor: string; edgeBadgeBold: boolean;           // '#000000', false
    edgeBadgeGap: number;                                         // écart avec le texte de la flèche : 2
    edgeDressingDarken: number;                                   // trait d'une flèche colorée par un mode : 0.25 (−25 %)
    modeDimOpacity: number;                                       // hors du courant d'un mode (flux courant) : 0.3
    modeBarSlideDuration: number;                                 // glissement de la barre du courant (ms, 0 = sans) : 200
    placeholderFill: string; placeholderStroke: string;           // formes non supportées (§8.4) : '#eeeeee', '#9e9e9e'
  };
  graph: {                                                        // vue graphe (§12)
    cardWidth: number; columnGap: number; rowGap: number;         // 260, 200, 90
    pairOffset: number;                                           // écart entre l'aller et le retour d'un lien : 16
    cardColor: string; orphanColor: string; unreachableColor: string; // '#9aa0a6', '#d93025', '#e37400' (départ : accentColor)
    arcColor: string; titleColor: string;                         // '#5f6368', '#202124'
  };
  edit: {                                                         // édition (§14)
    edgePickTolerance: number; handlePickTolerance: number;       // px écran : 6, 8
    handleSize: number; minShapeSize: number;                     // demi-côté des poignées (px écran) : 4 ; px de page : 10
    nudgeStep: number; nudgeCoarseStep: number;                   // flèches du clavier, px de page : 1 ; Maj : 0 = pas de grille
    alignReference: 'selection' | 'first' | 'last';                // référence d'« Aligner » (§11.1) : 'last'
    undoLimit: number; pasteOffset: number;                       // étapes d'annulation : 100 ; collage sans grille (px de page) : 10
    edgePointAlignTolerance: number;                              // point de flèche remis dans l'alignement, retiré sous (px écran) : 4
    connectHandleOffset: number; middleHandleMinSpan: number;     // poignées de connexion, écart (px écran) : 18 ; milieux masqués sous : 32
  };
  save: { autosave: boolean; delayMs: number; viewStateDelayMs: number; // true, 1000, 500 (position de consultation, §5.3)
    recentLimit: number };                                        // fichiers récents du lanceur : 20
  debug: { showUnsupportedPanel: boolean };                       // true
  accessibility: { reducedMotion: 'system' | 'always' | 'never' }; // 'system'
  panels: {                                                       // barres latérales de l'appli de démo (§14.1)
    left: { collapsed: boolean; width: number };                  // false, 208 (160–400)
    right: { collapsed: boolean; width: number };                 // false, 380 (240–600)
    stripText: 'up' | 'down';                                     // nom sur la bande repliée : 'up' (de bas en haut)
    shadow: number;                                               // ombre des barres sur la zone de dessin : 0.06 (0–0.3, 0 = aucune)
    minCanvas: number;                                            // largeur gardée à la zone de dessin : 320 (200–800)
  };
}
```

Les paramètres sont persistés (IndexedDB ou localStorage) et peuvent être passés en props au composant React.

Réalisation retenue :

- `mergeSettings` fusionne une modification **section par section** (raccourcis un par un), ignore les valeurs invalides et borne les nombres : un stockage abîmé ou ancien ne casse jamais l'application.
- Moteur : `new Engine({ settings })`, puis `engine.updateSettings(patch)` — tout s'applique immédiatement (contrôles, transitions, préchargement, taille du cache ; en iso, élévation et orientation animées ; bornes de caméra, couleurs, vue graphe). `<DrawioSpatial settings={…} />` les transmet.
- Les bornes de la caméra (zoom, inclinaison et champ de vision de la 3D) sont un réglage du module `interaction/camera` (`setCameraLimits`), commun à toutes les vues de la page. Un zoom maximal inférieur au minimal est ramené au minimal.
- Restent dans le code les valeurs purement techniques (ordres de dessin, tolérances numériques, stencil) et les valeurs de fidélité à draw.io (couleurs et tailles par défaut des styles).
- **Réduire les animations** : « comme le système » (`prefers-reduced-motion`, suivi en direct), « toujours » ou « jamais ». Réduites = transitions de liens, bascule iso, vue globale ↔ 1:1 instantanées, **glissade et contour de sélection animé** coupés.
- **Supprimer la sélection** (`deleteSelection`, Backspace par défaut, la touche « delete » du Mac ; Suppr fonctionne toujours) : prioritaire seulement s'il y a une sélection supprimable. Il peut partager sa touche avec Retour : Backspace supprime la sélection, sinon revient en arrière.
- **Raccourcis par touche affichée** (`KeyboardEvent.key`, insensibles à la casse) : « M » est la touche M en AZERTY comme en QWERTY. Le déplacement reste par position physique (`code`). Les touches de déplacement et Espace ne sont pas attribuables ; une touche déjà utilisée est refusée.
- Appli de démo : paramètres partagés entre fichiers, persistés dans le navigateur (`localStorage`, une seule clé ; les réglages enregistrés séparément auparavant sont repris une fois). Fenêtre modale **« Paramètres »** (bouton de la barre d'outils, au-dessus de l'appli ; croix ou Échap pour fermer), avec **tous** les paramètres, en sections et sous-sections, à la façon d'IntelliJ : à gauche l'arbre des catégories (sections dépliables sur leurs sous-sections), à droite les réglages du nœud choisi (une section entière ou une seule sous-section) sous un fil d'Ariane ; le dernier nœud choisi est repris à la réouverture. Sections : Navigation (clavier, souris), Vue (modes, vue isométrique, vue 3D, volumes), Caméra (zoom, animations, aller à un élément), Fond et grille, Sélection (mise en valeur, voile, contour), Liens entre pages (transitions, préchargement, vue graphe), Mini-carte, Formes et flèches (texte des flèches, formes non supportées), Édition, Sauvegarde, Raccourcis (cliquer puis appuyer sur la touche), Accessibilité, Diagnostics ; bouton « Réinitialiser ». Un réglage sans effet dans la configuration actuelle reste affiché, grisé. **Recherche** au-dessus de l'arbre, sur tous les réglages : à droite ne restent que les sections dont le texte (titres, libellés, choix, aides) contient la recherche, sans tenir compte des accents ni de la casse ; dans une section dont le titre ne correspond pas, seules les sous-sections qui correspondent restent ; l'arbre ne garde que ces nœuds, et un clic sur l'un d'eux fait défiler jusqu'à lui. Échap vide d'abord la recherche. Les réglages rapides de la barre (× de la mini-carte) écrivent dans les mêmes paramètres ; les réglages iso (orientation avec aperçu, élévation) ont leur section « Vue isométrique ».

---

## 14. Édition (M2)

### 14.1 Fonctionnalités

- **Nouveau fichier** à partir d'un squelette draw.io vide valide.
- Ajout / suppression / renommage de **pages**.
- **Palette** de formes (barre latérale gauche, comme celle de draw.io) : on **glisse-dépose** une forme sur le plan, elle est placée au point de dépôt (projection du curseur sur le sol, valable en vue de dessus comme en iso) ; un clic l'ajoute au centre de la vue. En haut, une **recherche** (en direct, casse et accents ignorés, sur le nom, les mots-clés et la catégorie de chaque forme ; plusieurs mots = tous présents ; Échap ou × la vide) ; en dessous, les formes en **grille d'icônes** (nom en infobulle), rangées par **catégorie** repliable (« Géométrie », « Général », « Architecture » ; état retenu dans le navigateur). En tête, la catégorie **« Utilisées »** montre une icône par type de forme présent sur la page courante (modèle reconnu d'après la définition de la forme résolue : chaque élément de la palette est une forme), dans l'ordre de la palette ; elle est masquée tant que la page n'a aucune forme reconnue et suit en direct ajouts, suppressions, annuler / rétablir et changement de page. Pendant une recherche, seules les catégories qui ont des résultats s'affichent, ouvertes. Modèles, catégories et mots-clés : `engine/edit/palette.ts` (`SHAPE_TEMPLATES`, `PALETTE_CATEGORIES`, `searchTemplates`, `templateOfShape`, `usedTemplates`).
- **Barres latérales** (appli de démo, `app/Sidebar.tsx`) : à gauche la palette (« Formes »), à droite le panneau contextuel ou les Diagnostics, **tous à la même largeur** (celle de la barre de droite : le plan ne bouge pas quand on passe de l'un à l'autre). Chaque barre se **replie** par son bouton `«` / `»` en haut : elle laisse place à une bande verticale fine portant son nom à la verticale, de bas en haut par défaut (paramètre « Barres latérales », ou de haut en bas) — « Formes » à gauche ; à droite le titre du panneau courant, suivi en direct (« Page », « Forme », « Flèche », « 3 formes », « Texte », « Diagnostics ») ; un clic sur la bande la rouvre. Ouvrir les Diagnostics depuis la barre d'outils rouvre la barre de droite ; un changement de sélection ne fait que changer le texte de la bande. Une **poignée** sur le bord intérieur de chaque barre ouverte règle sa largeur au glisser (gauche 160–400 px, droite 240–600 px, le plan garde au moins 320 px), au clavier (flèches ± 16 px, Origine = défaut) ou par double-clic (largeur par défaut : 208 / 380 px). Replis et largeurs sont dans les paramètres (`panels`, §13), enregistrés au repli / dépli et à la fin d'un glisser, rechargés au lancement, remis par défaut par « Réinitialiser ».
- **Déplacement** des formes à la souris, redimensionnement, édition du label.
- **Textes de début et de fin d'une flèche** (comme les multiplicités UML) : labels enfants de l'arête au format draw.io (`edgeLabel`, géométrie relative `x=-0.8` côté source, `x=0.8` côté cible, soit 10 % de la longueur depuis chaque bout). **Double-clic près d'un bout** de la flèche (dernier quart du tracé de chaque côté) : boîte de texte du début ou de la fin ; vers le milieu : label principal. Aussi par les champs « Début » et « Fin » du panneau contextuel (section « Texte »). Texte vide = label retiré. **Position des textes** : pendant l'édition en place d'un texte de flèche, une poignée ◇ sous le texte le déplace librement (position le long du tracé = point le plus proche, écart de côté, décalage `offset` gardé), écrit comme draw.io dans la géométrie relative du label (`x`, `y`, `<mxPoint as="offset">`), une étape d'annulation. **Configuration par défaut** (`edgeTextLayout`) d'un texte de début ou de fin créé, d'après le tracé : contre son bout (x = ±1, décalage de 6 px le long de la flèche et 4 px de côté), le texte s'éloignant de la forme et du trait — segment horizontal : début au-dessus du trait (`verticalAlign=bottom`), fin en dessous (`top`), aligné à gauche si la flèche part vers la droite depuis ce bout, à droite sinon ; segment vertical : début à droite du trait, fin à gauche, le texte partant le long du trait ; taille, couleur et écarts des paramètres `shapes.edgeEndTextSize` (9 px), `shapes.edgeEndTextColor` (gris), `shapes.edgeEndTextGapAlong` / `edgeEndTextGapAcross` (6 / 4 px). **Bascule de côté** : pendant l'édition d'un texte de début ou de fin dans sa configuration par défaut, une flèche à côté de la poignée ◇ le fait sauter de l'autre côté du trait (règle inversée : dessous au lieu de dessus, ou aligné à droite à gauche au lieu d'aligné à gauche à droite), puis le ramène ; un texte encore à créer est créé de ce côté. Placé à la main, le texte n'a plus de bascule. Le panneau contextuel (« Position des textes ») ancre chaque texte au **début**, au **milieu** (centré sur le trait) ou à la **fin**, avec cette même configuration ; un texte vaut texte de début ou de fin selon sa position (au-delà de ±0,5). Case « Texte du milieu : suit la flèche » (`spatial.labelFollow=1` dans le style de la flèche ; draw.io le garde horizontal) : le texte du milieu court le long du trait dessiné (coudes arrondis et courbes compris) : chaque lettre est posée sur le tracé et tournée selon sa tangente, le bloc centré sur le point d'ancrage (ou parti de lui / fini sur lui selon l'alignement), écart de côté gardé parallèlement au trait, plusieurs lignes empilées ; posé dans l'autre sens du tracé s'il se lirait de droite à gauche ou de bas en haut ; prolongé en ligne droite au-delà des bouts ; fond, souligné et barré non dessinés (`render/textPath.ts`). Il suit le tracé quand celui-ci change ou qu'on tire le texte. Case cochée, un champ « Décalage le long du trait (px) » (négatif possible) le fait glisser le long du trait pour l'ajustement fin (`spatial.labelFollowShift`) ; l'éditeur en place, tourné comme le trait, et sa poignée ◇ suivent le texte décalé. Un clic sur le texte d'une flèche (sa boîte dessinée, même loin du tracé) sélectionne la flèche ; un double-clic édite ce texte. **Ancrage par l'alignement**, comme draw.io : un texte de flèche aligné à gauche part de son point vers la droite (côté gauche fixe), aligné à droite vers la gauche, centré de part et d'autre ; de même en hauteur (aligné en haut : vers le bas ; en bas : vers le haut). Un label enfant existant au-delà de ±0,5 compte comme texte de début ou de fin (le plus proche du bout). API : `engine.setEdgeEndLabel(edgeId, 'start' | 'end', texte)`, `engine.editEdgeEndLabel(edgeId, end)` (événement `labelEdit` avec `end`).
- Création de connecteurs entre formes.
- **Bouts d'une flèche** (d'où elle part, où elle arrive), comme draw.io, dans les trois modes : une flèche sélectionnée seule montre une **poignée à chaque bout** (disque bleu = attaché à une forme, blanc = libre ; posée au niveau de la flèche). La tirer : près d'un **point d'ancrage** (mode manuel : sur chaque côté, les ancres déjà prises par des flèches — disque plein ; point fixe, ou point où le tracé d'une attache auto touche la forme ; le bout déplacé compte à sa place d'origine — et un point libre — croix — au milieu de chaque intervalle entre les coins et ces ancres, pour qu'il reste toujours un point libre entre deux ancres ; sans flèche, le milieu ; positions projetées sur le contour ; celui retenu cerclé ; tolérance 1,5 × `edit.handlePickTolerance`) = attache **fixe** (`exitX/exitY/exitDx/exitDy` pour la source, `entry…` pour la cible) ; sur l'**intérieur d'une forme** (contour surligné) = attache **auto** (ces clés retirées, le tracé choisit le côté) ; **dans le vide** = bout **libre** (`<mxPoint as="sourcePoint|targetPoint">` dans le repère du parent de la flèche, aimanté à la grille, Alt = libre ; attribut `source` / `target` retiré). Tracé recalculé en direct, une étape d'annulation (« Extrémité de flèche »). Les quatre poignées de connexion d'une forme (une par côté) suivent les mêmes règles (lâcher sur un point de connexion = entrée fixe) ; la flèche créée sort du côté de la poignée tirée, au point libre de ce côté le plus proche de la cible (`exitX/exitY` fixes) ; lâchée dans une forme, elle y arrive au point libre le plus proche du départ (`entryX/entryY` fixes) ; lâchée sur sa propre forme, elle **boucle** (départ : point libre du côté le plus proche de son milieu ; arrivée ailleurs) et ses coudes, à 20 px du cadre (`shapes.edgeLoopMargin`), sont écrits en points intermédiaires pour qu'elle tourne hors de la forme (même côté = U, côtés voisins = par le coin, côtés opposés = autour de la forme) ; déplacer un bout pour refermer une boucle recalcule ces coudes. **Variante de placement** (ancrage manuel, flèche sélectionnée seule reliée à deux formes) : la touche **F** (raccourci `controls.shortcuts.placementVariant`) applique tout de suite la variante qui suit le placement actuel ; les variantes sont les couples côté de départ × côté d'arrivée, chacun sur le point d'ancrage libre de ce côté le plus proche de l'autre forme (arrivée : le plus proche du départ ; boucle : ailleurs que le départ, avec ses coudes), rangées de la meilleure à la moins bonne (tracé qui ne traverse aucune forme d'abord, puis longueur et coudes ; `edit/anchoring/manual/variants.ts`) ; un appui = une étape d'annulation (« Variante de placement »), points intermédiaires retirés. **Ancrage automatique** (réglage d'appli `shapes.edgeAnchoring` « Ancrage des flèches » : Manuel par défaut, Automatique ou Typon ; une page peut le surcharger dans le panneau Page, attribut `spatial.anchoring="manual|auto|pcb"` de `<diagram>` — ce n'est pas un mode de page) : on ne vise que le **côté** de la forme (le plus proche du pointeur, surligné), la poignée de connexion fixe le côté de départ ; les flèches d'un côté y sont **réparties** à 1/(n+1), 2/(n+1)… (`exitX/exitY`, `entryX/entryY`), ordonnées par la position de la forme à leur autre bout (son centre, pas son point d'attache, qui dépend lui-même de la répartition) pour ne pas se croiser ; les flèches qui relient les deux mêmes côtés (faisceau) gardent un ordre cohérent aux deux bouts (même ordre entre côtés face à face, inversé pour un tracé en L) ; les deux bouts d'une boucle sur un seul côté y sont rangés ensemble, en fin de côté ; une attache auto compte sur le côté qui fait face à son autre bout et passe en point fixe. Recalcul après chaque édition (création, rattachement, suppression, déplacement, redimensionnement, collage) pour les formes touchées et leurs voisines, dans la même étape d'annulation (`edit/anchoring/auto/distribute.ts`) ; une forme **déplacée** voit ses flèches réparties et retracées en direct pendant le glisser (modèle seul, écrit au lâcher ; ticket 177), et un bout dont le côté qui fait face à l'autre forme a changé (une forme passée de l'autre côté de sa voisine) prend ce nouveau côté (`resitedEnds`) — un côté choisi qui ne fait pas face reste tant que les deux formes gardent leur position relative ; passer une page en automatique la répartit entière ; les coudes des boucles suivent. **Tracé automatique** (toujours en ancrage automatique, si possible ; réglages de Paramètres › Formes et flèches › Ancrage, groupe Automatique : « Contourner les formes et les flèches » `shapes.edgeAutoRoute`, « Écart aux formes » `shapes.edgeShapeClearance` 10 px, « Écart entre flèches » `shapes.edgeSpacing` 10 px, « Premier et dernier segments » `shapes.edgePortStub` 20 px, « Détour pour éviter un croisement » `shapes.edgeCrossingDetour` 500 px, appliqués à la prochaine modification d'une page ; sans contournement, une flèche recalculée perd ses points intermédiaires et reprend le tracé de draw.io, une boucle garde ses coudes) : le tracé orthogonal contourne les formes et ne se superpose pas aux autres flèches (voies parallèles) ; il est calculé par l'appli (`edit/anchoring/auto/avoid.ts` : premier et dernier segments perpendiculaires aux côtés, puis plus court chemin sur une grille tirée des formes et des flèches déjà tracées, coudes, superpositions et surtout croisements pénalisés — un croisement coûte le détour réglé ; les plus longues d'abord, coudes attirés vers le bout où converge le faisceau ; puis les flèches en conflit sont retirées ensemble et retracées dans les deux ordres, le jeu le moins conflictuel est gardé) et écrit en points intermédiaires, que draw.io suit tels quels ; recalculé avec la répartition pour les flèches des formes concernées et celles qui en traversent une ; sans chemin, la flèche reprend le tracé par défaut (ses anciens points intermédiaires sont retirés). La répartition ne s'appuie pas sur ces points intermédiaires (le bout d'une boucle garde sa place). **Autre agencement** (ancrage automatique, touche **F**, même raccourci que la variante de placement) : la graine de la page (`spatial.anchorSeed` sur `<diagram>`, absente = 0) est augmentée et les flèches réparties et retracées avec elle — autour de la flèche ou de la forme sélectionnée (ses formes et leurs voisines, leurs flèches et celles qui les traversent), sinon sur toute la page ; la graine départage les égalités (ordre d'un faisceau, ordre de tracé, choix entre détours de coût voisin, `edit/anchoring/auto/seed.ts`, `edit/anchoring/auto/arrange.ts`) sans changer les côtés ; les graines suivantes sont essayées (8 au plus) jusqu'à un agencement différent sans plus de croisements ni de superpositions qu'avec la graine 0 ; graine et modifications forment une seule entrée d'historique (« Autre agencement »). Les éditions suivantes reprennent la graine de la page. **Typon** (`pcb`, ticket 175 ; type `Anchoring` et `distributes` dans `edit/anchoring/mode.ts`) : comme l'automatique (côté seul visé, répartition, recalcul après chaque édition, touche F), mais le tracé est **octilinéaire** comme les pistes d'un circuit imprimé (segments à 0°, 45° et 90°, `edit/anchoring/pcb/octilinear.ts` : plus court chemin sur une grille au pas de l'écart entre flèches, 8 directions, premier et dernier segments perpendiculaires aux côtés) ; réglages propres, groupe Typon de Paramètres › Formes et flèches › Ancrage (ticket 186) : « Contourner les formes et les flèches » `shapes.edgePcbAutoRoute`, écart aux formes `shapes.edgePcbShapeClearance` 10 px, écart entre flèches = pas de la grille `shapes.edgePcbSpacing` 10 px, premier et dernier segments `shapes.edgePcbPortStub` 20 px, détour pour éviter un croisement `shapes.edgePcbCrossingDetour` 500 px, coût d'un coude à 45° `shapes.edgePcbBend45` 15 et à 90° `shapes.edgePcbBend90` 30 (pixels de longueur équivalente) ; sans chemin, la flèche est tracée quand même ; « Contourner » décoché : tracé octilinéaire direct. Écrit en points intermédiaires avec un tracé droit (`edgeStyle` retiré) pour que draw.io dessine les mêmes diagonales.
- **Découpage en morceaux**, avec les éditeurs de draw.io portés tels quels (`edit/edgePoints.ts`, mxGraph Apache 2.0), dans les trois modes ; poignées carrées entre les bouts de la flèche sélectionnée, aimantées à la grille (Alt = libre), une étape d'annulation (« Points de la flèche ») :
  - **orthogonale** (`orthogonalEdgeStyle`, `segmentEdgeStyle`) : une poignée au milieu de chaque segment, qui le déplace perpendiculairement (curseur `col-resize` / `row-resize`) ; les points écrits sont les coudes du nouveau tracé ; un tracé droit a trois poignées (celle du milieu crée un détour, les deux autres en transparence) ;
  - **coude** (`elbowEdgeStyle`, côte à côte, haut en bas) : une seule poignée, qui fixe le coude ; double-clic = bascule horizontal ↔ vertical (`elbow`) ;
  - **droite** : une poignée par point intermédiaire et une poignée virtuelle (en transparence) au milieu de chaque morceau, qui en ajoute un ; un point remis dans l'alignement de ses voisins (4 px écran) ou lâché sur une autre poignée disparaît ; double-clic sur un point = retiré ;
  - points écrits dans `<Array as="points">` (repère du parent de la flèche, au pixel) ; bouton **« Retour en auto »** (panneau, section « Tracé ») : points intermédiaires et points d'attache imposés retirés, la flèche reste reliée aux mêmes formes ; API `engine.resetEdgeRoute(edgeId)` ;
  - vérifié contre draw.io : la fixture `edge-points.drawio` (48 glisser, chaque poignée de 11 flèches tirée dans les deux sens, points écrits par `dragPoints`) est exportée en SVG par draw.io (`make drawio-check`) et chaque tracé tombe au pixel près sur le nôtre.
- Création de liens entre pages.
- Annuler / rétablir.
- **Sauvegarde** dans le même format `.drawio`.

### 14.2 Règle critique : édition in situ de l'arbre XML

- On **ne régénère jamais** le XML à partir du modèle neutre.
- On conserve l'**arbre XML d'origine** en mémoire et on ne modifie que les **nœuds et attributs concernés** (ex. `x`/`y` d'un `mxGeometry` après un déplacement).
- Les nouvelles formes sont ajoutées comme de nouveaux nœuds `<mxCell>` valides.
- Tout ce que le parseur ne comprend pas est donc **préservé tel quel**.
- **Déplacement** (réalisé) : seuls `x` / `y` du `<mxGeometry>` de la forme déplacée changent (relatifs au parent : les enfants suivent sans être réécrits) ; une valeur revenue à 0 est retirée, comme draw.io. Saisir une forme d'un groupe déplace le groupe le plus externe ; les formes à géométrie relative (ports) et verrouillées (`movable=0`, `locked=1`) ne se déplacent pas ; les arêtes reliées gardent leurs points intermédiaires et sont retracées.
- **État de vue par page** : attribut `spatial.view` de `<diagram>` (« clé=valeur; », angles en degrés), ex. `mode=iso;x=120;y=80;zoom=1.25;rotation=-45;tilt=54.74;elevation=35.26;azimuth=-45;volume=1;depth=24;`. Écrit à chaque sauvegarde pour les pages visitées. draw.io conserve le nœud `<diagram>` d'origine (il n'en remplace que le contenu), l'attribut survit donc à une sauvegarde dans draw.io. Ancien format sans `<diagram>` : non enregistré.
- **Création** (réalisé) : une forme de la palette devient un `<mxCell vertex="1">` avec son `<mxGeometry>`, ajouté à la fin de `<root>` sur le premier calque (créé s'il manque, ainsi qu'un modèle minimal pour une page vide), avec un id à la draw.io (préfixe aléatoire de la page + compteur). Une nouvelle page est un `<diagram>` issu du squelette vide (§6), ajouté à la fin de `<mxfile>` ; renommer change `name`, supprimer retire le `<diagram>` (un fichier garde au moins une page ; l'ancien format sans `<mxfile>` n'a pas de pages modifiables). L'indentation des voisins est reprise. Après une création, le modèle neutre est relu de l'arbre.
- **Édition avancée** (réalisé) : redimensionner réécrit `x`, `y`, `width`, `height` qui changent ; un label va dans `value` (ou `label` de l'enveloppe), échappé en HTML avec `<br>` si `html=1` ; un lien va dans l'attribut `link` d'un `<UserObject>` (une cellule nue est enveloppée comme le fait draw.io : `id` et `value` → `label` passent sur l'enveloppe) ; un connecteur est un `<mxCell edge="1" source target>` au style draw.io par défaut ; supprimer retire la cellule, ses descendants (contenu, labels d'arête) et les arêtes qui y sont reliées.
- **Annuler / rétablir** : par instantanés — avant chaque modification, le XML écrit est empilé (100 au plus) ; annuler relit l'instantané (modèle et scènes reconstruits, même page si elle existe encore). Le document n'est plus « modifié » quand on revient à l'état de la dernière sauvegarde.
- **Sauvegarde automatique** (paramètre « Sauvegarde », activée par défaut, délai 1 s réglable de 0,3 à 30 s) : peu après la dernière modification (ou annulation), jamais pendant un geste en cours, et en quittant s'il reste quelque chose. Navigateur : dans la bibliothèque (pas de téléchargement : « Enregistrer sous » télécharge) ; appli native : le vrai fichier est réécrit (un exemple embarqué : sa copie dans la bibliothèque). Rien n'est écrit si l'on est revenu à l'état enregistré. Un texte gris à droite de « Réinitialiser la vue » en donne l’état : « Saving... » (modification en attente ou en écriture), puis « All changes saved ».
- **Sauvegarde** (appli de démo) : XML réécrit en place, téléchargé sous le nom du fichier et enregistré dans la bibliothèque (`FileStore`) ; pastille sur le bouton tant qu'il reste des modifications, confirmation avant de quitter sans sauvegarder.
- Une page garde sa forme d'origine : une page compressée non modifiée est recopiée telle quelle (texte base64 intact) ; modifiée, elle est **réécrite compressée** comme le fait draw.io (XML → `encodeURIComponent` → deflate raw → base64). Une page illisible est recopiée sans y toucher et ne peut pas être modifiée.

### 14.3 Attributs 3D personnalisés

- Les informations propres au mode spatial (ex. hauteur, élévation, inclinaison future) sont stockées dans des **attributs personnalisés** (sur `<object>` / `<UserObject>` ou dans le style avec un préfixe dédié, ex. `spatial.elevation=…`).
- Préfixe unique pour éviter toute collision avec les attributs draw.io.
- Ces attributs **ne doivent pas être perdus** quand le fichier est ouvert puis sauvegardé dans draw.io. À vérifier par des tests manuels documentés (voir §15).

Réalisation retenue (`engine/spatial.ts`) :

| Attribut | Où | Effet |
|---|---|---|
| `spatial.kind` | style ou objet | Forme dessinée par Drawio Spatial : nom de l'interface (`database`, `queue`…) ou nom draw.io (`cylinder3`), à la place de celle devinée du style ; le style draw.io reste intact. Absent ou vide : devinée (`resolveShapeKind`) |
| `spatial.height` | style ou objet | Épaisseur du volume en iso, en pixels de page (défaut : réglage « Épaisseur ») |
| `spatial.elevation` | style ou objet | La forme flotte à cette hauteur au-dessus de sa base (sol, ou dessus de son conteneur) |
| `spatial.tag` | style ou objet | Étiquette des façades d'un bâtiment iso (BDD, file, cache) : remplace « DB », « QUEUE », « CACHE » ; vide = aucune. Mot de la tranche d'un process étiqueté (event consumer, tâches, process étiqueté) : remplace « CONSUMER », « TASK », « CRON », « PROCESS » ; vide = le mot par défaut |
| `spatial.sign` | style ou objet | Actor en iso / 3D : `0` = pas de pancarte, texte posé au sol ; absent = il tient son texte sur une pancarte |
| `spatial.nodes` | style ou objet | Cache distribué (`shape=datastore`) : nombre de disques empilés en iso / 3D (3 par défaut, 1–12) |
| `spatial.labelFollow` | style de la flèche | `1` : texte du milieu posé le long du trait de la flèche, lettre par lettre (jamais à l'envers) ; absent = horizontal, comme dans draw.io |
| `spatial.labelFollowShift` | style de la flèche | Texte du milieu qui suit la flèche : glissement le long du trait, en px (positif = vers la fin, négatif = vers le début) ; sans effet sans `spatial.labelFollow` |
| `spatial.view` | `<diagram>` | État de vue de la page (§14.2) |
| `spatial.mode` | `<diagram>` | Mode de la page (§14.5) : id d'un mode (`sequences`) ; absent = page normale |
| `spatial.flows` | `<diagram>` | Mode Séquences : flux de la page, liste ordonnée en JSON `[{"id","title","color"}, …]` |
| `spatial.flow`, `spatial.step` | style ou objet | Mode Séquences : flux d'une flèche (`id`) et son rang dans le flux (1…n) |
| `spatial.fields` | style ou objet | Mode RDD : champs d'une table, liste JSON de noms (`["name","created_at"]`) ; absent = aucun |
| `spatial.secondary` | style ou objet | Mode RDD : `1` = table secondaire, rendue 20 % plus petite |

- Lecture : style de la cellule, sinon attribut de son `<object>` / `<UserObject>` (« Modifier les données » dans draw.io) ; le style l'emporte. Valeurs négatives ou invalides ignorées.
- Écriture (panneau contextuel, section « Volume » : « Épaisseur », « Élévation » ; vide = valeur par défaut) : là où l'attribut est déjà (objet), sinon dans le style, clé modifiée en place ou ajoutée à la fin.
- Tout attribut préfixé `spatial.`, connu ou non, est conservé par l'appli (arbre XML d'origine) et par draw.io (vérifié avec draw.io 24.7.5, ci-dessous).

### 14.4 Critère d'acceptation

Ouvrir un fichier avec trois rectangles, les déplacer, sauvegarder, ouvrir le fichier dans draw.io : **les rectangles sont aux nouvelles positions** et le reste du fichier est **identique**.

### 14.5 Modes de page

Un **mode** spécialise une page (`spatial.mode` sur `<diagram>`) : données de page, réglages sur les éléments et
habillage du rendu, tout en attributs `spatial.*` : dans draw.io, la page reste une page normale. Guide :
`docs/AJOUTER_UN_MODE.md`.

- **Un dossier par mode, en miroir** : `src/engine/modes/<id>/` porte tout le mode (données, règles, opérations,
  habillage, cohérence ; `index.ts` exporte `definition: PageModeDefinition`) ; `src/app/modes/<id>/` porte seulement
  ses sections React du panneau (facultatif). Les deux registres collectent les dossiers tout seuls.
- **Un mode par page**, choisi dans le panneau de la page (« Mode »). Quitter un mode retire seulement
  `spatial.mode` : ses données dorment sur la page et ses éléments, et réapparaissent si on y revient. Un mode inconnu
  est signalé dans les diagnostics et affiché tel quel.
- **Contrat** (`modes/types.ts`) : réglages déclarés de la page, d'une flèche, d'une forme (case, nombre, texte,
  liste de choix ; lecture et écriture propres possibles), habillage (couleur imposée à une flèche, pastille face à
  la caméra), remise en ordre au mieux à la lecture (signalée dans les diagnostics) et écrite après une suppression,
  clés retirées des éléments collés ou dupliqués (sur toutes les pages).
- **Formes et vues d'un mode** (sujet 178) : un mode peut apporter ses formes (`modes/<id>/shapes/<forme>/index.ts`,
  même contrat que les formes de `impl/`, id préfixé par celui du mode) : elles se dessinent sur toute page, mais
  seule la palette d'une page du mode les propose. `shapes` (liste blanche d'ids) restreint la palette de la page,
  recherche comprise (sans toucher aux formes déjà posées ni au collage) ; `paletteCategories` ajoute des
  catégories, rangées par `order` avec celles de la palette ; une catégorie vide n'est pas affichée. `viewModes`
  restreint les modes d'affichage : la page s'affiche dans le premier permis (ouverture, changement de page, passage
  dans le mode, vue restaurée au rechargement), `I` / `P` sont sans effet et les boutons des autres modes désactivés
  (« non disponible dans ce mode ») ; en quittant la page, on retrouve la vue choisie par l'utilisateur.
  Registre : `paletteFor(page)`, `allowsViewMode(page, mode)`.
- **Écritures** : une opération de mode est une étape d'annulation (`Engine.editPageMode`) ; attribut de page sur
  `<diagram>`, attribut d'élément là où il est déjà (objet), sinon dans le style ; clé du style draw.io d'un élément
  (`setElementStyle`) et bornes d'une forme (`setShapeBounds`, sujet 179).
- **Mode RDD** (`rdd`, sujets 179 à 181, 215 à 223) : en 2D seulement ; la palette (catégorie « RDD ») ne
  propose que ses tables. Une table est un rectangle en deux zones : entête de 26 px de la couleur `fillColor` (nom
  centré, gras ; texte noir ou blanc selon le contraste), trait, puis zone blanche des champs (`spatial.fields`, un
  par ligne de 20 px, alignés à gauche). Aucune mention au-dessus du nom : chaque table a sa marque.
  - Icône d'entête (base commune des tables, déclarée par chaque forme) : en haut à droite de l'entête, 21 × 13,5 px
    à 7 px du bord, trait fin de la couleur de la bordure ; la zone du titre est réduite des deux côtés de sa place
    (32 px). Réglage « Icône » (cochée par défaut ; décochée, `spatial.icon=0` la masque et rend au titre toute la
    largeur).
  - « Entité » (`rdd-entity`) et « Entité énumérative » (`rdd-enum`, entête à cadre double : second trait 3 px à
    l'intérieur ; icône liste) : clé primaire `id` toujours en tête (créées avec `spatial.fields=["id"]`), soulignée, montrée en
    lecture seule dans le panneau (« Clé primaire ») et absente de « Champs » ; absente ou déplacée dans le fichier,
    elle est remise en tête à l'affichage et signalée dans Diagnostics.
  - « Embedded » (`rdd-embedded`) : objet incorporé, bas ondulé (une période sur la largeur, amplitude 2 px ; la
    table a 4 px de plus en bas) ; icône prise électrique (câble en S, deux broches).
  - « Document » (`rdd-document`) : document JSONB, coin plié en haut à droite (coin coupé, rabat plus sombre que
    l'entête, 10 px), clés connues en italique ; nom obligatoire : vide, il affiche « Document » et Diagnostics le
    signale.
  - « Vue » (`rdd-view`) : coins arrondis (`rounded=1;absoluteArcSize=1;arcSize=16`), entête coupé dans le contour ;
    icône jumelles.
  - Modèle abstrait (`rdd-model`) : nom en italique ; base technique des autres tables, jamais dans la palette,
    dessiné s'il est dans un fichier.
  - Table neuve au style « Gris » : entête `#f5f5f5`, bordure `#666666`, texte de l'entête `#333333` (`fontColor`, suivi
    par le rendu ; sans lui, noir ou blanc selon le contraste).
  - Réglages du mode sur une table : « Couleur » (le gris puis les couleurs `modePalette`, écrit aussi `fontColor` pour draw.io),
    « Table secondaire » (`spatial.secondary` : tailles × 0,8, forme mise à l'échelle depuis son coin haut-gauche),
    « Champs » (zone de texte, un par ligne ; la hauteur suit : entête + une ligne par champ, au moins une).
  - Fichier : `swimlane;startSize=26;fillColor=…;swimlaneFillColor=#ffffff;spatial.kind=rdd-…;…` : draw.io montre
    l'entête et sa couleur et les coins arrondis, pas les champs, le cadre double, le coin plié, la vague ni les icônes.
  - « Région » (`rdd-region`) : rectangle à fond opaque et bordure fine grise (`#969696`) ; couleurs propres aux régions,
    proposées par « Couleur » : `#fdebef`, `#eae4f1`, `#e7f5fd`, `#e7f3e7`, `#fefce8`, `#feefe3` ; 200 × 80 à la pose ; une région ajoutée
    prend la couleur au rang du nombre de ses sœurs (même région parente, ou premier niveau de la page) modulo 6 ; son nom (gras, 9 px, noir ou blanc selon le contraste) est sur un **onglet**
    au-dessus de son coin haut-gauche, coin carré, terminé par un S qui rejoint le bord haut, d'un seul contour avec la
    région (même fond, même bordure) ; même marge (6 px) de part et d'autre du nom, mesuré avec les polices du dessin ;
    l'onglet se clique comme la région, l'éditeur en place s'ouvre sur le nom ; posée au fond de la pile. Son **contenu** est
    calculé, rien n'en est écrit : les formes du mode dont le coin haut-gauche est dans la région, régions comprises,
    quelle que soit leur taille (deux coins au même point : la plus grande contient l'autre, à taille égale celle de
    derrière) ; dans deux régions imbriquées, une forme appartient à la plus petite (à taille égale, celle de devant). Déplacer la région déplace son contenu (régions incluses, flèches entre ces formes), en une étape
    d'annulation ; redimensionner ne déplace rien. Une forme du mode posée (déplacée ou ajoutée) dont le coin
    haut-gauche est dans une région mais qui en dépasse l'agrandit, avec 20 px de marge de chaque côté trop proche ;
    une forme déplacée qui sort de sa région par la gauche ou le haut en la chevauchant encore y reste et l'agrandit
    de ce côté (sauf si son coin entre dans une autre région qui n'englobe pas la sienne) ;
    dans la même étape d'annulation ; les régions englobantes suivent ; une région ne rétrécit jamais à cette occasion.
    Ordre de dessin : à la pose d'une forme du mode, les régions passent au fond de la pile, les plus englobantes
    derrière ; le contenu d'une région est ainsi toujours devant elle, à toute profondeur.
    Touche **`f`** sur une région sélectionnée seule : ajustée à son contenu (rectangle englobant, 20 px de marge de
    chaque côté ; grandit ou rétrécit), une étape d'annulation « Ajuster la région » ; région vide : rien ; sur un
    autre élément, `f` garde son effet. Réglage « Couleur » (fond, bordure et nom). Dans draw.io : un rectangle
    de la même couleur, le nom au-dessus à gauche dans un cadre de la couleur de la bordure (`labelBorderColor`) ; son
    contenu n'y suit pas ses déplacements.
- **Mode Séquences** (`sequences`) : en 2D seulement (`viewModes`) ; flux ordonnés (`spatial.flows`), une flèche dans un flux au plus
  (`spatial.flow`, `spatial.step`), rangs toujours consécutifs (ajout en n + 1, échange, resserrement). Flèche d'un
  flux : trait et pointes dans la couleur du flux assombrie (−25 % de luminosité), pastille du rang au-dessus du
  texte du milieu (plus petite au milieu de la flèche sans texte). Taille, bordure, chiffre et assombrissement : paramètres
  « Modes › Séquences » (§13). Couleur d'un nouveau flux : fonds des styles de forme des paramètres, à partir du
  troisième (`modePalette`, passée aux opérations par `ModeEdit.palette`).
- **Flux courant** (mode Séquences) : par défaut le premier flux, puis celui de la dernière flèche cliquée ou choisi
  dans la barre (un clic sur une flèche d'un autre flux ne fait que changer de flux ; un second clic la sélectionne) (état de session par page, non écrit). Barre en haut de la zone de dessin, de la couleur du flux, avec
  son titre centré (texte noir ou blanc selon le contraste) et, s'il y a au moins deux flux, des boutons précédent /
  suivant en boucle ; un clic sur le titre le renomme sur place (composant commun `InlineEdit`, nom vide
  refusé) ; pastille de couleur cerclée dans le panneau. La barre part au début d'une transition entre pages (elle
  remonte hors de la vue) et n'arrive qu'à sa fin (elle descend à sa place), glissement réglable (« Glissement de la
  barre du flux », `shapes.modeBarSlideDuration`, 200 ms, 0 = sans). Tout ce qui ne touche pas ses flèches (flèches hors du flux,
  formes qu'aucune ne relie) est estompé à 30 % (paramètre « Opacité hors du flux courant ») ; flux sans flèche :
  rien d'estompé. Une flèche tirée depuis une forme va à la fin du flux courant (même étape d'annulation). « + » / « - » sur
  une flèche d'un flux sélectionnée seule : rang suivant / précédent. Cadre générique : `current`, `edgeCreated` et
  `keys` de `PageModeDefinition`, courant gardé par le moteur (`getModeCurrent`, `getModeIndicator`, `setModeCurrent`, événement
  `modeCurrentChange`).

---

## 15. Tests

- **Unitaires (Vitest)** : décompression, parsing des styles, calcul des coordonnées absolues (groupes imbriqués), extraction des liens, graphe de navigation, pile d'historique.
- **Fixtures** : un dossier de fichiers `.drawio` variés (compressés / non compressés, multi-pages, groupes, liens, formes exotiques).
- **Aller-retour (M2)** : `parse → write sans modification` doit produire un XML **sémantiquement identique** à l'original ; `parse → déplacement → write` ne doit modifier que les attributs attendus (diff XML).
- **Compatibilité draw.io (M2)** : procédure de test manuelle documentée (ouvrir dans draw.io, sauvegarder, rouvrir dans l'application, vérifier les attributs spatiaux). Procédure du critère §14.4 :
  1. Ouvrir l'exemple `fixtures/three-rectangles.drawio`, déplacer A, B et C (en 2D et en iso), passer en iso, Sauvegarder.
  2. Ouvrir le fichier téléchargé dans draw.io : rectangles aux nouvelles positions, flèche A → B retracée, rien d'autre de changé. Le déplacer un peu dans draw.io, enregistrer.
  3. Rouvrir ce fichier dans l'application (glisser-déposer) : positions de draw.io, et même vue iso qu'à l'étape 1 (attribut `spatial.view` conservé).
- **Conservation par draw.io, automatisée** : `make drawio-check` fait réenregistrer les fixtures par le draw.io installé (`draw.io -x -f xml --uncompressed`, qui charge le fichier dans l'éditeur puis l'écrit) dans `tests/fixtures/drawio-saved/`, puis vérifie que pages, `spatial.view`, attributs `spatial.*` (style et objet) et géométries sont identiques (`tests/engine/spatial`). Les sorties sont versionnées : le test tourne aussi sans draw.io. Exclues car volontairement invalides pour draw.io : `broken.drawio`, `groups.drawio` (parent inexistant : draw.io perd la page), `roundtrip.drawio` (élément inconnu dans `<root>` : export refusé). L'export en ligne de commande passe en mode visionneuse (`grid`, `page`, `dx`/`dy` de `<mxGraphModel>` réécrits) : ces attributs ne sont pas comparés.
- **Procédure manuelle des attributs spatiaux** (sauvegarde interactive, complément de `make drawio-check`) :
  1. Ouvrir l'exemple `fixtures/spatial.drawio` dans l'appli (vue iso : socle épais, forme posée dessus, bloc haut, ellipse qui flotte) ; changer l'épaisseur d'une forme dans le panneau contextuel ; Sauvegarder.
  2. Ouvrir le fichier dans draw.io : clic droit sur une forme → « Modifier le style » (`spatial.height=…`, `spatial.elevation=…`) et « Modifier les données » (`spatial.height`, `spatial.note` du bloc vert) ; déplacer une forme, enregistrer.
  3. Rouvrir le fichier dans l'appli : mêmes volumes, même élévation, même vue iso ; seule la forme déplacée a bougé.
- Le moteur étant indépendant de React, la majorité des tests ne nécessite pas de navigateur.

---

## 16. Packaging (M3)

- Composant `<DrawioSpatial />` publiable (props : contenu ou `FileStore`, `settings`, callbacks).
- Wrapper Electron ou Tauri avec `FsStore` (fichiers récents = vrais chemins sur le disque, sauvegarde directe).

Réalisation retenue : **Electron**, construit entièrement dans Docker (Tauri exigerait le SDK macOS et Rust sur la machine).

- `desktop/` : `main.cjs` (fenêtre, dialogues, lecture / écriture de fichiers), `preload.cjs` (pont `window.drawioSpatialDesktop`, contexte isolé et bac à sable), `package.mjs` (empaquetage), `Dockerfile` (Node figé, `zip`, `rcodesign`).
- Le runtime Electron **de la machine hôte** (ex. macOS arm64) est téléchargé dans le conteneur (`ELECTRON_INSTALL_PLATFORM`), l'appli web construite en chemins relatifs (`desktop/web/`), puis assemblée en `dist-desktop/Drawio Spatial.app` (Info.plist renommé) et **signée ad hoc par `rcodesign`** (signature valide pour `codesign --deep --strict`, obligatoire sur Apple Silicon), avec un `.zip`. Linux : dossier + `tar.gz`. Sur la machine, seule l'ouverture de l'appli (`open`) a lieu.
- Pas de `.dmg` (impossible sous Linux) ; signature Developer ID et notarisation : possibles plus tard avec `rcodesign` et un compte Apple.
- **Sécurité** : l'interface n'a accès qu'au pont ; lecture des seuls `.drawio` / `.xml` en chemin absolu ; écriture seulement des fichiers choisis par l'utilisateur (dialogue, glisser-déposer) ou déjà dans la bibliothèque au démarrage ; écritures atomiques ; liens externes ouverts dans le navigateur (http, https, mailto), aucune autre navigation.
- **Dans l'appli** : « Ouvrir un fichier… » et « Nouveau fichier » passent par les dialogues du système ; un fichier glissé-déposé garde son chemin ; « Sauvegarder » réécrit le vrai fichier (un exemple embarqué propose « Enregistrer sous », puis on continue sur le fichier créé).
- Commandes : `make desktop-install` (runtime), `make desktop-package` (construit et signe), `make desktop` (construit puis ouvre), `make desktop-dev` (fenêtre native sur le serveur de dev, rechargement à chaud), `make desktop-lock`.

---

## 17. Questions ouvertes

- ~~Bibliothèque de texte définitive~~ → troika-three-text (SDF), Roboto embarquée (§8.5).
- ~~Comportement exact du pan à la souris~~ → glisser molette, clic droit et Espace + glisser déplacent la vue (§9.2) ; le mode « Tourner » a été retiré.
- Rendu des formes en volume (extrusion) : souhaité un jour ?
- Disposition de la vue graphe (force-directed vs couches).
- ~~Réécriture compressée ou non des pages modifiées~~ → page compressée réécrite compressée (§14.2).
- Gestion des calques draw.io multiples (affichage, visibilité).
