# Audit qualité — calques, bibliothèques de formes, Metamorph, Story telling et Event storming, 5e passe

> Audit (procédure `docs/AUDIT.md`, copiée et remplie ici ; `docs/AUDIT.md` reste le modèle vierge). Lancé le
> 2026-10-12. Suite de 500 (dernier audit) ; périmètre : commits `f22dede` à `cf8e37a` (sujets 508 à 541, 206 fichiers
> sous `src/`, +10 651 / −453). Ce fichier décrit la tâche et en suit l'avancement ; les constats deviennent des
> tickets.

## Objectif

Aucune opération publique du moteur (calques, Metamorph) ne lève d'exception ni ne laisse une forme dans un état sans
issue, le tronc et l'appli ne connaissent aucune forme ni aucun mode par son nom, et un agent peut ajouter une forme
de bibliothèque, un calque ou une simulation de mode en lisant les guides, sans lire le tronc.

## Périmètre

- **Prioritaire** : ajouts au tronc — calques (`core/domains/document/pageLayers.ts`, `core/format/layerEdits.ts`,
  `layerTree.ts`, `core/model/layerRules.ts`, `core/edit/layerChoice.ts`, `core/render/layerPlanes.ts`,
  `core/domains/view/layerSpreads.ts`), bibliothèques (`core/shapes/library/`, `core/domains/document/shapeLibraries.ts`,
  `core/shapes/registry.ts`, `plugins/shapes/generic/library/`), Metamorph (`core/domains/edit/metamorphs.ts`,
  `core/edit/metamorph.ts`, `plugins/shapes/general/metamorph/`, `core/render/animation.ts`), contrat des modes
  (`core/modes/types.ts`, `pageTakeover.ts`, `dressing.ts`, `modeCurrents.ts`, `fileLabels.ts`), `Engine.ts`.
- **Secondaire** : modes `eventstorming/` (508 à 520), `storytelling/` (533 à 541), `states/` (527, 528) ; formes
  `shield`, `stacked-rectangles` ; appli `src/app/metamorph/`, `context/LayersSection.tsx`, `MetamorphSection.tsx`,
  `demoShapeLibrary.ts`, `plugins/modes/storytelling/`.
- **Docs** : `SUMMARY.md`, `AJOUTER_UN_PLUGIN.md`, `AJOUTER_UN_MODE.md`, `AJOUTER_UNE_FORME.md`, `COMPOSANT.md`,
  `SPEC.md` (parties touchées depuis `f22dede`), sujets 508 à 541.
- **Hors périmètre** : le serveur Metamorph mocké sauf son branchement ; dettes déjà notées 532 (réglages des
  pastilles) et 535 (simulateur commun) ; tout changement de comportement visible sauf les corrections d'un ticket.

## Axes d'analyse

1. Erreurs réelles : exceptions jusqu'à l'API publique, promesses rejetées, formes bloquées, annuler / rétablir,
   gardes (vue graphe, interaction).
