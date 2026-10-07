# Modes : frontières d'import vérifiées par la lint

> Itération — architecture des modes de page (`src/engine/modes/`) ; reprise de 69

- Aujourd'hui le découplage moteur ↔ modes tient par discipline : rien n'empêche un mode d'importer le cœur, ni le
  moteur d'importer un mode précis. On le fait vérifier par ESLint (`no-restricted-imports` dans `.eslintrc.cjs`).
- **Un mode n'importe pas le cœur** : pour `src/engine/modes/*/**`, interdits `**/Engine`, `**/core/**`,
  `**/format/**`, `**/interaction/**`, `**/persistence/**`, `**/graph/**`, `**/effects/**`. Restent permis : `model/`,
  `spatial`, `modes/types`, `shapes/types`, `render/`, `edit/`, `settings`.
- **Les modes s'ignorent** : un mode n'importe pas le dossier d'un autre mode (`modes/<autre>/`).
- **Le moteur n'importe aucun mode précis** : hors de `src/engine/modes/`, interdit `**/modes/*/**` (le registre
  `modes/registry`, `modes/types` et `modes/modeShapes` restent permis). Exception explicite et commentée pour
  `src/engine/index.ts` tant que 282 n'est pas fait.
- **Côté appli** : `src/app/modes/<id>/` n'importe pas `src/app/modes/<autre>/`.
- Messages d'erreur en français, renvoyant à `modes/types.ts` (contrat d'un mode).
- **Fini quand :** les règles sont dans `.eslintrc.cjs` ; un import de test interdit (ex. `core/` depuis
  `modes/rdd/`, `modes/rdd/` depuis `core/`) fait échouer `make lint` puis est retiré ; `make check` vert sans
  changement du code existant.
- Fait : `.eslintrc.cjs` — listes des modes lues dans `src/engine/modes/` et `src/app/modes/` (un nouveau mode est
  couvert sans toucher la config) ; un mode n'importe ni `Engine`, `core/`, `format/`, `interaction/`,
  `persistence/`, `graph/`, `effects/`, ni un autre mode ; le reste du moteur (dont `format/` et `model/`) n'importe
  aucun `modes/<id>` (registre, `modes/types` et `modeShapes` permis) ; exception provisoire pour
  `src/engine/index.ts` ; côté appli, `app/modes/<id>/` n'importe pas un autre mode. Validé par des imports de test
  interdits (cœur depuis `modes/rdd/`, `modes/rdd` depuis `core/`, React dans `modes/`, un mode appli vers un autre),
  tous refusés puis retirés ; aucun changement de code.
