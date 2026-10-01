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

Conséquences : le moteur est testable seul, et le composant `<DrawioSpatial />` reste trivial à intégrer dans une autre application React.

### 3.3 Appli web d'abord, binaire ensuite

On développe une **application web**. Le jour où un binaire natif est nécessaire, on l'emballe dans **Electron ou Tauri** sans réécriture. Le seul point à anticiper est l'accès aux fichiers, abstrait derrière une interface (voir §5).

### 3.4 Environnement de développement

- **Conteneurisé** : Node est figé par l'image Docker (`node:24.21.0-bookworm-slim`), les dépendances installées par `npm ci` depuis le lockfile. Aucune version de Node n'est requise sur la machine, seulement Docker.
- **Makefile** comme point d'entrée unique : `make dev` (affiche le lien cliquable), `make test`, `make lint`, `make check`, `make build`, `make preview`, `make lock` (régénère le lockfile dans le conteneur), `make shell`, `make down`, `make clean`.
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
      registry.ts      # registre des ShapeRenderer
      renderers/       # un fichier par forme
        rectangle.ts
        ellipse.ts
        text.ts
        placeholder.ts
        edge.ts
      pageScene.ts     # construction de la scène d'une page
      sceneManager.ts  # pages construites, visibilité, opacité
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
  setViewMode(mode: 'top' | 'iso'): void;
  getCameraState(): CameraState;
  setCameraState(state: CameraState): void;
  animateCameraTo(state: CameraState, durationMs?: number): void;
  toggleOverview(screenPoint?: Point): void; // vue globale ↔ 1:1 (§9.3)
  resetRotation(): void; // remet le nord en haut (§9.1)
  setControls(patch: Partial<ControlSettings>): void;
  on(event: EngineEvent, handler: (...args: any[]) => void): () => void;
  dispose(): void;
}

