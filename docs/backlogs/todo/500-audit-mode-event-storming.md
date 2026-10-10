# Audit qualité — mode Event storming et ses ajouts au tronc, 4e passe

> Audit (procédure `docs/AUDIT.md`, copiée et remplie ici ; `docs/AUDIT.md` reste le modèle vierge). Lancé le
> 2026-10-10. Suite de 464 (dernier audit) ; périmètre : commits `29b39bd` à `acb49bd` (sujets 475 à 484, 80 fichiers,
> +2240 / −61). Ce fichier décrit la tâche et en suit l'avancement ; les constats deviennent des tickets.

## Objectif

Aucune action du mode (échange, ordre de dessin, en-tête exporté) ne modifie une forme verrouillée ni ne change le
fichier à l'aller-retour, le tronc ne fait pas confiance au mode pour ses propres gardes, et un agent peut reprendre
l'aimantation, les places ou les labels exportés pour un autre mode en lisant le guide, sans lire le tronc.

## Périmètre

- **Prioritaire** : `src/engine/plugins/modes/eventstorming/` (≈ 700 lignes) et les ajouts au tronc :
  `core/edit/edgeSnap.ts`, `core/edit/dragPlaces.ts`, `core/modes/fileLabels.ts`, `core/format/order.ts`
  (`placeBehind`), `core/format/parse.ts` (`shapeFromStyle`), `core/render/troikaText.ts` (polices nommées),
  `core/render/decorations.ts`, `core/domains/edit/drag/` (`gesture.ts`, `move.ts`, `preview.ts`, `resize.ts`),
  `core/domains/edit/commands/elements.ts`, `core/domains/modes/pageModes.ts`, `core/domains/document/file.ts`,
  `core/modes/` (`types.ts`, `modeEdit.ts`, `modeEditWriter.ts`), `Engine.ts`.
- **Secondaire** : appli, `src/app/fonts.ts`, `Viewer.tsx` (glisser depuis la palette), `Palette.tsx`,
  `LabelEditor.tsx`.
- **Docs** : `SPEC.md` §14.3 et §14.5, `SUMMARY.md`, `AJOUTER_UN_MODE.md`, `AJOUTER_UNE_FORME.md`, `COMPOSANT.md`,
  sujets 475 à 484.
- **Hors périmètre** : le Post-it général (411) sauf la brique commune de l'ombre ; tout changement de comportement
  visible sauf les corrections décrites dans un ticket.

## Axes d'analyse

1. Erreurs réelles : formes verrouillées, ordre de dessin, aller-retour du fichier, contrat de `gestures.placed`.
2. Découplage : tronc et appli sans nom de mode ; gardes du tronc indépendantes du mode ; contrat cohérent avec les
   points d'entrée existants.
3. Mutualisation : ombre du papier, intervalles par axe, calques d'aperçu, ordre des cellules sœurs.
4. Responsabilités et placement : hôte des modes qui relit le XML, géométrie rangée dans le mode, noms de fichiers.
5. Lisibilité et code mort.
6. Tests du tronc pour chaque règle.
7. Docs alignées sur le code.

## Constats (2026-10-10)

Trois explorations en parallèle (tronc, mode, appli et docs), puis chaque constat relu dans le code.

**Ce qui est sain** :

- Le tronc et l'appli ne nomment pas le mode (seulement des « ex. » en commentaire).
- Tous les nouveaux appels au mode passent par `PageModes.call` (garde et page en lecture seule) : `snapTargets`,
  `dragPlaces`, `exportedLabel`, `importedLabel`.
- Le mode n'importe que l'API des plugins ; aucun état de module mutable (le cache `WeakMap` est indexé par la page
  gelée).
- Toutes les écritures du mode passent par `ModeEdit`, dans l'étape du geste ; l'échange est une seule étape.
- Les règles pures sont dans `edit/` (`edgeSnap.ts`, `dragPlaces.ts`), testées seules ; la façade `Engine.ts` délègue.
- Places toujours retirées : fin du glisser, dépôt, sortie du canvas, Alt, `dragend` de la palette.
- L'export ne touche ni l'arbre du document ni les instantanés d'annulation.
- Fichiers courts (98 lignes au plus dans le mode), commentaires en français qui disent le pourquoi.
- `AJOUTER_UN_MODE.md` et SPEC §14.5 couvrent les sujets 475 à 484 ; les « Fait » sont exacts.

**Erreurs réelles** :

- L'échange déplace une forme verrouillée. `move.ts:109` garde `swapWith` sans `canMoveShape`, et `commitSwap`
  (`move.ts:191-198`) appelle `moveCell` sur l'autre forme. Le mode ne peut pas filtrer (`isLocked` n'est pas dans
  l'API des plugins), et la garde revient au tronc. → 501
- `commitSwap` appelle `shapesPlaced(pageId, [rootId, otherId])` sans `previous` (`move.ts:200`). Le contrat
  (`modeFollowUps.ts`) dit `previous` absent seulement pour un ajout ; rdd et states lisent `before`. Latent :
  aucun d'eux ne propose de places. → 501
