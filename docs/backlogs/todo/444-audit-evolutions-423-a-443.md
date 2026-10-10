# Audit qualité — évolutions des sujets 422 à 443, 2e passe

> Audit (procédure `docs/AUDIT.md`, copiée et remplie ici ; `docs/AUDIT.md` reste le modèle vierge). Lancé le
> 2026-10-10. Suite de 421 (dernier audit, commit `9f62357`) ; périmètre : `git diff 9f62357..HEAD` (22 commits, 163
> fichiers, +4701 / −468). Ce fichier décrit la tâche et en suit l'avancement ; les constats deviennent des tickets.

## Objectif

Les ajouts depuis 421 (mode Machine à états, export PNG, PlantUML partagé, tracé par page, réglages de page posés par
un mode, bouts de flèche attachés, sélection sans voile, tailles de table RDD) gardent le tronc sans nom de mode,
réutilisent les briques existantes au lieu de les recopier, sont testés côté moteur et décrits dans la SPEC et les
guides, de sorte qu'un agent ajoute un mode sans lire le tronc.

## Périmètre

- **Prioritaire** : le tronc touché (`src/engine/core/` : `view/imageExport.ts`, `render/png/`, `render/troikaText.ts`,
  `modes/pageModes.ts`, `edit/edges/arrangement.ts`, `edit/drag/{connect,edgeEnd,gesture}.ts`,
  `edit/anchoring/{mode,routing}.ts`, `selection/{highlight,selection}.ts`, `shapes/`, `settings/`).
- **Secondaire** : plugins `states/` (nouveau), `rdd/` et `sequences/` (changements) ; appli (`src/app/export/`,
  `ExportPanel.tsx`, sections de contexte, `plugins/modes/`).
- **Docs** : `SPEC.md`, `SUMMARY.md`, `AJOUTER_UN_MODE.md`, `AJOUTER_UNE_FORME.md`.
- **Hors périmètre** : la copie région RDD / ensemble d'états (idée 437, déjà notée) ; tout changement de
  comportement visible sauf mention dans un ticket.

## Axes d'analyse

1. Découplage : aucun nom de mode dans le tronc ni dans l'appli hors `plugins/modes/<mode>` ; appels au mode protégés.
2. Mutualisation : briques du tronc reprises, pas de table ni de calcul recopiés entre tronc, plugins et appli.
3. Responsabilités : chaque domaine écrit ses propres attributs ; un fichier, un sujet.
4. Erreurs réelles.
5. Lisibilité et code mort.
6. Tests côté moteur de chaque ajout.
7. Docs alignées sur le code.

## Constats (2026-10-10)

**Ce qui est sain** : le tronc ne cite aucun mode (seulement « ex. » en commentaire) ; les nouveaux points d'entrée
d'un mode passent par l'hôte protégé (`edges.attachedEnds` par `pageModes.call`, `edges.selectionStyle` par `call`
dans `highlight.ts:58`) ; `page.defaults` est une donnée validée (`isAnchoring`, `isEdgeLine`) ; `styleable` passe par
le registre et est testé (`registry.test.ts:195`) ; `EDGE_LINES` déclaré une fois (`anchoring/mode.ts`) ;
`edgeEnd.commit` refuse un bout libre sans étape, testé ; export PNG : renderer jetable (`dispose`,
`forceContextLoss` en `finally`), scène libérée, rendu par morceaux bornés à `maxTextureSize`, `pngDensity` et
`imageTiles` purs et testés ; `modeCurrents.frozen` (422) règle la fragilité de 421 ; plugins : imports limités à
`core/plugins` et à leur dossier, PlantUML mutualisé (`core/export/plantumlText.ts`, anciennes copies retirées),
aucun état de module mutable ; appli : `downloadBlob` réunit trois téléchargements et révoque l'URL, une seule
fenêtre d'export (`export/ExportDialog.tsx`) où les modes n'ajoutent que leur entête, modes découverts par
`import.meta.glob`, sections de contexte sans nom de mode.

**Erreurs réelles** :

