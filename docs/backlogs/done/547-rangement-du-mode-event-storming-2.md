# Rangement du mode Event storming : export depuis `kinds.ts`, pivot, `readWall`, types de lien

> Audit 542 — mode Event storming (reprise de 514 à 520)

- Constats :
  - `EXPORTED` (`export/json.ts:17-26`) redonne type exporté et préfixe hors de `kinds.ts` : un 9e post-it ferait
    planter l'export (`EXPORTED.get(sticky)!`, l.75).
  - Tri « haut puis gauche » trois fois : `wallRules.ts:42` (`byReading`), `groups/stickyGroups.ts:27` (`byPlace`),
    `json.ts:65`. `at(x, y)` deux fois (`warnings/stickyBadge.ts:22`, `pivot/pivotMark.ts:25`). Texte entre guillemets
    insécables deux fois (`stickyRules.ts:59`, `pivotVerdict.ts:52`).
  - Valeurs du pivot décodées trois fois : `pivot/pivot.ts:14-15`, `json.ts:58-61`, `pivotVerdict.ts:55`.
  - `readWall` (`export/wallRules.ts:95-233`) : 138 lignes. `WallLink.type` et `COMMAND_TRIGGERS` en `string`
    (l.25, 39) : `'issues'`, `'triggers'`… comparés en dur sans vérification (l.173-225).
  - `GROUP_PARTS.at` (`groups/groupLabels.ts:57`) jamais utilisé (remplacé par `index.ts:70`) ; commentaire de `icon`
    posé sur `fonts` (`index.ts:31`) ; `MIN_CONTACT_SHARE` (`wallRules.ts:17`) exporté sans appelant.
- Ce qu'on veut : type exporté et préfixe dans `StickyType` (`kinds.ts`) ; un tri de lecture, un `at`, un `quoted`
  dans le mode ; un `pivotValueOf` dans `pivot/` ; `readWall` découpé en étapes nommées (liens, piles, R3,
  avertissements) ; types de lien typés (`LinkType | 'concerns'`) ; code mort retiré, commentaires remis en place.
- Écart de comportement : aucun.
- Tests : tests existants intacts (imports seuls).
- **Fini quand :** export JSON du mur identique sur les fixtures Event storming ; pastilles et pivot inchangés à
  l'œil ; `make check` vert.
- Fait :
  - `kinds.ts` : chaque post-it porte son type exporté et son préfixe (`exported`) ; `EXPORTED` de `export/json.ts`
    retiré ; définitions des post-it en objets nommés.
  - `readingOrder.ts` (`byReading`, sur des bornes) : tri des groupes, des post-it isolés, des groupes de
    `stickyGroups.ts` et des règles du mur.
  - `shapes/common/cornerMark.ts` : carré, retrait et écart des marques en coin, `at`, `cornerMarkRect` ;
    `PIVOT_MARK` et `STICKY_BADGE` en reprennent les mesures.
  - `stickyRules.ts` : `quoted` (guillemets insécables), repris par `named` et le verdict du pivot.
  - `pivot/pivotVerdict.ts` : `PIVOT_VALUES` et `pivotOfValue` ; `pivot.ts` : `pivotOf` (lu par `isPivot`,
    `isPivotUnknown` et l'export JSON).
  - `export/wallRules.ts` : `readWall` découpé en étapes nommées (`directLinks`, `linksThroughPiles`,
    `spreadOverPiles`, `policyIssues`, `hotspotLinks`, `wallWarnings`) ; type des liens `WallLinkType`
    (`LinkType | 'concerns'`), vérifié par TypeScript ; `MIN_CONTACT_SHARE` n'est plus exporté.
  - Commentaire de l'icône remis sur `icon` (`index.ts`). `GROUP_PARTS.at` gardé : `ModeParts.at` est obligatoire.
  - Écart de comportement : aucun.
  - Tests : `readingOrder.test.ts`, `shapes/common/cornerMark.test.ts`, `pivotOfValue` dans `pivotVerdict.test.ts` ;
    tests existants intacts.
  - Vérifié dans l'appli (`eventstorming.drawio`, `eventstorming-regles.drawio`) : pastilles d'avertissement à leur
    place, post-it inchangés. Export JSON vérifié par les tests.