- Ordre de dessin cassé dans une colonne de trois post-it ou plus. `stackPlaced` (`places/stacking.ts:11-16`) ne
  remet que les contacts du post-it posé. Colonne V, W, U, L de haut en bas, ordre `[L, V, W, U]`, U posé :
  `placeBehind(U, L)` → `[U, L, V, W]`, puis `placeBehind(W, U)` → `[W, U, L, V]` ; V passe devant W et son ombre le
  recouvre. → 502
- `placeBehind(page, id, id)` (`order.ts:57-70`) déplace la cellule : `order.indexOf(referenceId)` vaut -1 et
  `splice(-1, 0, id)` l'insère avant la dernière. Latent. → 502
- `importedLabel` (`export/fileLabel.ts:21-29`) retire l'en-tête même quand la page masque les labels, alors
  qu'`exportedLabel` n'en met pas : un post-it Command au texte `<b>Command</b><br>x` est enregistré tel quel puis
  rouvert en `x`. → 503
- Label en texte brut (`html=0`, venu de draw.io) : `rewriteLabels` (`fileLabels.ts:23`) passe par
  `setCellRichLabel`, qui force `html=1` sans échapper `<`, `&` ni changer `\n` en `<br>`. Le texte change à
  l'aller-retour. → 503
- Coller du XML de draw.io (`clipboard.ts:39`) ne passe pas par `importedLabel` : l'en-tête reste dans le texte et
  sort en double à l'enregistrement suivant. → 503

**Ce qui freine l'extensibilité** :

- L'hôte des modes relit et réécrit le fichier (`pageModes.ts:130-138`, `readDrawio` puis `writeDrawio`) ;
  `rewriteLabels`, qui écrit l'arbre XML, est rangé dans `core/modes/` au lieu de `core/format/` ; signatures
  asymétriques `importLabels(document, tree)` / `exportLabels(xml, document)`. → 503
- `snapTargets` renvoie un type anonyme `Array<{ id; rect }>` (`types.ts:205`), alors que `obstacles` et
  `dragPlaces` ont un type nommé ; le seuil « 8 px » est écrit dans la doc du contrat (`types.ts:202`) en plus de
  `EDGE_SNAP_PIXELS`. → 506
