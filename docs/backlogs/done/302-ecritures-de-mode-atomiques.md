# Modes : écritures atomiques jusque dans l'arbre

> Architecture du moteur — étanchéité des plugins ; suite de 288. Audit du 2026-10-07.

- `applyModeEdit` rassemble les écritures puis les applique (sujet 288) : une opération qui lève une exception
  n'écrit rien. Mais si une écriture échoue pendant qu'on les applique (`setCellStyleValue` lève « Cellule
  introuvable », `core/format/cellEdits.ts:100`), les écritures précédentes restent dans l'arbre, sans étape
  d'annulation ni relecture du modèle (`core/modes/modeEdits.ts:177`, `pageModes.ts:162`, `followUp`,
  `documentOpened`) : l'arbre et le modèle divergent.
- Correction : en cas d'échec, l'arbre de la page est remis à l'état d'avant (instantané déjà calculé dans
  `editPageMode` ; à prendre aussi dans `followUp` et `documentOpened`). Pour une remise en ordre (`followUp`),
  le geste du tronc déjà écrit est gardé, seule la partie du mode est annulée.
- `followUp` passe par `editablePageById` au lieu de `pageById` / `pageTreeOf` (`pageModes.ts:282`).
- **Fini quand :** test : une opération dont la deuxième écriture vise une cellule disparue ; l'arbre est identique
  à avant, aucune étape d'annulation n'est ajoutée, l'erreur est signalée ; même test pour `gestures.placed` après
  un déplacement (le déplacement reste, la remise en ordre non) ; `make check` vert.
- Fait :
  - `snapshotPage(page)` (`core/format/xmlTree.ts`) : instantané d'une page (contenu de `<mxGraphModel>`, attributs de
    `<mxGraphModel>` et `<diagram>`, page modifiée ou non) ; la fonction rendue la restaure en place (mêmes nœuds,
    cellules réindexées), page compressée comprise.
  - `applyModeEdit` prend l'instantané juste avant d'appliquer les écritures (seulement s'il y en a) et le restaure si
    l'une d'elles lève une exception, puis relance l'erreur. Comme tout passe par lui, cela vaut pour les opérations
    (`editPageMode`), les remises en ordre (`followUp`) et l'ouverture (`documentOpened`) ; pour une remise en ordre,
    le geste du tronc, écrit avant l'instantané, reste. L'hôte des modes traite déjà l'erreur comme une opération en
    panne : pas d'étape d'annulation, pas de relecture, erreur signalée.
  - `followUp` passe par `editablePageById` (page modifiable seulement) au lieu de `pageById` / `pageTreeOf`.
  - Comportement inchangé quand les écritures réussissent.
  - Doc : `AJOUTER_UN_MODE.md` (règles communes des garanties).
  - Tests :
    - `tests/engine/core/modes/modeEdits.test.ts` : écriture vers une cellule disparue, page remise en l'état ;
      remise en ordre après un déplacement, le déplacement reste et le reste est défait ;
    - `tests/engine/core/domains/modes/pageModes.test.ts` : par `editPageMode`, arbre inchangé, aucune étape
      d'annulation, document non relu, erreur signalée ;
    - `tests/engine/core/format/xmlTree.test.ts` (nouveau) : instantané restauré sur une page en clair et une page
      compressée ;
    - les trois premiers échouaient avant la correction.
  - Rien de visible dans l'appli (cas d'erreur) : vérifié par les tests seulement.
