# Cœur : flèche qui arrive sur une partie d'une forme de mode

> API des plugins de mode (`core/modes/types.ts`, `core/plugins/index.ts`) ; prérequis du sujet 269 (relation
> document → champ dynamique). Suite de 249 (parties) et 265 (`edges.connects`).

Une flèche peut viser une partie d'une forme (ex. la ligne d'un champ), et non la forme entière. Le cœur dit au mode
quelle partie est sous le pointeur au bout d'arrivée ; le mode accepte ou refuse, retient la partie dans son propre
attribut et place lui-même le point d'arrivée. Le cœur ne stocke rien et ne recalcule rien.

- **Partie visée** : au tirer d'une flèche et au rebranchement de son bout d'arrivée, la partie visée est
  `parts.at(page, cible, pointeur)` (undefined : la forme elle-même). Seul le bout d'arrivée (`target`) en a une.
  - `edges.connects(page, source, target, part?)` la reçoit : `PageModes.endAccepts` passe d'un prédicat sur la forme
    à un prédicat sur la forme et le point (`connect.ts`, `edgeEnd.ts`, `anchors.ts` suivent) ;
  - la partie acceptée est mise en valeur pendant le tirer, du même cadre que la sélection d'une partie (`parts.bounds`,
    sujet 249).
- **Le mode la reçoit** : `edges.created(edit, edgeId, current, part?)` et `edges.reconnected(edit, edgeId, part?)`.
  `reconnected` ne reçoit `part` que si c'est le bout d'arrivée qui a été rebranché ; sinon le mode garde la partie
  qu'il a retenue.
- **Point d'arrivée** : écrit par le mode avec `edit.setElementStyle` (`entryX`, `entryY`, `entryPerimeter=0`).
  Brique pure, réexportée dans l'API des plugins : `sideConstraintAt(bounds, y, from)` dans `edit/edgeEnds.ts`, point
  relatif (`frameConstraint`) sur le côté gauche ou droit de `bounds` à la hauteur `y`, côté le plus proche de `from`.
  Testée dans `tests/engine/core/edit/edgeEnds.test.ts`.
- **Suivi** : `entryX` / `entryY` étant relatifs à la forme visée, la flèche la suit sans rien faire. Le reste est au
  mode, par les points d'entrée existants : `gestures.placed` (forme de départ ou visée déplacée ou redimensionnée :
  côté le plus proche), ses propres opérations sur les parties (`move`, `remove`, `setText` : ligne déplacée ou
  disparue) et `lifecycle.removed`.
- Les modes existants (`connects` à trois paramètres, `created` / `reconnected` sans partie) ne changent pas.
- **Fini quand :**
  - tests : `endAccepts` passe la partie sous le point à `connects` ; `created` et `reconnected` reçoivent la partie
    (et pas pour un rebranchement du départ) ; `sideConstraintAt` (deux côtés, `y` aux bords) ;
  - à l'œil sur `rdd.drawio` : les relations RDD existantes se tirent et se rebranchent comme avant ;
  - aucun mode ne s'en sert encore : la flèche vers une partie se vérifie à l'œil et dans draw.io
    (`make drawio-check`, `entryX` / `entryY` au centre de la ligne) avec le sujet 269 (dit dans le « Fait : ») ;
  - `make check` vert.
- Fait : `PageModes.endAccepts` renvoie un prédicat `(forme, point)` (`EndAccepts`) ; au bout d'arrivée il passe à
  `edges.connects` la partie `parts.at` sous le point (`Anchors.endAttachmentAt` le pose à la hauteur de chaque forme).
  `ConnectDrag` / `EdgeEndDrag` gardent la partie visée (`ShapeParts.targetedPart`), mise en valeur du cadre de
  `parts.bounds` pendant le tirer (`ConnectorPreview.showConnectionHints`), et transmise à `edges.created` /
  `edges.reconnected` (bout d'arrivée seulement). Au rebranchement d'une arrivée sur une partie, le mode reçoit
  `part` même si l'attache de la forme ne change pas. `sideConstraintAt(bounds, y, from)` (`edit/edgeEnds.ts`,
  réexportée dans l'API des plugins : côté droit à égalité). Tests : `pageModes.test.ts` (partie passée à
  `connects`, `created`, `reconnected`), `edgeEnds.test.ts` (`sideConstraintAt`). À l'œil : l'appli se charge sans
  erreur ; les relations RDD existantes n'utilisent aucun nouveau paramètre ; la flèche vers une partie et
  `make drawio-check` (`entryX` / `entryY`) se vérifieront avec le sujet 269. `make check` vert.
