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
