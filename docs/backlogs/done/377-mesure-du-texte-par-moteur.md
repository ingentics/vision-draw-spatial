# Mesure du texte portée par le moteur, pas par le module

> Architecture du moteur — pas d'état mutable de module (`coding.md` §3). Audit du 2026-10-08 (`AUDIT.md`).

- Constat : `core/render/textMeasure.ts:9` garde `let current`, posé par chaque `EngineCore` (`EngineCore.ts:187-188`,
  `setTextMeasure`). Deux moteurs d'une même page partagent la dernière mesure posée ; les tests s'influencent. Les
  plugins la lisent par `measureText` (API des plugins, ex. onglet de région RDD, sujet 228).
- Ce qu'on veut : la mesure appartient à l'instance : portée par le contexte remis aux formes (`RenderContext` /
  `ctx.text`) et par ce que reçoivent les modes qui mesurent, avec l'approximation (`approximateMeasure`) par défaut.
  `setTextMeasure` et l'état de module disparaissent ; `hasExactTextMeasure` devient une question au moteur.
- Préciser au passage dans `coding.md` §3 l'exception admise : un cache pur indexé par un objet immuable (`WeakMap`,
  ex. `sequences/steps.ts:22`, `model/freeze.ts:24`) n'est pas un état de module.
- Écart : aucun avec un seul moteur.
- **Fini quand :** `grep -rn "^let " src/engine` ne montre plus d'état de mesure ; deux moteurs avec des mesures
  différentes ne se gênent pas (test) ; onglets de région RDD identiques à l'œil avant et après chargement des
  polices ; `make check` vert.
- Fait : la mesure du texte appartient au moteur. `core/render/textMeasure.ts` devient la classe `TextMeasure`
  (approximation, puis `settle` avec la mesure des polices chargées ; `isExact`), une par `EngineCore`
  (`core.textMeasure`) ; `setTextMeasure`, `hasExactTextMeasure` et l'état de module disparaissent
  (`grep -rn "^let " src/engine` : vide). Elle arrive aux plugins par ce qu'ils reçoivent déjà :
  - formes : `RenderContext` étend `MeasureContext` (`ctx.measureText`, posé par `SceneView.renderContext`) ; les points
    d'entrée géométriques `outline`, `contains`, `hitBounds`, `textZone`, `movedHandles` reçoivent ce `MeasureContext`
    en dernier paramètre, remis par le registre du moteur (`ShapeRegistry.measuringWith`, appelé par `EngineCore` ;
    approximation par défaut pour un registre sans moteur) : dessin, clic et poignées de la région RDD mesurent pareil ;
  - modes : `ModeEditContext.measureText` (rempli par `PageModes.editContext`), exposé par `ModeEdit.measureText` ;
    `ModeEdit` étend `ModeSizing` (`gridSize`, `measureText`), que `ModeParts.textPreview` reçoit désormais à la place
    de `gridSize` seul (`ShapeParts.textPreview`) ;
  - `createLabel` (troncature) mesure par `ctx.measureText` ; `ModeFollowUps.documentOpened` demande
    `core.textMeasure.isExact`.
  API des plugins : `measureText` retiré ; ajoutés `approximateMeasure`, les types `MeasureText`, `FontSpec`,
  `MeasureContext`, `ModeSizing`. RDD : `fieldLayout`, `dividerLabelWidth`, `dividerWidth`, `rowWidth`, `tableWidth`
  prennent la mesure (`ctx.measureText` au rendu, `edit.measureText` / `sizing.measureText` aux opérations et à
  l'aperçu) ; `FIELD_LABEL_X` sort de `fieldLayout` pour l'éditeur de champ (qui ne mesure rien) ; la région passe
  `ctx` à `tabText` / `tabRect` / `tabPath` / `regionOutline`. La taille des modèles de la palette RDD, calculée à
  l'enregistrement sans moteur, prend `approximateMeasure` explicitement (c'était déjà l'approximation).
  L'exception `WeakMap` de `coding.md` §3 était déjà écrite (sujet 389). Docs : `AJOUTER_UNE_FORME.md` (signatures,
  « Mesure du texte »), `AJOUTER_UN_MODE.md` (`edit.measureText`, `textPreview`), `SUMMARY.md` §3.
  Écart : aucun avec un seul moteur. Avec deux moteurs, chacun garde sa mesure (avant : la dernière posée valait pour
  tous, et un moteur dont les polices n'étaient pas encore chargées se croyait « exact »).
  Validation (tests seulement) : `tests/engine/core/render/textMeasure.test.ts` (deux mesures indépendantes),
  `region.test.ts` (deux registres de mesures différentes : prise au clic, zone du texte et onglet dessiné suivent
  chacun la sienne), `operations.test.ts` (largeur d'une table écrite selon la mesure du contexte d'opération). Tests
  existants modifiés seulement pour passer une mesure (`MEASURE` de `tests/helpers.ts` dans les `RenderContext`
  littéraux et les appels directs à `definition.outline`, `tabRect`…, `fieldLayout` ; `textPreview` reçoit
  `{ gridSize: 10, ...MEASURE }` ; le cœur réduit de `pageModes.test.ts` reçoit un `TextMeasure`). À vérifier à l'œil : onglets des régions RDD (`rdd.drawio`) identiques avant et
  après chargement des polices (recharger la page), clic sur l'onglet et poignée haut-gauche à son coin ; largeur d'une
  table RDD après ajout d'un champ et pendant la saisie d'un label ; libellé tronqué d'une forme `truncate`.
