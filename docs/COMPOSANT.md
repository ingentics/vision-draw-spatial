# Composant `<DrawioSpatial />`

Visionneuse (et, sur demande, éditeur) de fichiers draw.io posés dans l'espace : vue de dessus et
vue isométrique, navigation par liens entre pages, mini-carte. Le composant est une coquille React
fine autour du moteur (`Engine`, sans React), utilisable seul.

Exemple complet : [`examples/basic/main.tsx`](../examples/basic/main.tsx), servi en dev sur
<http://localhost:5173/examples/basic/>.

## Installation

```bash
make lib
```

Produit `dist-lib/` : `drawio-spatial.js` (module ES), `style.css` et les types (`types/index.d.ts`).
React 19 (`react`, `react-dom`) est fourni par l'application ; Three.js, troika-three-text, pako et
xmldom sont inclus. Pour les types du moteur, l'application a besoin de `@types/three`.

```tsx
import { DrawioSpatial } from 'drawio-spatial';
import 'drawio-spatial/style.css';
```

## Utilisation

```tsx
<div style={{ height: 600 }}>
  <DrawioSpatial xml={contenuDrawio} />
</div>
```

Le composant prend toute la place de son parent : donnez-lui une hauteur.

### Avec une bibliothèque de fichiers

```tsx
const store = new IndexedDbStore(); // ou MemoryStore, ou votre implémentation de FileStore

<DrawioSpatial store={store} fileId="archi" editable onSave={(xml) => télécharger(xml)} />;
```

Le fichier est lu dans le `store` ; sa vue (dernière page, caméra de chaque page, historique des
liens) y est mémorisée 500 ms après chaque changement et au démontage ; à la sauvegarde, le contenu
y est enregistré. L'interface `FileStore` (SPEC §5.1) permet de brancher un autre stockage.