2. Découplage : tronc et appli sans nom de forme ni de mode ; règles de `coding.md` (état de module, domaine qui
   calcule, règle métier dans l'UI).
3. Mutualisation : petites aides recopiées entre modes et entre tronc et plugins.
4. Responsabilités et placement : domaine qui dessine, registre qui délègue, fonctions longues.
5. Lisibilité et code mort.
6. Tests du tronc pour chaque règle, tests en miroir de `src/`.
7. Docs alignées sur le code.

## Constats (2026-10-12)

Quatre explorations en parallèle (calques et bibliothèques, Event storming, Story telling et Metamorph, docs), puis
chaque constat retenu relu dans le code.

**Ce qui est sain** :

- Calques et bibliothèques : règles pures dans `edit/layerChoice.ts` et `model/layerRules.ts`, testées ; `format/`
  sans Three.js, écriture en place ; une étape d'annulation par opération ; `layers`, `layerSpreads`,
  `shapeLibraries` et `metamorphs` inscrits dans `resetDocumentState` ; anciens plans libérés (`disposeObject`).
- Bibliothèque JSON validée strictement (erreurs avec leur chemin, tout ou rien, gelée) ; `PATH_DATA` empêche
  d'injecter du SVG (icônes de la palette et propositions Metamorph).
- Le dessin des formes de bibliothèque est injecté (`ShapeLibraryKit`), le plugin `library/` n'importe que l'API des
  plugins.
- Modes Event storming et Story telling : n'importent que `core/plugins`, aucun `let` de module, caches `WeakMap` sur
  la page ; le tronc ne les cite qu'en exemple. Grille (537), épaisseur et écart des flèches (536), voile (533),
  courant effaçable (540) sont des contrats génériques, testés.
- Post-it verrouillé : seules les écritures `{ derived: true }` passent (`modeEditWriter.ts:122`), et seulement pour
  les labels (`pageLabels.ts`, `groupLabels.ts`). Labels écrits en place à l'enregistrement : arbre remis dans un
  `finally` (`file.ts:82-88`).
- `stickyRules.ts` est l'unique grammaire du mur (places proposées et lecture) ; `pivotVerdict.ts`,
  `businessRules.ts`, `insetEnds`, `spinHues`, `blobOutline` purs et testés.
- Docs : contrat des modes à jour dans `AJOUTER_UN_MODE.md` ; COMPOSANT décrit bibliothèques, Metamorph,
  `onShapesMissing`, `fonts.families` ; aucun chemin cité cassé ; « Fait » des sujets 508 à 541 exacts.

**Erreurs réelles** :

- Branchement Metamorph (`src/app/metamorph/metamorphHost.ts`) : le gestionnaire `metamorphRequest` (l.25-30) est
  `async` sans `try` ; un rejet de `server.generate` est une promesse non gérée et la forme reste « morphing » sans
  issue (`retry` / `reprompt` exigent `ready`). Idem `void registerAccepted()` (l.21, 23) et `void acceptMetamorph`
  (`ViewerContextPanel.tsx:150`). → 543
- `registerAccepted` sort sans rien quand le serveur n'a aucune forme acceptée (`metamorphHost.ts:17`), et
  `demoShapeLibrary.ts:96` met `METAMORPH_LIBRARY` dans `KNOWN_LIBRARIES` : une forme `metamorph:*` absente reste « en
  chargement » au lieu d'être déclarée introuvable. → 543
- Annuler pendant une génération : `results` écrit `ready` sans étape d'annulation (`metamorphs.ts:97-99`) ; annuler
  une modification faite entre-temps remet `morphing`, et `documentShown` (l.165-170) saute la forme car ses
  propositions sont en mémoire : boutons grisés jusqu'à la réouverture. Lu dans le code, à reproduire. → 543
- Calques : un id inconnu lève `Calque … introuvable` (`layerEdits.ts:112-114`) jusqu'à l'API publique :
  `renameLayer`, `moveLayer`, `removeLayer`, `setLayerVisible`, `setLayerLocked`, `setLayerElevation`,
  `moveSelectionToLayer` (`pageLayers.ts:103-160`), alors que `setCurrent` (l.62-64) l'ignore. → 544
- `PageLayers.edit` (`pageLayers.ts:173-174`) ne garde pas la vue graphe, que `layeredPage` (l.185) exclut : une
  opération appelée en vue graphe écrit. `LayerSpreads.setFlattened` (`layerSpreads.ts:32`) n'a pas la garde
  `canInteract()` de `viewModes.setFlattened` (l.137). → 544
- `readShapeLibrary` fait `structuredClone` du `meta` reçu (`libraryFormat.ts:130`) : un objet non clonable lève
  `DataCloneError` alors que `registerShapes` promet de rendre ses erreurs. → 544

**Ce qui freine l'extensibilité** :

- Le tronc porte une forme par son nom : domaine `core/domains/edit/metamorphs.ts`, `core/edit/metamorph.ts`, clés
  `SPATIAL.metamorph*` (`core/spatial.ts:33-35`), événements `metamorphRequest` / `metamorphChange`
  (`core/domains/types.ts:132-137`), sept méthodes `*Metamorph*` (`Engine.ts:434-478`), `metamorphStateOf` réexporté
  aux plugins (`core/plugins/index.ts:144`) : la forme lit sa règle d'état dans le tronc. L'appli générique la nomme
  aussi (`context/ShapeSections.tsx:15,39`, `context/types.ts:141`, `ViewerContextPanel.tsx:100,143`). → 545
- Export JSON du mur : `EXPORTED` (`eventstorming/export/json.ts:17-26`) redonne type exporté et préfixe hors de
  `kinds.ts` ; un 9e post-it ajouté dans `kinds.ts` (formes générées depuis 511) ferait planter l'export
  (`EXPORTED.get(sticky)!`, l.75). → 547
- `ModeParts.comment(shape, part, page)` (`core/modes/types.ts:321`) n'a pas l'ordre de ses voisines
  `at` / `bounds` / `text` `(page, shape, part)`. → 548
- `pageLayers.ts` (domaine `document/`) mêle les écritures des calques et le décor Three.js de la scène (`decorate`,
  `redecorate`, l.71-92). Règle métier dans l'UI : `LayersSection.tsx:42-44` compte les éléments par calque,
  l.176-181 lit et borne l'élévation (redit `Math.max(0, …)` de `pageLayers.ts:142`). → 548
- `core/shapes/registry.ts` passe de 463 à 534 lignes avec une dizaine de délégations vers `libraryStore`
  (`registerLibrary`, `library`, `libraries`, `libraryCategories`, `libraryStatus`…). → 548

**Mutualisation et responsabilités** :

- `oneLine` en trois copies qui divergent : `storytelling/stories.ts:41`, `eventstorming/export/json.ts:46`
  (`\s*\n\s*`), `states/simulation/simulationView.ts:93` (`\s+`) ; variantes en ligne dans `warningHints.ts:15`,
  `pivotVerdict.ts:49`. Format `{ id: 'json', name: 'JSON' }` recopié (`eventstorming/export/json.ts:119`,
  `storytelling/export/json.ts:39`) alors que `PLANTUML_FORMAT` existe. → 546
- Tri « haut puis gauche » trois fois : `wallRules.ts:42` (`byReading`), `stickyGroups.ts:27` (`byPlace`),
  `json.ts:65`. `at(x, y)` deux fois (`stickyBadge.ts:22`, `pivotMark.ts:25`). Texte entre guillemets insécables deux
  fois (`stickyRules.ts:59`, `pivotVerdict.ts:52`). Valeurs du pivot `'1'` / `'0'` / `'unknown'` décodées trois fois
  (`pivot.ts:14-15`, `json.ts:58-61`, `pivotVerdict.ts:55`). → 547
- Tronc des calques et bibliothèques : `spatialOf` (`libraryStore.ts:63-66`) refait `spatialValue`
  (`core/spatial.ts:81`) ; `layerTree.ts` (`rootIdsOf`, `layerIdsOf`, `layerOfCell`) redit la règle de
  `cellIndex.ts:64-110` (`rootIds`, `isLayer`, `layerOf`) ; remontée des parents avec `seen` deux fois
  (`layerEdits.ts:87-94`, `layerTree.ts:24-28`) ; couleurs `#eef2f7` / `#5b7db1` dans `unloadedShape.ts:29-30` et
  `settings/schema/shapes.ts:45-46`, la mini-carte prenant `UNLOADED_STROKE` en dur (l.178) ; `demoShapeLibrary.ts:10-11`
  écrit `'drawio-spatial/shapes'` et `1` au lieu de `SHAPE_LIBRARY_FORMAT` / `_VERSION`. → 546
- Appli : `useStorySimulation` (`storytelling/storyRun.ts:12-20`) copie `useOpenedSimulation`
  (`states/simulationRun.ts:20-28`) ; bouton + dialogue d'export recopiés dans trois modes (`eventstorming/index.tsx:33-40`,
  `storytelling/index.tsx`, `states/index.tsx:63-70`) ; `StoryRow` proche de `FlowRow` (`sequences/index.tsx:84`). → 549
