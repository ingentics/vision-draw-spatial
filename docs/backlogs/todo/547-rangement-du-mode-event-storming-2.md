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