- `nudgeSelection` (`gesture.ts:325-336`) appelle `snapTargets` du mode par `moveDrag` puis jette le résultat ; la
  doc dit qu'un pas au clavier ne s'aimante pas. `switchPlan` (`move.ts:119`) ne recalcule pas `snapping` quand Ctrl
  change les formes emportées (latent : Event storming n'emporte rien). → 506

**Mutualisation et responsabilités** :

- Ombre floue du papier copiée du Post-it général : `shapes/common/stickyPaper.ts:14-49` reprend
  `plugins/shapes/general/post-it/index.ts:12-46` (constantes `SHADOW_*`, opacité par couche, boucle, ordre de rendu) ;
  seul le contour de chaque couche change. → 504
- Intervalles d'un rectangle par axe écrits trois fois : `span` privé dans `edgeSnap.ts:22`, `obstacles.ts:53-55`,
  `contacts.ts:44-49` et `:73-74`. `overlapping` (`contacts.ts:71`, lu par `places/dragPlaces.ts`) est un
  `rectsOverlap` avec tolérance, rangé dans le mode. `OPPOSITE` (`contacts.ts:15`) redéclare ce que donne
  `SIDE_NORMALS`. → 504
- `ConnectorPreview.showPlaces` / `clearPlaces` (`preview.ts:139-164`) recopient le cycle de `showLimits` /
  `clearLimits` (clé, `root.add`, `z`, `depthTest`, `requestRender`). → 504
- `order.ts` : `parentOf`, cellules sœurs, puis `reindexPage` + `markPageDirty` écrits pour la troisième fois
  (`reorderCells`, `sendToBackInOrder`, `placeBehind`). → 504
- Mode : `places/dragPlaces.ts` porte le nom de `core/edit/dragPlaces.ts` ; `places/stacking.ts` traite de l'ordre de
  dessin ; `export/fileLabel.ts` fait aussi l'import ; `LABELS` (clé du mode) est dans `shapes/common/stickyLayout.ts`
  ; filtre « autres post-it » écrit trois fois (`index.ts:50-52`, `dragPlaces.ts:58`, `contacts.ts:84`) ;
  `snapTargets` écrit en ligne dans `index.ts` ; rayon de voisinage pris sur `STICKY.size`, constante de dessin. → 505
- Code mort : `CONTACT_TOLERANCE` (`contacts.ts:13`) et `labelsShown` (`pageLabels.ts:13`) exportés sans lecteur
  ailleurs. Commentaire périmé `core/plugins/index.ts:100-101` (« `roundedRectPath` et `darken` sans plugin qui les
  appelle » : `stickyPaper.ts` et `simulationMarks.ts` les appellent). → 505, 506
- Tronc, menus : `modeEditWriter.ts:253` fait `shapes.some(s => s.id === …)` au lieu de `shapeOf` ;
  `spatialValue(…, SPATIAL.kind)?.trim() || resolveShapeKind(…)` recopié (`parse.ts:106`, `:133`) ; `rectPath`
  calculé deux fois par place (`decorations.ts:222-230`) ; `gesture.ts` fait 416 lignes. → 506
- Appli : `editorFontFamily` (`src/app/fonts.ts:28-29`) teste la chasse fixe avant la police nommée, le moteur
  (`troikaText.ts:75-77`) l'inverse. Sans effet aujourd'hui. → 506

**Tests** :

- Tronc : rien sur `commitSwap` (étape, cible verrouillée, `previous`), `paletteDragOver`, `addShape` dans une place,
  `rewriteLabels` seul, l'aller-retour `serialize` puis `load`, l'exception levée par `exportedLabel`.
- Mode : colonne de trois post-it, labels masqués à l'import, `html=0`, formes verrouillées.
- Tests du mode à plat au lieu du miroir de `src/` (`contacts/`, `places/`, `labels/`, `export/`) ; cellule de texte
  recopiée dans quatre tests ; `shapes.find(s => s.id === …)` dans `helpers.ts:30` et `fileLabel.test.ts:33`.

→ chaque ticket porte ses tests ; rangement des tests : 505.

**Docs** :

- `SUMMARY.md:96` résume Event storming en « post-it typés, contacts bord à bord » (sans aimantation, places, en-tête
  exporté, ordre de dessin) ; « Où regarder », ligne « Nouveau mode » (`:119`), ne cite pas
  `plugins/modes/eventstorming/`, seul exemple de `snapTargets`, `dragPlaces`, `exportedLabel` et `importedLabel` ;
  carte `core/modes/` (`:49`) sans `fileLabels.ts`.
- `AJOUTER_UN_MODE.md:404` : la ligne `gestures.dragPlaces` du tableau des garanties oublie le survol et le dépôt
  depuis la palette (page du modèle, forme construite par `shapeFromStyle`).
- `AJOUTER_UNE_FORME.md:418` : `PaletteEntry.description` (479) absent ; rien sur un texte en police nommée
  (`fontFamily`, repli en Roboto si l'hôte ne la fournit pas).

→ 507

**Dette notée** (`docs/backlogs/debt/`) :

- post-it verrouillé : la copie `spatial.es.labels` n'est jamais tenue à jour (`setElementAttribute` ignoré sur un
  élément verrouillé), dessin et export faux (508) ;
- aimantation et places ignorent la rotation (509) ;
- un mode ne peut pas livrer sa police : l'appli doit la fournir sous le même nom, sans test qui les relie (510) ;
- huit `shapes/<type>/index.ts` identiques imposés par le collecteur (511) ;
- `exportedLabel` / `importedLabel` rangés dans `lifecycle`, à côté de points d'entrée qui reçoivent un `ModeEdit`
  (512) ;
- `exportLabels` relit et réécrit tout le fichier à chaque sauvegarde automatique d'un document qui a une page Event
  storming (513).

## Sujets

| #   | Sujet                                                                                       | Gain                                   | Taille | Décision |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------- | ------ | -------- |
| 501 | Échange de place : forme verrouillée épargnée, bornes d'avant passées au mode               | erreur (verrou), contrat               | S      | validé   |
| 502 | Ordre de dessin d'une colonne de post-it, `placeBehind` sur elle-même                       | erreur (ombre visible)                 | S      | validé   |
| 503 | Labels du fichier : aller-retour sans perte, coller, réécriture rangée dans `format/`       | erreurs (texte perdu), responsabilités | M      | validé   |
| 504 | Briques communes : ombre du papier, intervalles par axe, calques d'aperçu, cellules sœurs   | mutualisation                          | M      | validé   |
| 505 | Rangement du mode Event storming (noms, clés, code mort, tests en miroir)                   | lisibilité                             | S      | validé   |
| 506 | Tronc : contrat de l'aimantation, pas au clavier, menus (`shapeOf`, `gesture.ts`, polices)  | extensibilité, lisibilité              | S      | validé   |
| 507 | Docs : SUMMARY, garanties de `dragPlaces`, guide d'une forme (description, police nommée)   | doc juste pour un agent                | S      | validé   |

Ordre validé (2026-10-10) : 501, 502, 503 (erreurs), puis 504, 505, 506, et 507 en dernier (les docs décrivent le
code final). Un commit par sujet dès que `make check` est vert (l'utilisateur a validé les sujets d'avance : commit au
fur et à mesure). Écarts de comportement : seulement ceux que décrit chaque ticket.

Les itérations 485 et 486 (mode Event storming, faites en parallèle, commit `fa4ca94`) ont touché
`places/dragPlaces.ts` et `stickyShape.ts` : 502 et 505 partent de cette version.

- **Fini quand :** les sujets validés sont faits (chacun dans `done/`), `make check` est vert, et la dette ci-dessus
  est notée.

## Avancement

- [x] Tâche décrite (ce fichier)
- [x] Constats
- [x] Sujets rédigés
- [x] Sujets validés par l'utilisateur
- [ ] Réalisation