- `readWall` (`wallRules.ts:95-233`) : une fonction de 138 lignes (R1, piles, R5, R3, R4, W1 à W8). Types de lien en
  `string` (`WallLink.type`, `COMMAND_TRIGGERS`, l.25 et 39) : comparaisons en dur non vérifiées. → 547
- Lisibilité : `merge` de `setMetamorphInstructions` (`Engine.ts:440`, `metamorphs.ts:58`) jamais passé → 543 ;
  `layerChildIds` (`layerTree.ts:42`) sans appelant → 546 ; `GROUP_PARTS.at` (`groupLabels.ts:57`) remplacé par
  `index.ts:70` → 547 ; commentaires déplacés : `eventstorming/index.ts:31` (décrit `icon`, posé sur `fonts`),
  `core/modes/registry.ts:134-138` (doc de `hasLayers` au-dessus de `showsGrid`), `core/modes/types.ts:437-439`
  (phrase coupée) → 547, 548 ; `.find` au lieu de `byId` (`stories.ts:150`, `metamorphs.ts:139`) → 546.
- Tests manquants : `shield` et `stacked-rectangles` sans test de règle (voisines dans `geometry.test.ts`) ;
  `camera.keepInView` avec `around` / `whole` (527) ; `DocumentFile.serialize` à plusieurs pages (une compressée, une
  sans mode) ; titre de groupe et pastille sur le même post-it ; tests hors miroir (`storytelling.test.ts` pour
  `stories.ts`, `storyPlayback.test.ts` pour `storySimulator.ts`, `shapes/metamorph.test.ts` pour `blob.ts`). → 550

