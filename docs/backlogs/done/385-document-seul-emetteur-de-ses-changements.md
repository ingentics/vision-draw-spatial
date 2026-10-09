# Le document seul émet ses changements et recharge ; chaque domaine garde son état

> Architecture du moteur — frontières des domaines (`coding.md` §3). Audit du 2026-10-08 (`AUDIT.md`). Après 376.

- Constat :
  - `documentChange` émis de cinq endroits : `domains/document/file.ts:84,186`, `domains/edit/undo.ts:116`,
    `commands/styles.ts:71`, `commands/properties.ts:98` ;
  - `undo.ts:101-117` (`restore`) pilote un rechargement complet (`graph.invalidate`, `scenes.clear`,
    `pages.setCurrent`, émission) : c'est le travail de `DocumentFile` ;
  - `file.ts:173-181` reprend la sélection par id, ce que fait `Selections.rebind` (`selection.ts:35-42`) avec des
    nuances : un seul chemin, `selection.reselectIn(page, part)` ;
  - `viewModes.ts:176-179` vide les scènes à la main et émet `settingsChange` à la place de `config`
    (`config.adoptPageIso` contourne les domaines prévenus des réglages) ;
  - `EngineCore.ts:180` règle `edits.undoStack.setLimit` à la main au démarrage alors que `undo.ts:21` le fait ;
  - champs publics modifiables lus par d'autres domaines : `pages.pageCameras`, `pageIso` (`pages.ts:25,29`, lus par
    `history.ts:90`, `links.ts:85`, `viewModes.ts:164`), `file.geometry`, `file.document`, `xmlTree`,
    `pages.currentPageId` : privés + accesseurs (aucune écriture croisée aujourd'hui : prévention).
- Ce qu'on veut : `DocumentFile` seul émet `documentChange` et fait le rechargement après annulation ; une seule
  reprise de sélection ; `Config` seul émet `settingsChange` et prévient les domaines ; état exposé en lecture seule.
- Écart : aucun ; vérifier que l'ordre des événements reçus par l'appli ne change pas (test sur les émissions).
- **Fini quand :** `grep -rn "emit('documentChange'" src/engine` ne trouve que `file.ts` ; annuler / rétablir,
  changer d'iso par page, recharger un fichier modifié à côté identiques à l'œil ; `make check` vert.
- Fait :
  - `documentChange` émis du seul `DocumentFile` (`document/file.ts`, `notifyChanged`) : `restore(xml)` y reprend le
    rechargement d'annuler / rétablir (`document/undo.ts` ne garde que la pile et son compte d'étapes) ; `liveWritten()`
    (état « modifié » puis document) appelé par `LiveEdit.afterLiveWrite` (`edit/drag/liveEdit.ts`). Les émissions de
    `commands/styles.ts` et `properties.ts` avaient déjà disparu au sujet 376.
  - Reprise de sélection : une seule recherche des éléments par id (`sameElementsIn`, `selection/selection.ts`), deux
    usages nommés : `rebind` (copie de travail d'un geste : tout ou rien, seul l'événement suit) et `reselectIn(page,
    previous)` (après relecture : éléments restants, sélection complète), appelé par `documentChanged`. Le choix
    forme / flèche ne dépend plus du type d'origine (forme d'abord, comme `documentChanged`) : identique sur une copie
    de la même page.
  - `settingsChange` émis du seul `Config` : `adoptPageIso` prévient les domaines inscrits à
    `EngineCore.pageSettingsAdopted` (les niveaux : scènes vidées si volumes ou profondeur changent,
    `Levels.pageSettingsAdopted`), puis émet. Pas `settingsChanged` complet : il animerait la caméra et garderait ces
    réglages pour la page quittée. `EngineCore` règle la limite d'annulation par `edits.settingsChanged`.
  - État en lecture seule : `file.document`, `xmlTree`, `fileId` (accesseurs ; `getDocument`, `getXmlTree`,
    `getFileId` retirés, `Engine.ts` et `modeFollowUps.ts` lisent les accesseurs), `file.savedGeometry(pageId)`
    (`arrangement.ts`), `pages.currentPageId`, `lastDocumentPageId` (accesseurs), `pages.cameraOf` / `isoOf`
    (`history.ts`, `links.ts`, `viewModes.ts`).
  - Règle ajoutée (`.claude/rules/coding.md` §3, `docs/SUMMARY.md` §3) : un émetteur par état, état lu ailleurs en
    lecture seule. Dette notée : `debt/400` (autres champs publics modifiables).
  - Écart : aucun ; ordre et contenu des événements vérifiés par des tests qui tracent appels et émissions, écrits et
    passés sur l'ancien code avant le changement : annuler / rétablir, écriture en direct, arbre changé, chargement
    (`tests/engine/core/domains/document/file.test.ts`, aide `tests/engine/core/domains/traced.ts`), réglages iso
    d'une page (`tests/engine/core/domains/runtime/config.test.ts`). Tests existants intacts.
  - Validation : tests seulement (`make check` vert) ; pas de contrôle à l'œil dans l'appli (annuler / rétablir, iso
    par page, rechargement d'un fichier modifié à côté à vérifier par l'utilisateur).
