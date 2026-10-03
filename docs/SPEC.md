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
      shapes/          # une définition par forme, tous niveaux de rendu (§8.2)
        types.ts       # ShapeDefinition, niveaux, contrat mini-carte
        registry.ts    # résolution forme → définition → rendu d'un niveau (repli à plat)
        rectangle.ts
        ellipse.ts
        text.ts
        group.ts
        placeholder.ts
        minimapPainters.ts # repli mini-carte : contour de la forme
      flat/            # briques du rendu à plat (boîte, label)
      edges/           # arêtes : tracé, pointes, labels
      geometry/        # contours, traits épais, pointillés
      pageScene.ts     # construction de la scène d'une page à un niveau donné
      sceneManager.ts  # scènes construites (par page et par niveau), visibilité, cache
    interaction/
      camera.ts        # ortho / iso, pan, zoom, état sérialisable
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
    settings.ts
    Engine.ts          # façade publique du moteur
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

Chaque type de forme est décrit par une **définition** qui s'enregistre auprès d'un registre. Le moteur ne connaît que l'interface commune. Guide pas à pas pour en ajouter une : [AJOUTER_UNE_FORME.md](AJOUTER_UNE_FORME.md).

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
  kind: string;
  matches?(shape: ShapeModel): boolean;        // par défaut : correspondance sur kind
  outline?(shape: ShapeModel): Point[];        // contour au sol : géométrie de référence (rendu à plat, replis)
  flat: SceneRenderer;                         // obligatoire
  iso?: SceneRenderer;
  volume?: SceneRenderer;
  minimap?: MinimapPainter | null;
}