## Props

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `xml` | `string` | | Contenu draw.io à afficher (ou `store` + `fileId`) |
| `store` | `FileStore` | | Bibliothèque : lecture du fichier, vue mémorisée, sauvegarde |
| `fileId` | `string` | `'inline'` | Identifiant stable du fichier (obligatoire avec `store`) |
| `editable` | `boolean` | `false` | Édition (déplacer, redimensionner, connecter, textes, annuler…) |
| `autosave` | `boolean` | `false` | Sauvegarde automatique après chaque modification (appelle `onSave` avec `auto: true`, et le `store`) |
| `autosaveDelayMs` | `number` | `1000` | Délai après la dernière modification ; jamais pendant un geste en cours, et au démontage s'il reste quelque chose |
| `background` | `string` | `'#ffffff'` | Couleur de fond initiale de la vue (#rrggbb, lue à la création) ; `settings.background` (couleur, grille) la remplace |
| `fonts` | `{ regular?, bold?, …, families? }` | | URLs de polices (.ttf, .otf, .woff ; Roboto conseillée). `families` : polices nommées choisies par `fontFamily` (ex. `{ 'Permanent Marker': url }`, labels des post-it Event storming) ; une police demandée par un mode (`fonts` de sa définition) et absente est signalée dans les Diagnostics. Sans police, troika en charge une depuis un CDN |
| `settings` | `SettingsPatch` | | Paramètres (SPEC §13), fusionnés avec les valeurs par défaut, appliqués à chaud |
| `minimap` | `{ visible, size? }` | | Mini-carte contrôlée par l'hôte ; absente, le composant gère son affichage (×, touche M) |
| `onMinimapToggle` | `() => void` | | Bouton × ou touche M, en mode contrôlé |
| `minigraph` | `{ visible }` | | Mini-graphe (à gauche de la mini-carte, fermé par défaut) contrôlé par l'hôte ; absent, le composant gère son affichage (×, touche G) |
| `onMinigraphToggle` | `() => void` | | Bouton × ou touche G, en mode contrôlé |
| `initialView` | `InitialView` | | Page, caméras, historique à restaurer au chargement |
| `className`, `style` | | | Sur l'élément racine (`.drawio-spatial`) |
| `ref` | `Ref<DrawioSpatialHandle>` | | Actions (voir plus bas) |

### Événements

| Prop | Appelé quand |
|---|---|
| `onLoad(document)` | Un fichier est chargé (modèle neutre : pages, formes, arêtes, avertissements) |
| `onPageChange(page)` | La page affichée change |
| `onSelectionChange(selection)` | La sélection change (`undefined` : rien) |
| `onCameraChange(camera)` | La caméra bouge (à chaque image pendant un mouvement) |
| `onModifiedChange(modified)` | Le document devient modifié, ou ne l'est plus (sauvegarde, annulation) |
| `onSave(xml, { auto })` | Sauvegarde demandée (Ctrl+S dans le composant, ou `ref.save()` : `auto: false`) ou automatique (`auto: true`) |
| `onError(error)` | Fichier illisible (`DrawioParseError`) ou introuvable dans le `store` |
| `onEngine(engine)` | Le moteur est créé (puis `undefined` au démontage) |
| `onShapesMissing(missing)` | Le document contient des formes de bibliothèque non chargées (`{ library, kind }[]`, chacune une fois par fichier ouvert) : répondre par `engine.registerShapes(json)` ou `engine.markShapesUnavailable(refs)` |

### `ref`

```tsx
const viewer = useRef<DrawioSpatialHandle>(null);

viewer.current?.save(); // XML à jour (modifications + vue de chaque page), appelle onSave
viewer.current?.undo();
viewer.current?.redo();
viewer.current?.engine?.goToPage(pageId); // tout le moteur : navigation, vue, sélection, édition
```

Quelques méthodes utiles du moteur : `goToPage`, `getViewMode`, `setViewMode('top' | 'iso' | '3d')`,
`toggleViewMode`, `toggle3d`, `toggleFlatten`, `showGraph`, `toggleGraph`, `back`, `focusElement(pageId, elementId)`,
`getDocument`, `getCurrentPage`, `getCameraState`, `select`, `selectAll`, `followLink`, `isEditable`,
`addShape(SHAPE_TEMPLATES[0])`, `addPage`, `setLabel`, `setLink`, `setSpatial`, `deleteSelection`, `canUndo`,
`canRedo`, `serialize`, `isModified`. La liste de référence est SPEC §4.3 et `src/engine/Engine.ts`.

## Bibliothèques de formes

Formes purement visuelles (rendus 2D, iso, 3D, sans comportement) décrites par un JSON et chargées à chaud dans le
moteur (sujets 529 à 531). Chaque catégorie d'une bibliothèque devient une section de la palette. Règles du moteur
(résolution, formes non chargées ou introuvables, Diagnostics) et Metamorph : SPEC §8.2 et §8.3.

```ts
const result = engine.registerShapes({
  format: 'drawio-spatial/shapes',
  formatVersion: 1,
  library: { id: 'infra', name: 'Infrastructure', meta: { source: 'interne' } },
  categories: [{ id: 'compute', name: 'Calcul', order: 100 }],
  shapes: [
    {
      id: 'serveur',
      category: 'compute',
      name: 'Serveur',
      size: { width: 80, height: 60 },
      style: 'fillColor=#ff9900;strokeColor=#232f3e;whiteSpace=wrap;html=1;',
      modes: ['none', 'states'], // page sans mode et pages Machine à états ; absent : page sans mode
      render: { outline: [[0, 0], [1, 0], [1, 1], [0, 1]], details: [{ path: [[0.2, 0.3], [0.8, 0.3]] }], depth: 40 },
    },
  ],
});
if (!result.ok) console.error(result.errors); // rien n'est changé
engine.unregisterShapes('infra');
```

- **Format** : `format` et `formatVersion` (1) obligatoires ; une version inconnue est refusée, une clé inconnue
  ignorée. `library` : `id`, `name`, et facultatifs `description`, `author`, `license`, `homepage`, `tags`, `meta`
  (objet libre, gardé tel quel : `engine.shapeLibrary(id)`) ; `categories` facultatif. Une forme : `id`, `name`,
  `size`, `render`
  (`outline` : au moins 3 points `[x, y]` en fraction des bornes ; `details` : tracés `{ path, closed?, filled? }` ;
  `depth` : hauteur du volume en px), et facultatifs `description`, `keywords`, `style`, `value`, `icon` (données
  `d` de tracés SVG du cadre `0 0 40 28` ; absent : tirée du contour), `category` (absente : « Autres »), `modes`,
  `meta`.
- **Remplacer** : réenregistrer le même `library.id` remplace la bibliothèque (pas de version).
- **Fichier** : une forme posée garde son style, plus `spatial.library` et `spatial.kind`. Ouverte sans sa
  bibliothèque, elle s'affiche hachurée avec un badge « puzzle » (non chargée), ou un badge d'avertissement si l'hôte
  l'a déclarée introuvable (`markShapesUnavailable([{ library, kind? }])`, sans `kind` : toute la bibliothèque) ; elle
  reste éditable comme un rectangle. draw.io dessine le style seul.

### Formes générées par l'hôte (sujets 538, 545)

Une forme générée (ex. la Metamorph, `kind` `metamorph`) décrit une forme à générer (son texte et des instructions
visuelles) ; c'est l'hôte qui génère. Une forme le devient en déclarant `generation` (`AJOUTER_UNE_FORME.md`).

```ts
engine.on('generationRequest', async ({ shapeId, kind, text, comment, instructions, width, height, attempt }) => {
  if (kind !== 'metamorph') return; // l'hôte choisit qui génère, selon la forme
  try {
    const candidates = await monServeur.generer({ text, comment, instructions, width, height }); // JSON de bibliothèque
    engine.generationResults(shapeId, candidates); // refusé si la forme n'attend plus rien
  } catch {
    engine.generationFailed(shapeId, 'La génération a échoué'); // message montré, « Réessayer » rend la main
  }
});
// Proposition choisie : l'hôte la garde, recharge sa bibliothèque, puis la pose à la place de la forme générée.
engine.registerShapes(bibliothequeAJour);
engine.acceptGeneration(shapeId, 'metamorph:<id de la proposition>');
```

- `generationRequest` part à « Valider », à « Réessayer » (`retryGeneration`) et à la réouverture d'une forme en
  attente ; `generationChange` signale des propositions reçues ou oubliées. Le panneau lit `generationOf(shapeId)`
  (titre, état `draft` / `pending` / `ready`, instructions, propositions, message d'échec `error`) et écrit par
  `setGenerationInstructions`, `submitGeneration`, `repromptGeneration` (retour au brouillon).
- Sans réponse de l'hôte (`generationResults` ou `generationFailed`), la forme reste en attente : toute demande doit
  finir par l'un des deux. Une forme `metamorph:*` que l'hôte ne sait plus fournir est à déclarer introuvable
  (`markShapesUnavailable`), comme toute forme de bibliothèque.
- Une forme de bibliothèque sans `category` (et `categories` est facultatif) va dans la catégorie « Autres » de la
  palette, cachée tant qu'elle est vide.

## Clavier et souris

Navigation (toujours) : ZQSD / WASD et flèches, molette (zoom au curseur), clic droit (en 2D) ou
Espace + glisser (déplacer), molette enfoncée (déplacer), Entrée (vue globale ↔ 1:1),
I (2D ↔ iso), P (3D ↔ 2D / iso), clic droit + glisser en iso et en 3D (tourner la caméra ; en 3D, l'incliner aussi), G (mini-graphe), M (mini-carte), Alt+↑ (remonter à la page parente), clic (sélection),
⌘ + clic (suivre un lien ; maintenir ⌘ fait ressortir les zones liées ; touche et geste réglables :
`settings.controls.followLinkKey`, `followLinkGesture`). Les raccourcis sont réglables (`settings.controls.shortcuts`).

Édition (`editable`) : glisser une forme pour la déplacer, poignées pour la redimensionner ou la
relier à une autre, double-clic ou F2 pour le texte (via l'événement moteur `labelEdit`, à afficher
par l'hôte : voir `src/app/LabelEditor.tsx`), Suppr, Échap, Ctrl+Z / Ctrl+Maj+Z / Ctrl+Y. Ctrl+S
déclenche `onSave` (ou l'enregistrement dans le `store`). Ces raccourcis Ctrl sont traités quand
le focus est dans le composant et ne remontent pas à l'application.

La palette, les onglets de pages, la barre de sélection et le champ de texte de l'appli de démo
(`src/app/`) ne font pas partie du composant : ils montrent comment construire une interface
d'édition autour du moteur.

## Style

Les styles du composant (mini-carte) se règlent par variables CSS sur `.drawio-spatial` ou un
parent : `--drawio-spatial-border`, `--drawio-spatial-muted`, `--drawio-spatial-surface`,
`--drawio-spatial-shadow`. Le fond de la vue et sa grille se règlent par `settings.background` (couleur, grille affichée, pas, ligne principale, couleur des lignes), ou la prop `background` pour la seule couleur initiale.

## Sans React

```ts
import { Engine } from 'drawio-spatial';

const engine = new Engine({ canvas, editable: false });
await engine.load(xml, 'mon-fichier');
engine.on('pageChange', (page) => console.log(page.name));
// …
engine.dispose();
```
