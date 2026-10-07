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