interface SceneRenderer {
  create(shape: ShapeModel, ctx: RenderContext): THREE.Object3D; // en espace page
}
```

- Le registre résout la définition d'une forme (placeholder si aucune), puis le rendu d'un niveau : `registry.sceneRenderer(shape, level)` (repli `flat`), `registry.minimapPainter(shape)` (repli contour).
- Une page est construite **au niveau du mode de vue** (iso en mode iso, à plat sinon). Si aucune forme de la page n'a de rendu propre à ce niveau, la scène à plat est réutilisée telle quelle : pas de reconstruction en basculant de mode. Le cache de scènes est donc indexé par page **et** niveau.
- Rectangles, ellipses et placeholders ont un rendu `iso` en volume (§9.1) ; le texte et les groupes restent à plat.
- Les arêtes ont pour l'instant un rendu unique (à plat), et un tracé simplifié en mini-carte.

Ajouter une forme = **écrire sa définition et l'enregistrer** (au minimum `flat`, idéalement `outline`). Aucune autre modification ; les niveaux plus riches s'ajoutent ensuite, forme par forme.

### 8.3 Formes supportées en M1

- Rectangle (y compris arrondi),
- Ellipse,
- Texte seul,
- **Stockage** (formes natives de draw.io, dessinées comme draw.io en 2D, en vrai volume en iso / 3D ; aussi dans la palette) :

  | Usage | Style draw.io | 2D | Iso / 3D |
  |---|---|---|---|
  | Base de données | `shape=cylinder3` (`size`, 8 dans la palette ; `boundedLbl`) | le cache avec une seule lèvre (même ellipse de 8 px), label sous l'ellipse du haut | bloc plein et droit, dont les quatre faces portent 2 ou 3 arcs « sourire » **gravés** (les lèvres du pictogramme BDD ; même gravure que les chevrons de la file : rainure sombre et arête claire) |
  | File (queue) | `shape=cylinder3;direction=south` (palette : 100 × 30, `size=8`) ; `shape=mxgraph.flowchart.direct_data` aussi | cylindre couché, bout visible à droite (`north` : à gauche) ; label décalé comme dans draw.io | bloc dont les faces longues portent une rangée de chevrons ▶ **creusés** (rainure sombre et arête claire) dans le sens du flux (vers le bout visible en 2D) |
  | Cache distribué | `shape=datastore` | cylindre à trois anneaux, de taille fixe | tranches empilées, une par nœud (`spatial.nodes`, 3 par défaut, 1–12), séparées par une rainure en retrait plus sombre, voyants (couleur d'accent) sur les quatre faces |

  En iso / 3D, ce sont des **« bâtiments »** (`render/iso/buildings.ts`), comme les familles de bâtiments d'un jeu de construction : emprise = le rectangle 2D de la forme, **toit plat et rectangulaire** en haut (bordé, avec le label : toujours lisible), et une **façade propre au type** dans l'épaisseur, sur les quatre côtés (lisible sous tous les angles). Hauteur par défaut : la **même épaisseur que toutes les formes** (réglage `view.isoDepth`, 32 px), `spatial.height` prioritaire. **Étiquette de façade**, comme une enseigne : « DB », « QUEUE » ou « CACHE » en bas à droite de chaque face, à l'endroit vu de l'extérieur, discrète (teinte des gravures) ; les motifs (arcs, chevrons) se placent au-dessus ; sur le cache, dans la tranche du bas (voyants à l'autre bout). `spatial.tag` la remplace (ex. `PostgreSQL`, `Kafka`), vide = aucune ; réglage `view.facadeTags` (activé) pour toutes les couper. Sans fond (`fillColor=none`), le dessin 2D reste à plat.

  **Redimensionnement** : le corps du cylindre s'étire, les ellipses gardent leur taille. Les trois formes ont la **même ellipse**, de 8 px (celle de draw.io pour un cache de 60 px de haut) ; le bout de `direct_data` reste à 9/98 de la largeur, comme draw.io. **Écarts assumés avec draw.io** : draw.io agrandit les anneaux du cache avec sa hauteur, et dessine l'ellipse du `cylinder3` de hauteur `size` (15 par défaut) ; avec les valeurs de la palette (`size=8`, cache de 60 px), le rendu est identique dans les deux. Contour par défaut : épaisseur 1, comme les autres formes.
- Connecteurs (arêtes) : segments, points intermédiaires, flèche de fin,
- Couleurs de remplissage, de bordure, épaisseur de trait, pointillés, label centré.

**Connecteurs.** draw.io n'enregistre que les points intermédiaires posés par l'utilisateur : le tracé (coudes, points d'attache) est **recalculé à l'affichage**, de façon simplifiée mais déterministe :

- styles : droit (de contour à contour), `orthogonalEdgeStyle` / `segmentEdgeStyle`, `elbowEdgeStyle` (horizontal / vertical) et ses variantes ; un style inconnu est approché par l'orthogonal et journalisé (§8.4) ;
- points d'attache imposés (`exitX/exitY`, `entryX/entryY` et décalages), formes en vis-à-vis (segment droit), arrivée sur la cible **sans demi-tour** ;
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
- **Volume en iso** (niveau de rendu `iso`, §8.2) : rectangles, ellipses et placeholders deviennent des **blocs** posés au sol. Le dessus reprend le rendu à plat (fond, bordure, label, pastille de lien) ; les côtés reprennent la couleur de fond, assombrie selon l'orientation de chaque face (lumière fixe dans la page : en iso par défaut, face visible gauche claire, droite plus sombre). Matériaux opaques avec test de profondeur : les blocs se cachent entre eux et cachent ce qui est derrière.
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
| Sélectionner | Clic gauche |
| Déplacer une forme | Clic gauche + glisser sur la forme (vue de dessus comme iso), aimanté à la grille de la page ; **Alt** maintenu : sans grille (§14.1) |
| Sauvegarder | Bouton « Sauvegarder », **Ctrl+S** / ⌘S (§14.1) |
| Ajouter une forme | Glisser une forme de la palette sur le plan (déposée au point visé, au sol), ou clic dessus (centre de la vue) (§14.1) |
| Pages | Onglets : **+** ajoute, double-clic renomme, **×** supprime la page affichée (§14.1) |
| Redimensionner / connecter | Poignées de la forme sélectionnée : carrés = redimensionner (grille, Alt = libre), disque bleu à droite = tirer vers une autre forme pour la relier (§14.1) |
| Éditer un texte | Double-clic (élément sans lien), **F2** ou « Modifier » dans le panneau contextuel : **édition en place**, dans la police, la taille, la couleur et l'alignement du label (le label dessiné est masqué pendant la saisie) ; texte d'une flèche : ancré sur son point, à la taille du texte, avec le même fond que le label dessiné. Pendant l'édition, le panneau contextuel montre le **format du texte** : styles de texte (paramètre `styles.text` : **Classique** 12 px, **Feutré** gris 9 px, **Code** en police à chasse fixe `fontFamily=Courier New`, dessinée en Roboto Mono), gras, italique, souligné, barré (**Ctrl+B**, **Ctrl+I**, **Ctrl+U**), taille, couleur, alignement horizontal et vertical (pas de vertical pour une flèche). **Avec une partie du texte sélectionnée**, gras, italique, souligné, barré, taille, couleur et styles de texte s'appliquent à la sélection : **texte riche** écrit en HTML draw.io (`<b>`, `<i>`, `<u>`, `<strike>`, `<span style="font-size; color; font-family">`, le style passe en `html=1`), relu tel quel par draw.io et dessiné par le moteur (mise en page des segments `render/richLayout`, un texte SDF par mot, traits de souligné et de barré). **Sans sélection**, tout le texte : clés `fontStyle` (bits 1 gras, 2 italique, 4 souligné, 8 barré), `fontSize`, `fontColor`, `fontFamily`, `align`, `verticalAlign` du style, une étape d'annulation par changement, et les mises en forme partielles de même nature sont retirées. L'alignement vaut toujours pour tout le texte. Ctrl+Entrée ou clic ailleurs valide, Échap annule le texte (§14.1) |
| Lien, suppression | Panneau contextuel (à droite) : section « Lien » (page ou URL), « Supprimer » / **Suppr** ; **Échap** désélectionne (§14.1) |
| Volume d'une forme | Panneau contextuel, section « Volume » : « Épaisseur » (`spatial.height`), « Élévation » (`spatial.elevation`) (§14.3) |
| Annuler / rétablir | Boutons de la barre d'outils, **Ctrl+Z**, **Ctrl+Maj+Z** / Ctrl+Y (§14.1) |
| Entrer dans un lien | Double-clic |
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
- **Double-clic** : déclenche la **transition**.
- Option : préchargement au **survol prolongé** (≈ 300 ms, configurable), avec un **plafond** sur le nombre de scènes préchargées gardées en cache.
- **Sélection** : clic gauche sur une forme ou une arête (tolérance ≈ 6 px écran autour du tracé) ; mise en valeur par un **voile d'ombre** sur le reste de la page (défaut) : l'élément sélectionné est redessiné intact par-dessus (en iso, un bloc devant lui continue de le cacher, assombri) ; dans la vue graphe, la miniature suit sa carte ; pour une **flèche ou liaison**, le voile est **percé** d'une bande d'≈ 10 px (écran) de chaque côté de son tracé, extrémités arrondies (masque stencil, testé en profondeur : un bloc devant reste voilé). Variante (paramètre `selection.style`) : **contour** bleu pointillé d'épaisseur constante à l'écran, dont les tirets défilent lentement (« fourmis », 12 px/s ; fixe si les animations sont réduites). Clic dans le vide = désélection. **Changer de vue (2D ↔ iso ↔ 3D) garde la sélection** : voile, contour et poignées passent sur le rendu du nouveau mode.
- **Sélection multiple** : clic avec la touche de sélection multiple (paramètre `controls.multiSelectKey`, **Ctrl** par défaut ; ⌘ / Windows, Maj ou Alt au choix) = ajouter l'élément à la sélection, ou l'en retirer ; dans le vide, la sélection est gardée. Sur Mac, Ctrl+clic (qui ouvre normalement le menu contextuel) compte comme un clic avec Ctrl. Tous les éléments sélectionnés sont mis en valeur (voile percé autour de chaque flèche, ou un contour par élément) ; les poignées n'apparaissent que pour une forme seule. Glisser une forme sélectionnée déplace **toutes** les formes sélectionnées (une forme déjà emportée par un conteneur sélectionné ne bouge pas deux fois ; un seul « Déplacement » à annuler) ; Suppr les supprime toutes. Le panneau contextuel affiche le nombre d'éléments, les styles (appliqués aux formes) et « Supprimer ». API : `Selection.items` (tous les éléments, dans l'ordre), `Selection.picked` (le dernier) ; `engine.toggleSelect(picked)`, `engine.selectItems(items)`. L'élément le plus haut dans l'ordre de dessin gagne (un enfant avant son conteneur) ; les groupes invisibles ne sont attrapés que s'ils portent un lien. Un appui suivi d'un glisser n'est pas un clic.
- **Repérage des liens** : pastille bleue au coin haut-droit des formes liées (→ page, ↗ URL) ; au survol, curseur main et infobulle (« Double-clic : aller à « Page-2 » », ou l'URL).

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

Les liens URL ouvrent un nouvel onglet du navigateur (avec indication visuelle sur la forme), au double-clic, sans accès retour à l'application (`noopener`).

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

Tout ce qui touche à l'expérience utilisateur est paramétrable, avec des valeurs par défaut agréables (`engine/settings.ts`) :

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
    multiSelectKey: 'ctrl' | 'meta' | 'shift' | 'alt'; // touche + clic = sélection multiple (§11.1) : 'ctrl'
    shortcuts: { toggleViewMode: 'i'; toggle3d: 'p'; toggleGraph: 'g'; toggleMinimap: 'm'; overview: 'Enter'; back: 'Backspace'; deleteSelection: 'Backspace' };
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
  minimap: { visible: boolean; size: number };                    // true, 200
  selection: {
    style: 'veil' | 'outline'; veilOpacity: number; animated: boolean; speed: number; // 'veil', 0.35, true, 12
    veilColor: string; veilPadding: number;                       // '#202124', 10 (px écran autour d'une flèche)
    accentColor: string;                                          // contour, poignées, pastilles de lien, mini-carte : '#1a73e8'
  };
  shapes: {
    edgeFontColor: string;                                        // texte des flèches sans fontColor : '#000000'
    placeholderFill: string; placeholderStroke: string;           // formes non supportées (§8.4) : '#eeeeee', '#9e9e9e'
  };
  graph: { cardWidth: number; columnGap: number; rowGap: number }; // vue graphe (§12) : 260, 200, 90
  edit: {                                                         // édition (§14)
    edgePickTolerance: number; handlePickTolerance: number;       // px écran : 6, 8
    handleSize: number; minShapeSize: number;                     // demi-côté des poignées (px écran) : 4 ; px de page : 10
  };
  save: { autosave: boolean; delayMs: number; viewStateDelayMs: number }; // true, 1000, 500 (position de consultation, §5.3)
  debug: { showUnsupportedPanel: boolean };                       // true
  accessibility: { reducedMotion: 'system' | 'always' | 'never' }; // 'system'
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
- Appli de démo : paramètres partagés entre fichiers, persistés dans le navigateur (`localStorage`, une seule clé ; les réglages enregistrés séparément auparavant sont repris une fois). Panneau **« Paramètres »** (bouton de la barre d'outils) à côté de la vue, avec **tous** les paramètres, en sections et sous-sections : Navigation (clavier, souris), Vue (modes, vue isométrique, vue 3D, volumes), Caméra (zoom, animations, aller à un élément), Fond et grille, Sélection (mise en valeur, voile, contour), Liens entre pages (transitions, préchargement, vue graphe), Mini-carte, Formes et flèches (texte des flèches, formes non supportées), Édition, Sauvegarde, Raccourcis (cliquer puis appuyer sur la touche), Accessibilité, Diagnostics ; bouton « Réinitialiser ». Un réglage sans effet dans la configuration actuelle reste affiché, grisé. **Recherche** en haut du panneau : seules les sections dont le texte (titres, libellés, choix, aides) contient la recherche restent affichées, sans tenir compte des accents ni de la casse ; dans une section dont le titre ne correspond pas, seules les sous-sections qui correspondent restent. Échap vide la recherche. Les réglages rapides de la barre (× de la mini-carte) écrivent dans les mêmes paramètres ; les réglages iso (orientation avec aperçu, élévation) ont leur section « Vue isométrique ».

---

## 14. Édition (M2)

### 14.1 Fonctionnalités

- **Nouveau fichier** à partir d'un squelette draw.io vide valide.
- Ajout / suppression / renommage de **pages**.
- **Palette** de formes (barre latérale ou barre de menu) : on **glisse-dépose** une forme sur le plan, elle est placée au point de dépôt (projection du curseur sur le sol, valable en vue de dessus comme en iso).
- **Déplacement** des formes à la souris, redimensionnement, édition du label.
- **Textes de début et de fin d'une flèche** (comme les multiplicités UML) : labels enfants de l'arête au format draw.io (`edgeLabel`, géométrie relative `x=-0.8` côté source, `x=0.8` côté cible, soit 10 % de la longueur depuis chaque bout). **Double-clic près d'un bout** de la flèche (dernier quart du tracé de chaque côté) : boîte de texte du début ou de la fin ; vers le milieu : label principal. Aussi par les champs « Début » et « Fin » du panneau contextuel (section « Texte »). Texte vide = label retiré. **Position des textes** : pendant l'édition en place d'un texte de flèche, une poignée ◇ sous le texte le déplace librement (position le long du tracé = point le plus proche, écart de côté, décalage `offset` gardé), écrit comme draw.io dans la géométrie relative du label (`x`, `y`, `<mxPoint as="offset">`), une étape d'annulation. **Configuration par défaut** (`edgeTextLayout`) d'un texte de début ou de fin créé, d'après le tracé : contre son bout (x = ±1, décalage de 6 px le long de la flèche et 4 px de côté), le texte s'éloignant de la forme et du trait — segment horizontal : début au-dessus du trait (`verticalAlign=bottom`), fin en dessous (`top`), aligné à gauche si la flèche part vers la droite depuis ce bout, à droite sinon ; segment vertical : début à droite du trait, fin à gauche, le texte partant le long du trait ; taille et couleur des paramètres `shapes.edgeEndTextSize` (9 px) et `shapes.edgeEndTextColor` (gris). **Bascule de côté** : pendant l'édition d'un texte de début ou de fin dans sa configuration par défaut, une flèche à côté de la poignée ◇ le fait sauter de l'autre côté du trait (règle inversée : dessous au lieu de dessus, ou aligné à droite à gauche au lieu d'aligné à gauche à droite), puis le ramène ; un texte encore à créer est créé de ce côté. Placé à la main, le texte n'a plus de bascule. Le panneau contextuel (« Position des textes ») ancre chaque texte au **début**, au **milieu** (centré sur le trait) ou à la **fin**, avec cette même configuration ; un texte vaut texte de début ou de fin selon sa position (au-delà de ±0,5). Un clic sur le texte d'une flèche (sa boîte dessinée, même loin du tracé) sélectionne la flèche ; un double-clic édite ce texte. **Ancrage par l'alignement**, comme draw.io : un texte de flèche aligné à gauche part de son point vers la droite (côté gauche fixe), aligné à droite vers la gauche, centré de part et d'autre ; de même en hauteur (aligné en haut : vers le bas ; en bas : vers le haut). Un label enfant existant au-delà de ±0,5 compte comme texte de début ou de fin (le plus proche du bout). API : `engine.setEdgeEndLabel(edgeId, 'start' | 'end', texte)`, `engine.editEdgeEndLabel(edgeId, end)` (événement `labelEdit` avec `end`).
- Création de connecteurs entre formes.
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
- **Sauvegarde automatique** (paramètre « Sauvegarde », activée par défaut, délai 1 s réglable de 0,3 à 30 s) : peu après la dernière modification (ou annulation), jamais pendant un geste en cours, et en quittant s'il reste quelque chose. Navigateur : dans la bibliothèque (pas de téléchargement : « Sauvegarder » télécharge) ; appli native : le vrai fichier est réécrit (un exemple embarqué : sa copie dans la bibliothèque). Rien n'est écrit si l'on est revenu à l'état enregistré.
- **Sauvegarde** (appli de démo) : XML réécrit en place, téléchargé sous le nom du fichier et enregistré dans la bibliothèque (`FileStore`) ; pastille sur le bouton tant qu'il reste des modifications, confirmation avant de quitter sans sauvegarder.
- Une page garde sa forme d'origine : une page compressée non modifiée est recopiée telle quelle (texte base64 intact) ; modifiée, elle est **réécrite compressée** comme le fait draw.io (XML → `encodeURIComponent` → deflate raw → base64). Une page illisible est recopiée sans y toucher et ne peut pas être modifiée.

### 14.3 Attributs 3D personnalisés

- Les informations propres au mode spatial (ex. hauteur, élévation, inclinaison future) sont stockées dans des **attributs personnalisés** (sur `<object>` / `<UserObject>` ou dans le style avec un préfixe dédié, ex. `spatial.elevation=…`).
- Préfixe unique pour éviter toute collision avec les attributs draw.io.
- Ces attributs **ne doivent pas être perdus** quand le fichier est ouvert puis sauvegardé dans draw.io. À vérifier par des tests manuels documentés (voir §15).

Réalisation retenue (`engine/spatial.ts`) :

| Attribut | Où | Effet |
|---|---|---|
| `spatial.height` | style ou objet | Épaisseur du volume en iso, en pixels de page (défaut : réglage « Épaisseur ») |
| `spatial.elevation` | style ou objet | La forme flotte à cette hauteur au-dessus de sa base (sol, ou dessus de son conteneur) |
| `spatial.tag` | style ou objet | Étiquette des façades d'un bâtiment iso (BDD, file, cache) : remplace « DB », « QUEUE », « CACHE » ; vide = aucune |
| `spatial.nodes` | style ou objet | Cache distribué (`shape=datastore`) : nombre de disques empilés en iso / 3D (3 par défaut, 1–12) |
| `spatial.noLinkBadge` | style | `1` : lien sans pastille (cartes de la vue graphe) |
| `spatial.view` | `<diagram>` | État de vue de la page (§14.2) |

- Lecture : style de la cellule, sinon attribut de son `<object>` / `<UserObject>` (« Modifier les données » dans draw.io) ; le style l'emporte. Valeurs négatives ou invalides ignorées.
- Écriture (panneau contextuel, section « Volume » : « Épaisseur », « Élévation » ; vide = valeur par défaut) : là où l'attribut est déjà (objet), sinon dans le style, clé modifiée en place ou ajoutée à la fin.
- Tout attribut préfixé `spatial.`, connu ou non, est conservé par l'appli (arbre XML d'origine) et par draw.io (vérifié avec draw.io 24.7.5, ci-dessous).

### 14.4 Critère d'acceptation

Ouvrir un fichier avec trois rectangles, les déplacer, sauvegarder, ouvrir le fichier dans draw.io : **les rectangles sont aux nouvelles positions** et le reste du fichier est **identique**.

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
