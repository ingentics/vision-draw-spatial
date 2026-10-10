# Appli : migration des anciennes clés PlantUML sans nom de mode

> Itération — appli, paramètres enregistrés ; dette vue à l'audit 444 (reprise de 439)

- Constat : `withLegacyExporters` (`src/app/settingsStore.ts`) lit `stored.modes?.sequences` : c'est le seul nom de
  mode écrit en dur dans l'appli hors du dossier du mode.
- Ce qu'on veut : la reprise des anciennes clés `plantumlRenderer` / `plantumlUrl` cherche dans les réglages
  enregistrés de chaque mode, sans le nommer. Ces clés sont retirées du mode qui les porte, et le mode lui-même est
  retiré s'il ne lui reste rien. Une valeur déjà enregistrée dans Exporteurs › PlantUML l'emporte toujours.
- Écart de comportement : aucun pour les réglages existants (seul Séquences a porté ces clés).
- Tests : `tests/app/settingsStore.test.ts` inchangé ; un cas de plus, avec les clés sous un autre mode.
- **Fini quand :** testé ; plus aucun `sequences` en dur dans `src/app/` hors de `plugins/modes/sequences/`.
- Fait : `withLegacyExporters` (`src/app/settingsStore.ts`) parcourt les réglages enregistrés de tous les modes,
  reprend les premières valeurs `plantumlRenderer` / `plantumlUrl` trouvées et retire ces clés (le mode aussi s'il
  est vide). Plus de `sequences` en dur dans `src/app/` hors du dossier du mode. Tests : `settingsStore.test.ts`
  (cas existants inchangés, plus un cas sous un autre mode). `make check` vert. Vérifié par les tests seulement
  (lecture du stockage du navigateur au démarrage).