**Docs** :

- Type de champ `note` (517, `fieldSchema.ts:22-29`) absent du tableau de `AJOUTER_UN_PLUGIN.md:112-120` et de la liste
  de `AJOUTER_UN_MODE.md:150`.
- `AJOUTER_UNE_FORME.md` ne dit rien des bibliothèques JSON (forme visuelle sans dossier), de `PaletteEntry.fallback`,
  `ShapeTemplate.library` / `modes`, `MinimapMapping.colors.unloaded`, de la brique d'animation (`spinHues`, `Rhythm`).
- `SUMMARY.md` §3 sans `core/shapes/library/`, `render/animation.ts`, `render/layerPlanes.ts`,
  `plugins/shapes/generic/library/`, fichiers des calques, `LayersSection.tsx` / `MetamorphSection.tsx` /
  `demoShapeLibrary.ts` ; §5 sans lignes « Calques », « Bibliothèque de formes », « Metamorph » ; l.124 ne cite pas
  `storytelling/` (exemple de `page.grid`, `clearable`, `edgeInset`).
- Bibliothèques et Metamorph décrites dans SPEC §8.2-8.3 et COMPOSANT.md:99-160 sans renvoi. → 551

**Dette notée** (une ligne chacune, `docs/backlogs/debt/`) : 552 à 556.

## Sujets

