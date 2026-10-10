# `exportedLabel` / `importedLabel` rangés dans `lifecycle`

> Dette vue à l'audit 500 (reprise de 478) — contrat des modes

- Ces deux transformations du fichier sont dans `ModeLifecycle` (`core/modes/types.ts:118-128`), à côté de `opened`
  et `removed`, qui reçoivent un `ModeEdit` et écrivent une étape. Un groupe `file` les distinguerait (changement de
  contrat : un seul mode à reprendre).
- Ce qu'on veut (repris le 2026-10-10) : groupe `file` du contrat d'un mode (`ModeFile` : `exportedLabel`,
  `importedLabel`), à la place de `lifecycle` ; pannes signalées `file.exportedLabel` / `file.importedLabel`. Event
  storming suivi. Changement de contrat (un seul mode concerné).
- **Fini quand :** l'en-tête du type est toujours écrit à l'enregistrement et retiré à l'ouverture ; `make check` vert.
- Fait : groupe `file` (`ModeFile`, `core/modes/types.ts`) avec `exportedLabel` et `importedLabel`, retirés de
  `ModeLifecycle` ; leur doc mise à jour (HTML reçu, collage, sujet 503). `PageModes.fileLabels` lit `mode.file`,
  pannes signalées `file.exportedLabel` / `file.importedLabel`. Event storming : `file: { exportedLabel,
  importedLabel }`. Tests `pageModes.test.ts` (panne nommée `file.exportedLabel`), `contractDoc.test.ts` (groupe
  `ModeFile` déplié dans la table des garanties) ; doc `AJOUTER_UN_MODE.md` (arbre du contrat, détail, tableau).
  Écart : aucun pour l'utilisateur ; contrat des modes changé (un seul mode concerné). Vérifié dans l'appli sur
  `eventstorming-commande.drawio` : enregistré, « Payer » s'écrit `<b>Command</b><br>Payer` ; rouvert, le texte est
  « Payer », sans avertissement.
