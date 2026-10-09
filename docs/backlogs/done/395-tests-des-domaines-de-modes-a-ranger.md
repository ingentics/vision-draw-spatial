# Tests de ModePanel et ModeFollowUps au chemin miroir

> Itération — tests du domaine des modes ; dette vue au sujet 379

- Les tests propres à `ModePanel` (réglages déclarés évalués pour le panneau, sujet 294) et à `ModeFollowUps`
  (`created` / `reconnected` reçoivent la partie visée, sujet 333) sont dans
  `tests/engine/core/domains/modes/pageModes.test.ts` : les ranger dans `modePanel.test.ts` et
  `modeFollowUps.test.ts` (chemin miroir, `coding.md` §7). Le cœur réduit (`setup`), le mode en panne `BOOM` et le mode
  espion des parties passent dans un module commun des tests du dossier.
- Les tests eux-mêmes ne changent pas (déplacés tels quels, imports exceptés).
- **Fini quand :** chaque fichier de test ne vérifie que son domaine ; même nombre de tests ; `make check` vert.
- Fait : `tests/engine/core/domains/modes/modePanel.test.ts` (réglages évalués pour le panneau) et
  `modeFollowUps.test.ts` (`created` / `reconnected`) ; cœur réduit `setup`, `fail`, `BOOM` et `spy` dans `modesCore.ts`
  du même dossier ; tests déplacés tels quels (10 tests, comme avant). Le test multi-domaines (`check`… en panne, qui
  passe aussi par `shapesPlaced`) reste dans `pageModes.test.ts`. Vérifié par les tests seulement.
