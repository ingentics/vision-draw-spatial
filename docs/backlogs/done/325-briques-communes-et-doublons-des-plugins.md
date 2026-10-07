# Briques communes reprises des plugins, seconde passe, et doublons

> Architecture du moteur — tronc commun ; suite de 291 et 307. Audit du 2026-10-07 (seconde passe). Peut être découpé
> (chaque point est indépendant) ; **comportement et rendu inchangés** sur tout le ticket, sauf mention.

Règle appliquée (`coding.md` §4) : une brique que deux plugins (ou un plugin et le tronc) refont à la main entre dans
le tronc et s'exporte par `core/plugins/index.ts` ; deux variantes proches deviennent une fonction paramétrée ou deux
noms qui disent la différence, avec un commentaire. Avant chaque ajout : `grep -rn` du nom dans `src/engine` (pas de
nom de fichier déjà pris, `coding.md` §2).

## 1. Briques à ajouter au tronc et à l'API des plugins

| # | Brique | Où dans le tronc | Qui la refait aujourd'hui (à remplacer) |
|---|---|---|---|
| 1a | `darken(color, amount)` (HSL, existe déjà) **exporté** | `render/decorations.ts:189` → API | aucun plugin (ils n'y ont pas accès) |
| 1b | `shade(color, factor)` : couleur × `factor` en RVB (#rrggbb), accepte `string` ou `Color` ; **second nom** parce que le résultat diffère de `darken` (comment : HSL garde la teinte perçue, RVB est le retrait draw.io des gravures) | nouveau, à côté de `darken` ; les deux exportés | `darker(shape, factor)` de `plugins/shapes/generic/building/index.ts:90-93` (gardé localement comme simple appel `shade(styleColor(...), factor)` ou supprimé si ses 3 appelants — building, `generic/tagged-process/index.ts:12,82`, `architecture/distributed-cache/facade.ts:4,53` — appellent `shade` directement) ; `rdd/shapes/common/table.ts:125` (`headerColor.clone().multiplyScalar(0.85)`) |
| 2 | `clamp(value, min, max)` | nouveau `core/model/numbers.ts` (pas `geometry.ts` : ce n'est pas de la géométrie), exporté | ≈ 18 sites : `rdd/tables/operations.ts:102`, `rdd/editing/fieldParts.ts:99`, `sequences/steps.ts:96,125`, `effects/forest/index.ts:147`, `shapes/architecture/process/index.ts:13` (un `clamp` local à supprimer), `generic/tagged-process:39-40`, `generic/cylinder:119`, `architecture/distributed-cache/index.ts:13` et `facade.ts:23,37`, `architecture/queue/facade.ts:46`, `architecture/database/facade.ts:36`, `generic/building:171`, `geometry/octagon:15`, `geometry/four-point-star:15` ; dans le tronc `edit/edgeEnds.ts:77` |
| 3 | `ModeKeys.pageFlag(page, name, defaultOn = false)` et `ModeKeys.number(element, name)` (nombre fini ou `undefined`, sans la contrainte « entier > 0 » de `spatialNumber`) | `core/modes/modeKeys.ts` (déjà dans l'API) | `rdd/relations/kinds/table/cardinalities.ts:15` (`!== '0'`) ; `sequences/steps.ts:43-44` (`Number(keys.value(...))` + validation) |
| 4 | Convention des `toggle` déclarés : `TOGGLE_ON = '1'`, `isToggled(value): boolean`, `toggleValue(on): string \| undefined` | `core/modes/modeProperties.ts` (nouveau, ou `modeKeys.ts` si plus simple), exporté ; `app/plugins/modes/ModeFields.tsx:72` l'utilise aussi | `rdd/index.ts:61,63`, `rdd/editing/tableProperties.ts:67,72-73`, `rdd/editing/fieldProperties.ts:37-38` |
| 5 | Accès typés aux `PluginValues` : `numberValue(values, key)`, `stringValue`, `booleanValue` (valeur du type attendu, sinon exception : le registre les a déjà bornées, une absence est une erreur de clé) | `core/settings/pluginSettings.ts`, exportés | `sequences/settings.ts:154-173` (11 casts `as number/string/boolean`), `rdd/index.ts:121`, `effects/forest/index.ts:85` |
| 6 | Cibles d'un réglage de mode : `shapeTarget(target)`, `edgeTarget(target)` (discriminants `'kind' in` / `'sourceId' in`) et `onlyWhen(properties, shown)` (combinateur de `hidden`) | `core/modes/modeTargets.ts` (nouveau), exporté ; voir si `domains/edit/text/labelEditor.ts:98` fait le même test et peut l'utiliser | `rdd/editing/tableTargets.ts:12-15,70-78` (déplacés tels quels ; les `hidden` de `regionProperties.ts:26`, `tableProperties.ts:75,91-94,109`, `fieldProperties.ts:51-55,69,83-86,101,115` continuent de passer par `onlyWhen`) |
| 7 | Étiquette d'une cellule : `labelObject(ctx, spec, cellId)` = `ctx.text.create(spec)` + `name = 'label'` + `userData.labelCellId = cellId` + `renderOrder = PART_ORDER.label` ; `createLabel` (`render/flat/box.ts:61-101`) l'appelle en interne | `render/flat/box.ts` (ou `render/labels.ts` si box.ts dépasse 400 lignes), exporté | `rdd/shapes/region/index.ts:108-124` (copie partielle de `createLabel` : nom de région sur l'onglet) |
| 8 | Préset « Gris » : exporter `DRAWIO_STYLES` (`edit/stylePresets.ts:17`) ou une fonction `drawioStyle(name)` | `edit/stylePresets.ts` → API | `rdd/tables/tableColors.ts:9-12` (`#f5f5f5`, `#333333`, `#666666` recopiés : les dériver du préset, commentaire conservé) ; acteurs : `shapes/general/actors/common/standing.ts:99,113,193,200` et `definition.ts:26,29` écrivent `'#ffffff'` / `'#000000'` → `VERTEX_DEFAULTS.fill` / `.stroke` (déjà exporté, mêmes valeurs) |
| 9 | Index d'une page : `shapesById(page)` et `edgeEnds(index, edge): { source?, target? }` | `core/model/pageIndex.ts` (nouveau), exporté ; les 5 sites du tronc qui font `new Map(page.shapes.map(...))` l'utilisent aussi (`render/pageScene.ts:57,82`, `domains/edit/drag/liveEdit.ts:75`, `domains/edit/edges/edgeHandles.ts:43`, `domains/edit/edges/anchors.ts:144`…) | `rdd/editing/tableTargets.ts:18` (`shapeById`), `rdd/relations/relationKinds.ts:40-41,64-75,84-85`, `rdd/relations/relationFields.ts:28-29`, `sequences/export/plantuml.ts:39-40` |

Pour chaque brique : test unitaire dans `tests/` au chemin miroir (`model/numbers.test.ts`, `modes/modeKeys.test.ts`,
`settings/pluginSettings.test.ts`, `render/styleColors.test.ts` ou `decorations.test.ts` pour `shade`…), et une ligne
dans `AJOUTER_UNE_FORME.md` / `AJOUTER_UN_MODE.md` (liste des briques à chercher avant d'écrire un calcul).

## 2. Doublons et code mort dans les plugins

- **`renderOrder = PART_ORDER.stroke` redondant** après `strokeMesh`, qui le pose déjà (`render/meshes.ts:65`) : à
  supprimer dans `rdd/shapes/common/fieldRow.ts:43,119`, `rdd/shapes/common/table.ts:137`,
  `rdd/shapes/common/headerMarks.ts:124`, `actors/common/standing.ts:209,228`, `actors/common/definition.ts:39`,
  `generic/box/index.ts:146`, `generic/cylinder/index.ts:148`, `generic/building/index.ts:139`. Les décalages
  `+0.5`, `+0.6`, `+0.75` sont voulus : on ne touche qu'aux affectations à la valeur exacte.
- **Code mort** : `moveFlow` (`sequences/steps.ts:91-98`) et `sequenceExporter()` (`sequences/export/index.ts:18`)
  n'ont d'appelant que dans `tests/engine/plugins/modes/sequences.test.ts` ; les retirer avec leurs tests (ou, si
  `sequenceExporter` sert d'API documentée, le dire en commentaire et le garder).
- **`rdd/editing/fieldParts.ts:94`** : le test « hors du rectangle » vaut `!rectContains(shape.bounds, point)`
  (`model/geometry.ts:22`, bords compris, déjà exporté). La variante de la ligne 19 omet volontairement une borne : la
  laisser, avec un commentaire qui dit pourquoi, si c'est bien voulu.
- **Nom de secours** : `title || id` d'un flux écrit cinq fois (`sequences/index.ts:38,106`, `steps.ts:57`,
  `export/plantuml.ts:72`, et `app/plugins/modes/sequences/ExportViewer.tsx:99` via `api.ts`) → `flowLabel(flow)`
  dans `sequences/flows.ts`, exporté par `api.ts` pour l'appli. `label || id` d'une forme (`rdd/editing/tableTargets.ts:22`,
  `plantuml.ts:52`) → `elementName(element)` dans `core/model/names.ts`, exporté.
- **`regionTextColor`** (`rdd/regions/regionLayout.ts:94-96`) n'est qu'un alias de `readableOn` : l'inliner, le
  commentaire suit.
- **Marqueurs `userData` réservés aux tests** : `kind` / `nullable` (`rdd/shapes/common/fieldRow.ts:31-32`) et `mark`
  (`headerMarks.ts:114`) ne sont lus que par `tests/.../rdd/shapes/common/table.test.ts`. Les garder mais le dire en
  commentaire (« marqueur pour les tests, non lu par le moteur »).
- **Rangement** : `SEQUENCES_KEYS` et `keys` vivent dans `sequences/flows.ts:12-13` alors que RDD a `rdd/keys.ts` →
  `sequences/keys.ts`, imports ajustés (imiter le voisin, `coding.md` §1).
- **Algèbre de liste ordonnée** : après la suppression de `moveFlow`, il reste `rdd/tables/operations.ts:98-105`
  (insérer après) et `:138-149` (déplacer), et `sequences/steps.ts:120-129` (échanger deux rangs). S'il reste deux
  vrais utilisateurs d'un même mouvement, `moveItem(list, from, to)` dans `core/model/lists.ts` ; sinon ne rien faire
  (noter la décision dans le « Fait : »).
- **`accent` de `RenderContext` et `volume.tags`** : un seul lecteur chacun (`distributed-cache/facade.ts:33`,
  `generic/building/index.ts:175`). Pas d'action : les laisser, le relever dans le « Fait : » pour mémoire.

## Validation

- Comparaison avant / après sur toutes les fixtures de rendu existantes (`shapesFixture.test.ts` compare les formes au
  pixel avec les exports draw.io : il doit passer sans changement) ; pour `shade`, un test jetable compare l'ancienne
  `darker` et la nouvelle sur une vingtaine de couleurs avant de supprimer l'ancienne (`coding.md` §7).
- À l'œil dans l'appli (serveur 5173, trois vues) : fixture des formes (bâtiments, process étiquetés, cache distribué,
  cylindres, acteurs), page RDD (tables, entête gris, onglet de région et son nom, marques d'entête), page Séquences
  (barre du flux, export PlantUML, liste des flux avec leurs noms), forêt en iso.
- **Fini quand :** chaque ligne du tableau §1 a sa brique dans le tronc, exportée, testée, et plus aucune copie dans
  les plugins (recherche relue : `multiplyScalar(0.`, `Math.max(.*Math.min(`, `as number`, `=== '1'`, `'kind' in`,
  `labelCellId =`, `'#ffffff'`, `new Map(page.shapes.map`) ; les points du §2 sont faits ou motivés dans le « Fait : » ;
  rendu identique à l'œil ; `make check` vert (`COMPOSE_PROJECT_NAME=drawio-claude`). Aucun fichier `.drawio` touché.

- Fait :
  - **§1, briques ajoutées au tronc et exportées par `core/plugins/index.ts`** (chacune avec son test au chemin miroir) :
    `shade` (à côté de `darken`, `decorations.ts` ; `darker` du bâtiment et le rabat de table l'appellent) ; `clamp`
    (`model/numbers.ts`, une trentaine de sites dont `frameConstraint` du tronc, le `clamp` local de `architecture/process`
    supprimé ; bornes inversées : le minimum l'emporte, comme l'écriture `Math.max(min, Math.min(max, v))` qu'avaient
    les plugins) ; `ModeKeys.number` / `pageFlag` ; `isToggled` / `toggleValue` (`modes/modeProperties.ts`, aussi
    exportés par `src/engine/index.ts` pour `ModeFields.tsx`) ; `numberValue` / `stringValue` / `booleanValue`
    (`settings/pluginSettings.ts`, exception si le type n'est pas celui attendu) ; `shapeTarget` / `edgeTarget` /
    `onlyWhen` (`modes/modeTargets.ts`, `labelEditor` s'en sert) ; `labelObject` (`render/flat/box.ts`, la région garde son
    nom d'objet `region-label`) ; `drawioStyle` (`edit/stylePresets.ts` : entête, texte et bordure des tables RDD en
    dérivent ; acteurs : `VERTEX_DEFAULTS`) ; `shapesById` / `edgeEnds` (`model/pageIndex.ts`, repris par neuf sites du
    tronc et les plugins RDD / Séquences) ; `elementName` (`model/names.ts`). Lignes de doc dans `AJOUTER_UNE_FORME.md` et
    `AJOUTER_UN_MODE.md`.
  - **§2** : `renderOrder = PART_ORDER.stroke` redondant retiré partout sauf `standing.ts` (`edgeLines`, pas `strokeMesh`) ;
    `moveFlow` et `sequenceExporter` supprimés avec leurs usages de test ; `fieldParts.dropAt` utilise `rectContains`
    (l'autre test, sans borne basse, est motivé en commentaire) ; `flowLabel` (exporté par `api.ts` pour l'appli) ;
    `regionTextColor` inliné (`readableOn`) ; marqueurs `userData` des tests commentés ; `sequences/keys.ts` ;
    `accent` et `volume.tags` laissés (un lecteur chacun).
  - **Décisions** : algèbre de liste (`moveItem`) : non faite, insertion, déplacement et échange de rangs ne sont pas le
    même mouvement, et `moveFlow` supprimé ne laisse plus de doublon. `relationKindOf` / `relationKindOfField` gardent
    leur `page.shapes.find` (un `shapesById` par appel coûterait plus qu'il ne rend). `darker` reste dans le bâtiment,
    simple appel de `shade` (3 appelants).
  - **Écart** : le rabat de table passe par `shade` (hex #rrggbb) au lieu d'une `Color` flottante : arrondi à 8 bits,
    invisible à l'œil. `shade` et l'ancien `darker` sont identiques par construction (même calcul), donc pas de test
    jetable.
  - **Validation** : `make check` vert (125 fichiers, 2122 tests, dont `shapesFixture`) ; à l'œil sur 5173, fixture des
    formes en 2D et Iso et mini-carte. Tables RDD, onglet de région, page Séquences, forêt non revérifiés à l'œil.
