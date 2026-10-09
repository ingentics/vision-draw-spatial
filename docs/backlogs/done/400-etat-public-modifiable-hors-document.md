# État des domaines exposé en lecture seule

> Architecture du moteur — frontières des domaines (`coding.md` §3), suite du sujet 385 ; dette vue au sujet 385

- Champs publics modifiables d'un domaine lus par d'autres : passés en privé, exposés par un accesseur du même nom
  (aucune écriture croisée aujourd'hui : prévention) — `camera.state`, `selection.current`, `display.viewport`,
  `config.settings`, `gesture.drag`, `labelEditor.editing`, `links.linkZonesShown` / `linkUsage`,
  `metrics.sampling`, `levels.levelBlend` / `heightScale`, `viewModes.flattened`, `EngineCore.disposed`.
- `targets.editable` : privé, lu par `isEditable()` qui existait déjà (pas de second accesseur).
- `edits.undoStack` reste `readonly` (la pile est l'état propre de `EditHistory`, lue par ses seules méthodes).
- Aucun changement de comportement.
- **Fini quand :** plus aucun champ public modifiable dans `src/engine/core/domains/` (hors types de données) ;
  édition, sélection, caméra, bascule iso inchangées dans l'appli ; `make check` vert.
- Fait : champ privé + accesseur de lecture du même nom dans `view/camera.ts`, `selection/selection.ts`,
  `runtime/display.ts`, `runtime/config.ts`, `edit/drag/gesture.ts`, `edit/text/labelEditor.ts`,
  `navigation/links.ts`, `runtime/metrics.ts`, `view/levels.ts`, `view/viewModes.ts` et `EngineCore.ts` (sous
  `src/engine/core/domains/`) ; les lecteurs ne changent pas. `targets.editable` privé, lu par `isEditable()`
  (`pages.ts`, `undo.ts`, `arrangement.ts`) ; le faux `targets` de `tests/.../document/file.test.ts` suit. Aucun
  changement de comportement : vérifié à l'œil (sélection, glisser, annuler, bascule 2D / iso) et par les tests.
