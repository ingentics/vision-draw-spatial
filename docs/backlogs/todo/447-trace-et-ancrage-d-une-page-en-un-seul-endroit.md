# Tracé et ancrage d'une page en un seul endroit

> Audit 444 — moteur, agencement des flèches (reprises de 441, 442 et 443)

- Constats :
  - Le style d'un tracé est décrit à deux endroits qui divergent déjà. D'un côté `EDGE_LINE_KEYS`, en chaînes
    (`edit/drag/connect.ts:20`, repris par `commands/elements.ts:49`). De l'autre `Router.edgeStyle`, en objets
    (`auto/routeAround.ts:228`, `pcb/octilinear.ts:387`), où `noEdgeStyle` n'apparaît que d'un côté et où
    « droite » retire `rounded` au lieu de l'écrire à `0`.
  - `connect.ts:147` refait le repli de `edgeLineOf`.
  - `PageModes.setPageMode` (`pageModes.ts:70-77`) écrit `spatial.anchoring` et `spatial.edgeLine`, puis relance
    la répartition. C'est une recopie de `EdgeArrangement.setPageAnchoring` (`arrangement.ts:207-216`), avec deux
    gardes qui ne concordent pas.
  - L'appli recalcule l'ancrage de la page (`viewer/ViewerContextPanel.tsx:31-32`).
- Ce qu'on veut :
  - Une seule table `EdgeLine → clés de style` dans `edit/anchoring/mode.ts`. La création d'une flèche et chaque
    routeur en dérivent leur style.
  - `EdgeArrangement` seul écrit l'ancrage et le tracé d'une page. Il expose une méthode sans étape d'historique,
    appelée par `setPageMode` dans l'étape du changement de mode, et réutilisée par `setPageAnchoring` et
    `setPageEdgeLine`.
  - `edgeLineOf` sert aussi à la création au tirage.
  - `Engine` expose l'ancrage effectif d'une page, lu par l'appli.
- Écart de comportement : aucun visible. Les clés écrites par les routeurs restent celles d'aujourd'hui ; si un
  écart est inévitable, il est écrit ici avant d'être fait.
- Tests : `edgeLine.test.ts`, `pageModes.test.ts` (réglages posés par le mode), `anchorArrangement.test.ts` et
  `octilinear.test.ts` inchangés.
- **Fini quand :**
  - Une flèche créée en manuel, en automatique et en Typon a le même style qu'avant.
  - Passer une page en Machine à états pose l'ancrage et le tracé dans une seule étape d'annulation.
  - Le panneau de page affiche l'ancrage comme avant.