interface CameraState {
  mode: 'top';      // 'iso' à l'étape 7
  center: Point;    // point de la page au centre de l'écran (coordonnées draw.io)
  zoom: number;     // pixels écran par pixel draw.io
  rotation: number; // orientation autour de la verticale, en radians
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
- **Plus tard :** `FsStore` (Electron/Tauri) qui stocke des chemins réels sur le disque. L'interface et l'UI ne changent pas.

### 5.3 Restauration

- À la réouverture d'un fichier récent : on restaure **la dernière page active** et **la position de caméra de chaque page** (position, zoom, mode, inclinaison).
- La position de caméra est sauvegardée de manière débouncée (ex. 500 ms après le dernier mouvement) et à la fermeture.

---

## 6. Lanceur

Au démarrage :

- liste des **fichiers récents** (nom, date de dernière ouverture), triée par récence,
- bouton **« Ouvrir un fichier »** (sélecteur + glisser-déposer d'un `.drawio` / `.xml`),
- bouton **« Nouveau fichier »** (squelette draw.io vide valide, utile surtout en M2),
- possibilité de retirer un fichier de la liste.

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

Chaque type de forme est géré par un renderer qui s'enregistre auprès d'un registre. Le moteur ne connaît que l'interface commune.

```ts
interface ShapeRenderer {
  kind: string;
  matches(shape: ShapeModel): boolean;     // ou correspondance par kind
  create(shape: ShapeModel, ctx: RenderContext): THREE.Object3D;
  update?(obj: THREE.Object3D, shape: ShapeModel, ctx: RenderContext): void;
  dispose?(obj: THREE.Object3D): void;
}
```

Ajouter une forme = **écrire un fichier et l'enregistrer**. Aucune autre modification.

### 8.3 Formes supportées en M1

- Rectangle (y compris arrondi),
- Ellipse,
- Texte seul,
- Connecteurs (arêtes) : segments, points intermédiaires, flèche de fin,
- Couleurs de remplissage, de bordure, épaisseur de trait, pointillés, label centré.

**Connecteurs.** draw.io n'enregistre que les points intermédiaires posés par l'utilisateur : le tracé (coudes, points d'attache) est **recalculé à l'affichage**, de façon simplifiée mais déterministe :

- styles : droit (de contour à contour), `orthogonalEdgeStyle` / `segmentEdgeStyle`, `elbowEdgeStyle` (horizontal / vertical) et ses variantes ; un style inconnu est approché par l'orthogonal et journalisé (§8.4) ;
- points d'attache imposés (`exitX/exitY`, `entryX/entryY` et décalages), formes en vis-à-vis (segment droit), arrivée sur la cible **sans demi-tour** ;
- pointes `startArrow` / `endArrow` aux proportions draw.io : classic, block, open, oval, diamond (et variantes `Thin`), pleines ou creuses ; une pointe inconnue devient classic et est journalisée ;
- arêtes arrondies (`rounded=1`) ;
- labels d'arête (principal et cellules enfants) positionnés comme draw.io, avec un **fond de la couleur de la page** par défaut, qui coupe la ligne.

Formes et arêtes sont dessinées dans l'**ordre du document** (une arête déclarée avant une forme passe dessous).

### 8.4 Formes non supportées

- Affichées avec un **placeholder** : rectangle gris aux dimensions de la forme, avec le nom du style non reconnu.
- Le chargement d'un fichier **n'échoue jamais** à cause d'une forme inconnue.
- Chaque style inconnu est **journalisé** avec son nombre d'occurrences (module `diagnostics/unsupportedStyles`), consultable dans l'UI (panneau debug) et exportable en JSON. Cela sert de **backlog priorisé par fréquence réelle**.

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
- Bascule entre les deux modes par un bouton et un raccourci, avec une animation douce.
- **Rotation de la vue** : dans les deux modes, la vue peut tourner autour de la verticale (`CameraState.rotation`). Un bouton **« Nord »** (avec une boussole indiquant le nord de la page) apparaît dès que la vue est tournée et la remet à 0°.

### 9.2 Contrôles

| Action | Contrôle |
|---|---|
| Se déplacer | **Z Q S D** (AZERTY) = W A S D (QWERTY), et les flèches ; dans le sens de l'écran, même vue tournée |
| Zoomer | Molette, **zoom centré sur le curseur** (pincement trackpad pris en compte) |
| Glisser molette enfoncée | **Déplacer** (défaut) ou **Tourner**, au choix dans la barre d'outils (§9.3) |
| Pan | Clic droit + glisser, ou Espace + glisser (toujours, quel que soit le mode molette) |
| Vue globale ↔ 1:1 | **Entrée** (§9.3) |
| Sélectionner | Clic gauche |
| Entrer dans un lien | Double-clic |
| Retour | Bouton « Retour » + raccourci (ex. Backspace / Alt+←) |
| Basculer de vue | Raccourci configurable |

Les contrôles s'appuient sur les touches physiques (`KeyboardEvent.code`) pour gérer correctement les dispositions AZERTY / QWERTY. Les touches sont ignorées pendant une saisie (champ, liste) ; Entrée est laissée aux boutons qui ont le focus.

**Glissade (drift).** Pour éviter les à-coups, un déplacement ne s'arrête pas net :

- **pas d'accélération** : pleine vitesse dès l'appui sur une touche ;
- **courte décélération** au relâchement (exponentielle, constante de temps ≈ 80 ms : arrêt en ≈ 250 ms, ≈ 50 px à la vitesse par défaut) ;
- même glissade au relâchement d'un glisser-déplacer si le pointeur était en mouvement (rien s'il était immobile) ;
- toute nouvelle action (molette, glisser, Entrée) interrompt la glissade ; réglable, 0 = arrêt net.

### 9.3 Barre d'outils de navigation

- **Groupe de deux boutons liés** (style input-group) : **Déplacer** | **Tourner**. Règle l'effet du glisser molette enfoncée ; **Déplacer** par défaut ; le choix est mémorisé.
- En mode **Tourner**, la vue pivote autour du **point où le glisser a commencé**, qui reste fixe sous le curseur ; glisser vers la droite tourne le schéma dans le sens horaire.
- Bouton **« Nord (x°) »** visible seulement quand la vue est tournée (§9.1).
- **Entrée** bascule entre :
  - la **vue globale** : toute la page visible, dans l'orientation actuelle, sans plafond de zoom (un petit schéma remplit l'écran) ;
  - la vue **1:1** (zoom 100 %), autour du curseur s'il est sur le plan, sinon autour du centre.
  Depuis la vue globale on passe en 1:1 ; depuis toute autre vue, on revient à la vue globale. Transition animée courte (≈ 250 ms), instantanée si `prefers-reduced-motion`.
- À l'ouverture d'une page, le cadrage reste celui de draw.io : toute la page, **plafonné à 100 %**, nord en haut.

### 9.4 Changement de page

- Sélecteur de page (onglets) dans l'UI, comme dans draw.io.
- Chaque page conserve sa propre position de caméra.

---

## 10. Mini-carte

- En **bas à droite**.
- Toujours affichée **en vue de dessus**, même quand la caméra principale est en isométrique : c'est un repère stable.
- Affiche les formes de la page en version simplifiée.
- Affiche l'**emprise du viewport** : un rectangle en vue de dessus, un **trapèze** en vue isométrique (projection du frustum sur le sol).
- Clic / glisser sur la mini-carte pour déplacer la caméra.

---

## 11. Liens entre pages et transitions

### 11.1 Intention puis engagement

- **Simple clic** sur une forme ayant un lien vers une page : sélection + **préchargement** de la page cible en arrière-plan (construction de sa scène), sans rien afficher.
- **Double-clic** : déclenche la **transition**.
- Option : préchargement au **survol prolongé** (≈ 300 ms, configurable), avec un **plafond** sur le nombre de scènes préchargées gardées en cache.

### 11.2 Transition « zoom + fondu »

1. La caméra s'anime vers la forme cliquée jusqu'à ce qu'elle **occupe tout l'écran**.
2. Pendant la fin du zoom, l'opacité de la forme (et de la page source) diminue.
3. La page cible apparaît en fondu, dans la même position visuelle, puis la caméra se recale sur la position mémorisée de la page cible (ou une vue d'ensemble).
4. Durée totale ≈ 1 s, configurable. Courbe d'animation configurable.

Contraintes :

- La page cible doit être **construite avant** le démarrage de l'animation (sinon à-coup). Si elle ne l'est pas, on la construit puis on lance l'animation.
- Les entrées utilisateur sont ignorées ou mises en file pendant la transition.
- Une option permet de désactiver les animations (accessibilité, `prefers-reduced-motion`).

### 11.3 Retour

- **Pile de navigation** : à chaque transition on empile `{ pageId source, shapeId d'origine, état de caméra }`.
- **Retour** : dépile et ramène exactement à la position d'origine, avec une transition inverse (dézoom + fondu).
- **Si la pile est vide** et que la page courante est la cible de liens depuis plusieurs pages : on affiche un **menu des pages parentes possibles**, triées par **usage récent** (la plus récemment utilisée en haut). S'il n'y a qu'un parent, on y va directement.
- L'historique d'usage des liens est persisté par fichier.

### 11.4 Liens externes

Les liens URL ouvrent un nouvel onglet du navigateur (avec indication visuelle sur la forme).

---

## 12. Vue graphe de la documentation

- À partir des liens, on construit le **graphe de navigation** entre pages. Ce n'est **pas un arbre** : les cycles sont possibles.
- Vue dédiée, rendue dans le même moteur : chaque page devient un **plan flottant** (vignette de la page), reliée aux autres par des **arcs** orientés.
- Mise en évidence des **pages orphelines** (aucun lien entrant ni sortant) et des pages inaccessibles depuis la première page.
- Double-clic sur un plan = aller à la page.
- Disposition : algorithme de placement de graphe simple (force-directed ou couches), à affiner.

---

## 13. Paramètres

Tout ce qui touche à l'expérience utilisateur est paramétrable, avec des valeurs par défaut agréables :

```ts
interface Settings {
  transition: { enabled: boolean; durationMs: number; easing: string };
  preload: { onClick: boolean; onHover: boolean; hoverDelayMs: number; maxCachedPages: number };
  controls: {
    moveKeys: 'letters' | 'arrows' | 'all'; // 'letters' = ZQSD (AZERTY) = WASD (QWERTY), mêmes touches physiques
    middleDrag: 'pan' | 'rotate';            // effet du glisser molette (barre d'outils §9.3)
    moveSpeed: number;                       // px écran / s au clavier
    zoomSpeed: number;
    rotateSpeed: number;                     // rad / px de glisser en mode Tourner
    decelerationMs: number;                  // glissade à l'arrêt (§9.2), 0 = arrêt net
  };
  view: { defaultMode: 'top' | 'iso'; isoAngleDeg: number };
  minimap: { visible: boolean; size: number };
  debug: { showUnsupportedPanel: boolean };
}
```

Les paramètres sont persistés (IndexedDB ou localStorage) et peuvent être passés en props au composant React.

---

## 14. Édition (M2)

### 14.1 Fonctionnalités

- **Nouveau fichier** à partir d'un squelette draw.io vide valide.
- Ajout / suppression / renommage de **pages**.
- **Palette** de formes (barre latérale ou barre de menu) : on **glisse-dépose** une forme sur le plan, elle est placée au point de dépôt (projection du curseur sur le sol, valable en vue de dessus comme en iso).
- **Déplacement** des formes à la souris, redimensionnement, édition du label.
- Création de connecteurs entre formes.
- Création de liens entre pages.
- Annuler / rétablir.
- **Sauvegarde** dans le même format `.drawio`.

### 14.2 Règle critique : édition in situ de l'arbre XML

- On **ne régénère jamais** le XML à partir du modèle neutre.
- On conserve l'**arbre XML d'origine** en mémoire et on ne modifie que les **nœuds et attributs concernés** (ex. `x`/`y` d'un `mxGeometry` après un déplacement).
- Les nouvelles formes sont ajoutées comme de nouveaux nœuds `<mxCell>` valides.
- Tout ce que le parseur ne comprend pas est donc **préservé tel quel**.
- Les pages compressées modifiées peuvent être réécrites compressées ou non (draw.io accepte les deux) — à choisir et documenter.

### 14.3 Attributs 3D personnalisés

- Les informations propres au mode spatial (ex. hauteur, élévation, inclinaison future) sont stockées dans des **attributs personnalisés** (sur `<object>` / `<UserObject>` ou dans le style avec un préfixe dédié, ex. `spatial.elevation=…`).
- Préfixe unique pour éviter toute collision avec les attributs draw.io.
- Ces attributs **ne doivent pas être perdus** quand le fichier est ouvert puis sauvegardé dans draw.io. À vérifier par des tests manuels documentés (voir §15).

### 14.4 Critère d'acceptation

Ouvrir un fichier avec trois rectangles, les déplacer, sauvegarder, ouvrir le fichier dans draw.io : **les rectangles sont aux nouvelles positions** et le reste du fichier est **identique**.

---

## 15. Tests

- **Unitaires (Vitest)** : décompression, parsing des styles, calcul des coordonnées absolues (groupes imbriqués), extraction des liens, graphe de navigation, pile d'historique.
- **Fixtures** : un dossier de fichiers `.drawio` variés (compressés / non compressés, multi-pages, groupes, liens, formes exotiques).
- **Aller-retour (M2)** : `parse → write sans modification` doit produire un XML **sémantiquement identique** à l'original ; `parse → déplacement → write` ne doit modifier que les attributs attendus (diff XML).
- **Compatibilité draw.io (M2)** : procédure de test manuelle documentée (ouvrir dans draw.io, sauvegarder, rouvrir dans l'application, vérifier les attributs spatiaux).
- Le moteur étant indépendant de React, la majorité des tests ne nécessite pas de navigateur.

---

## 16. Packaging (M3)

- Composant `<DrawioSpatial />` publiable (props : contenu ou `FileStore`, `settings`, callbacks).
- Wrapper Electron ou Tauri avec `FsStore` (fichiers récents = vrais chemins sur le disque, sauvegarde directe).

---

## 17. Questions ouvertes

- ~~Bibliothèque de texte définitive~~ → troika-three-text (SDF), Roboto embarquée (§8.5).
- ~~Comportement exact du pan à la souris~~ → glisser molette = Déplacer par défaut, ou Tourner (barre d'outils) ; clic droit et Espace + glisser déplacent toujours (§9.2).
- Rendu des formes en volume (extrusion) : souhaité un jour ?
- Disposition de la vue graphe (force-directed vs couches).
- Réécriture compressée ou non des pages modifiées.
- Gestion des calques draw.io multiples (affichage, visibilité).
