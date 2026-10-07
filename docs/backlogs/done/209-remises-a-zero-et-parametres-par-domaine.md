# Remises à zéro et paramètres gérés par chaque domaine du cœur

> Dette technique du moteur (séparation des responsabilités)

- **Écritures croisées** : plus aucun domaine de `core/` n'écrit dans l'état d'un autre
  (`this.core.<domaine>.<champ> = …`) ; chaque écriture passe par une méthode du domaine propriétaire
  (`pages.setCurrent`, `camera.cancelAnimation`, `gesture.cancel`, `edits.…`, `display.…`).
- **Chargement** : `DocumentFile.load` ne remet plus les domaines à zéro un par un ; chaque domaine qui a un état
  lié au document a son `reset()` (ou équivalent), appelé par le cœur au chargement dans une seule liste
  déclarée à côté des domaines.
- **Paramètres** : `Config.updateSettings` ne décide plus pour les autres ; il prévient les domaines du changement
  (`previous`, `next`) et chacun reconstruit ce qui le concerne (scènes, mini-carte, vue graphe…).
- **Fini quand :** `grep -E "core\.[a-z]+\.[a-zA-Z.]+ = " src/engine/core` ne trouve plus d'écriture croisée ;
  changer de fichier, de page, et modifier les réglages de vue, de fond, de sélection et de mini-carte donne le même
  résultat qu'avant dans l'appli ; `make check` vert.
- Fait : méthodes des domaines propriétaires à la place des écritures croisées : `pages.setCurrent` / `arriveAt` /
  `rememberCamera` / `rememberIso` / `savedViews`, `camera.cancelAnimation` / `requestFrame` / `isAnimating` /
  `startInDefaultMode`, `display.fitWhenMeasured` / `cancelPendingFit`, `levels.startLevelBlend`,
  `history.push` / `forgetPage`, `links.setLinkZonesShown`, `edits.recordMergeableEdit` / `recordSnapshot` /
  `markSaved`, `file.replaceDocument` / `updateGeometry`, `gesture.startDrag`, `labelEditor.updateEditing`,
  `config.adoptPageIso`. Champs devenus privés : `camera.animation`, `history.stack`, `pageModes.modeCurrents`,
  `edits.editCount` / `lastMerge`, `display.pendingFit`. Chargement : `EngineCore.resetDocumentState` appelle le
  `resetDocument()` de dix domaines, dans une liste ; `DocumentFile.load` tient en cinq lignes. Paramètres :
  `EngineCore.settingsChanged` prévient neuf domaines (`settingsChanged(settings, previous)`, aide
  `settingsSectionChanged`) ; `Config.updateSettings` ne fait plus que fusionner, régler les contrôles et prévenir.
  Seule écriture restante hors du domaine : le curseur et le titre du canvas (`core.canvas`), infrastructure
  partagée. Écart : au chargement, l'état « modifié » est resynchronisé juste avant l'oubli des « courants » des
  modes au lieu de juste après (sans effet visible). `BONNES_PRATIQUES` §3 et §5 décrivent les deux listes et les
  gardes. Vérifié : `make check` ; dans l'appli, rechargement avec restauration (fichier, page, caméra), passage en
  iso, élévation changée dans les paramètres (vue animée), changement de page, vue graphe.