- Export PNG : `textsSynced` (`troikaText.ts:351`) parcourt la scène tout de suite, alors que les textes riches et le
  long d'un tracé ne créent leurs `Text` qu'après `measured().then(...)` (`troikaText.ts:207`, `:239`) ; sur une page
  sans texte simple en cours de mise en page, l'attente rend la main avant que ces lettres soient mises en page.
  Déduit du code, à reproduire. L'attente lit aussi `_isSyncing`, champ interne de troika (`troikaText.ts:357`).
  → 445
- Export PlantUML des états : une transition d'un point d'entrée imbriqué dans un ensemble vers un état extérieur
  s'écrit dans le bloc de l'ensemble (`states/export/plantuml.ts:72`, `level = initial ? levelOf(source)`) ;
  PlantUML peut y créer un second état du même nom. Non testé (`plantuml.test.ts` ne couvre que la sortie). À
  confirmer par le rendu. → 446

**Ce qui freine l'extensibilité** :

- Tracé d'une flèche décrit à trois endroits qui divergent déjà : `EDGE_LINE_KEYS` en chaînes (`drag/connect.ts:20`,
  repris par `commands/elements.ts:49`), `Router.edgeStyle` en objets (`auto/routeAround.ts:228`,
  `pcb/octilinear.ts:387`, `noEdgeStyle` d'un seul côté), tracés permis (`anchoring/mode.ts`). `connect.ts:147`
  refait le repli de `edgeLineOf`. → 447
- `PageModes.setPageMode` (`pageModes.ts:70-77`) écrit lui-même `spatial.anchoring` / `spatial.edgeLine` et relance la
  répartition, recopie de `EdgeArrangement.setPageAnchoring` (`arrangement.ts:207-216`) ; ses deux gardes ne
  concordent pas (`isAnchoring` l. 71, simple présence l. 73). → 447
- L'appli recalcule l'ancrage d'une page (`viewer/ViewerContextPanel.tsx:31-32`) au lieu de lire
  `EdgeArrangement.anchoringOf` (non exposé). → 447

**Mutualisation et responsabilités** :

- `states/state/bodyText.ts` recopie `rdd/tables/documentBody.ts:11-40` (`BODY`, `BODY_PART`, `bodyValue` en JSON à
  `;` échappés, lecture tolérante, normalisation), commentaires compris ; déjà divergés (`text.trim()` d'un côté,
  `text` de l'autre). → 448
- `DragGesture.blockArrowDrag` (`gesture.ts:188-210`) recopie la saisie de `shapeDrag` (`:165-181`) et appelle
  `pickAt` une seconde fois pour un même appui ; aucun test du glisser d'une flèche pleine (424). → 449
- Rangement : `ExportPanel.tsx` à la racine de `src/app` alors que `export/` existe ; classe `flow-exports`
  (vocabulaire Séquences) reprise par États (`states/index.tsx:20`) ; nom de base du fichier calculé deux fois
  (`Viewer.tsx:204-207`, `diagnosticsExport.ts:16-19`) ; boîte 3D → rectangle de page copiée
  (`imageExport.ts:125-126`, `scene.ts:65-66`) ; règle « retour = pointillés » lue à deux endroits
  (`sequences/index.ts:206`, `sequences/export/plantuml.ts:107,119`) ; propriété « Contenu » en ligne dans
  `states/index.ts:67-87` ; `tableLevelKey` dans `rdd/editing/tableProperties.ts:156` ; ordre des tailles tiré de
  `Object.keys(LEVEL_SCALES) as TableLevel[]` (`tableLayout.ts:63`, `tableProperties.ts:135`) ; format
  `{ id: 'plantuml', name: 'PlantUML' }` déclaré dans l'appli pour États (`app/plugins/modes/states/index.tsx:8`)
  et dans le moteur pour Séquences. → 450
- Code mort et commentaires : `pngDensity()` sans appelant hors test (`render/png/pngDensity.ts:38`) ; `swatch` des
  points d'entrée / sortie alors qu'ils sont `styleable: false` (`initial/index.ts:29`, `final/index.ts:39`) ;
  exports sans appelant extérieur (`setCompositeStyle`, `compositeOutline`, `tabRect`, `tabPath`) ; `TITLE_FONT`
  dit « titre et contenu » (`stateLayout.ts:24`) ; `EXIT_COLOR` sert aussi au point d'entrée (`exitKind.ts:17`) ;
  commentaire non reflowé (`sequences/export/plantuml.ts:117`). → 450

**Tests** : rien sur `ImageExport.exportPng` ni `textsSynced` (→ 445) ; rien sur la mise en valeur imposée par
`edges.selectionStyle` côté hôte, repli compris (`highlight.ts:54-66`), ni sur `Selections.withContent` ; rien sur
les formes de `states` (`contains`, `hitBounds`, `movedHandles`, `textZone` de l'ensemble), `placed` avec `before`
(`compositeLayout.ts:168-175`), coins égaux et `orderComposites` ; la touche `x` de Séquences n'est pas appelée
dans les tests. → 451

**Docs** : la SPEC n'a aucune section sur le mode Machine à états (433-436 la demandaient) ; l'export PNG n'y est
cité qu'en « hors périmètre » (`SPEC.md:26`) ; `spatial.edgeLine` et le tracé imposé par l'ancrage (arrondi seul en
automatique) manquent à la table des attributs et à la ligne « Tracé » (`SPEC.md:500`) ; l'export PlantUML n'y est
décrit que pour Séquences ; `AJOUTER_UN_MODE.md:171` cite `src/app/export/` sans dire comment se servir
d'`ExportDialog` (props, aperçu choisi par `format.id`) ; `app/plugins/modes/registry.ts:18` renvoie à
`src/engine/modes/<id>/` (obsolète). → 452

**Dette notée** (`docs/backlogs/debt/`) : chaque export PNG compte comme une construction de scène dans les
métriques (453) ; migration des anciennes clés PlantUML qui lit `modes.sequences` dans l'appli (454) ;
`compositeContent` quadratique (455).

## Sujets

| #   | Sujet                                                                                  | Gain                                      | Taille | Décision |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------- | ------ | -------- |
| 445 | Export PNG : attendre tous les textes (riches, sur tracé) ; tests de l'export          | erreur (textes manquants possibles)       | M      | validé   |
| 446 | Export PlantUML des états : point d'entrée imbriqué vers un état extérieur             | erreur à confirmer                        | S      | validé   |
| 447 | Tracé et ancrage d'une page en un seul endroit (clés de tracé, `setPageMode`, appli)  | une seule table, domaine propriétaire     | M      | validé   |
| 448 | Texte libre d'une forme (corps RDD, contenu d'état) en brique commune                  | copie supprimée                           | S      | validé   |
| 449 | Saisie commune au glisser d'une forme et d'une flèche pleine, tests du glisser         | un seul pick, couverture                  | S      | validé   |
| 450 | Rangement, code mort et commentaires (appli, Séquences, RDD, États)                    | lisibilité                                | M      | validé   |
| 451 | Tests moteur manquants (mise en valeur imposée, `withContent`, formes d'états, touche x)| couverture                                | M      | validé   |
| 452 | Docs : SPEC (Machine à états, export PNG, tracé par page), guide d'un mode (export)    | doc juste pour un agent                   | M      | validé   |

Ordre suivi (validé) : 445, 446, 447, 448, 449, 451, 450, 452 (docs en dernier, car elles décrivent le code final). Un
commit par sujet, dès que `make check` est vert et le sujet validé. Aucun écart de comportement attendu sauf 445 et
446 (corrections) et la mention de 448.

- **Fini quand :** les sujets validés sont faits (chacun dans `done/`), `make check` vert, et la dette ci-dessus notée.

## Avancement

- [x] Tâche décrite (ce fichier)
- [x] Constats
- [x] Sujets rédigés
- [x] Sujets validés par l'utilisateur
- [ ] Réalisation