| #   | Sujet                                                                                         | Gain                          | Taille | Décision |
| --- | --------------------------------------------------------------------------------------------- | ----------------------------- | ------ | -------- |
| 543 | Metamorph : génération en échec, bibliothèque vide, annuler pendant la génération             | erreurs (forme bloquée)       | S      | fait     |
| 544 | Calques : id inconnu, vue graphe, aplatir sans interaction ; `meta` non clonable               | erreurs (exception publique)  | S      | fait     |
| 545 | Metamorph hors du tronc : contrat « forme générée par l'hôte »                                | extensibilité                 | L      | fait     |
| 546 | Briques communes : `oneLine`, `JSON_FORMAT`, `spatialValue`, règles de calque, couleurs        | mutualisation                 | M      | fait     |
| 547 | Rangement du mode Event storming (export depuis `kinds.ts`, pivot, `readWall`, types de lien) | extensibilité, lisibilité     | M      | fait     |
| 548 | Tronc : décor des calques dans `view/`, règles de `LayersSection` au moteur, registre, contrat | responsabilités               | M      | fait     |
| 549 | Appli : simulation, export et ligne de liste communs aux modes                                | mutualisation                 | S      | fait     |
| 550 | Tests : formes géométriques, cadrage de la simulation, sauvegarde à plusieurs pages, miroir   | tests                         | S      | fait     |
| 551 | Docs : type `note`, guide d'une forme (bibliothèques, animation), SUMMARY, renvois            | doc juste pour un agent       | S      | fait     |

Ordre validé (2026-10-12, avec les dettes 532, 535 et 552 à 556) : 543, 544 (erreurs), puis 546, 547, 548, 549, 550,
545 (le plus gros, change l'API publique `Engine` et les événements), les dettes, et 551 en dernier (les docs décrivent
le code final). Un commit par sujet dès que `make check` est vert (l'utilisateur a validé les sujets d'avance). Écarts de comportement : seulement ceux que décrit chaque ticket.

- **Fini quand :** les sujets validés sont faits (chacun dans `done/`), `make check` est vert, et la dette ci-dessus
  est notée.

## Avancement

- [x] Tâche décrite (ce fichier)
- [x] Constats
- [x] Sujets rédigés
- [x] Sujets validés par l'utilisateur
- [x] Réalisation

- Fait : sujets 543 à 551 et dettes 532, 535, 552, 553, 554, 556 réalisés, un commit chacun, dans l'ordre validé
  (543, 544, 546, 547, 548, 549, 550, 545, dettes, 551).
  - 543 : génération en échec rendue (`generationFailed`), formes inconnues du serveur introuvables, annuler pendant
    la génération sans forme bloquée.
  - 544 : opérations de calque sans exception (id inconnu, vue graphe), aplatir gardé pendant une transition, `meta`
    non clonable rendu en erreur.
  - 545 (`feat(engine)!`) : formes générées par l'hôte (`ShapeDefinition.generation`), la Metamorph hors du tronc ;
    API `generation*`.
  - 546 : `oneLine`, `jsonExporter`, `spatialValue`, règles des calques, couleurs des formes non chargées.
  - 547 : export du mur depuis `kinds.ts`, pivot, marques en coin, `readWall` par étapes, types de lien vérifiés.
  - 548 : décor des calques dans `view/`, règles de `LayersSection` au moteur, `registry.libraryStore`,
    `parts.comment(page, shape, part)`.
  - 549 : simulation, export et nombre de flèches communs aux modes dans l'appli ; histoire choisie au clavier.
  - 550 : tests (formes géométriques, `keepInView`, enregistrement à plusieurs pages, titre et pastille) et tests
    rangés comme `src/`.
  - 551 : docs alignées sur le code final.
  - Dettes : 532 (réglages des pastilles), 535 (`ModeSimulator`), 552 (`pageMemo`), 553 (halo sans image pendant ses
    pauses), 554 (serveur mocké, réponse tardive refusée), 556 (noms des calques aplatis).
  - Reste : dette 555 (`Engine.ts` trop long : passer sous 400 lignes demande de regrouper l'API publique par domaine,
    changement de toute l'API du moteur, à décider avec l'utilisateur).
  - Vérifié seulement par les tests : échec réel du serveur Metamorph (le mock ne rejette pas), groupes et pastilles
    pendant un redimensionnement (le glisser simulé ne déplace pas les formes), exports JSON.
