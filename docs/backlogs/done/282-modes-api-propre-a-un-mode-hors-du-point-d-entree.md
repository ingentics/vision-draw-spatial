# Modes : API propre à un mode hors du point d'entrée du moteur

> Itération — architecture des modes de page (moteur et appli) ; reprise de 69 ; après 281

- `src/engine/index.ts` (l. 104-107) exporte des éléments propres au mode Séquences (`SEQUENCE_EXPORTERS`,
  `addFlow`, `removeFlow`, `renameFlow`, `sequenceState`, types `Flow` et `SequenceExporter`), utilisés seulement par
  `src/app/modes/sequences/`. Chaque mode qui a des opérations pour son panneau grossirait l'API publique du moteur et
  obligerait à toucher `index.ts`.
- **Point d'entrée par mode** : chaque mode qui en a besoin expose ses opérations et types dans
  `src/engine/modes/<id>/api.ts` (rien d'autre n'y est exporté que ce qu'utilise son panneau).
- **Seul son panneau l'importe** : `src/app/modes/<id>/` peut importer `engine/modes/<id>/api` (et seulement
  celui de son mode) ; le reste de l'appli et `src/react/` gardent le seul point d'entrée `engine`. Règle ESLint
  ajustée en conséquence (exception ciblée à la règle du ticket 207).
- Les exports de Séquences sont retirés de `src/engine/index.ts` ; l'exception de 281 pour `index.ts` est retirée.
- `src/index.ts` (API de la bibliothèque) n'expose toujours rien de propre à un mode.
- Aucun changement de comportement.
- **Fini quand :** `src/engine/index.ts` ne mentionne plus aucun mode précis ; le panneau Séquences passe par
  `engine/modes/sequences/api` ; à l'œil dans l'appli, sur une page Séquences : ajouter, renommer, supprimer un flux et
  ouvrir un export PlantUML marchent comme avant ; `make check` vert.
- Fait : `src/engine/modes/sequences/api.ts` (exporteurs, flux, `sequenceState`) ; exports retirés de
  `src/engine/index.ts` ; `src/app/modes/sequences/` (`index.tsx`, `ExportViewer.tsx`) l'importe ; `.eslintrc.cjs` :
  `app/modes/<id>/` peut importer `engine/modes/<id>/api` et seulement lui (ailleurs dans l'appli ou vers un autre
  fichier du mode : refusé, vérifié par des imports de test), exception de 281 pour `index.ts` retirée. Vérifié dans
  l'appli sur `fixtures/flows.drawio` : panneau Flux et export PlantUML comme avant (ajout / renommage / suppression
  d'un flux non essayés à la main, pour ne pas modifier la fixture).
