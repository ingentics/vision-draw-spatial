# Moteur : le tronc commun rangé dans `core/`

> Architecture du moteur — étanchéité des plugins (audit du 2026-10-07). Premier des sujets 285 à 287 ; sans
> changement de comportement.

- Cible : `src/engine/` ne garde à sa racine que les fichiers d'exposition (`index.ts`, `Engine.ts`, `events.ts`, et
  `plugins.ts` au sujet 286) ; tout le reste du moteur passe dans `src/engine/core/`.
- L'actuel `src/engine/core/` (EngineCore, `types.ts` et les domaines `document/`, `edit/`, `input/`, `modes/`,
  `navigation/`, `runtime/`, `selection/`, `view/`) devient `src/engine/core/domains/`, pour éviter `core/core`
  (vocabulaire déjà employé : « un dossier de `core/` par domaine »).
- Passent dans `core/` : `diagnostics/`, `edit/`, `format/`, `graph/`, `interaction/`, `model/`, `persistence/`,
  `render/`, `settings/`, `spatial.ts`. `modes/`, `effects/` et `shapes/` ne bougent pas ici (sujet 286).
- Uniquement des `git mv` et des imports : aucun fichier renommé, aucun code modifié.
- Miroir des tests : `tests/engine/<dossier>` → `tests/engine/core/<dossier>`, et `tests/engine/core/*` →
  `tests/engine/core/domains/*` (règle « chemin miroir de `src/` », `coding.md` §7) ; tests inchangés sauf leurs
  imports.
- Mis à jour : `.eslintrc.cjs` (chemins `format/`, `model/`, `core/`), `.claude/rules/coding.md` (tableau §2, exemples
  de chemins), `docs/SUMMARY.md` §3 et §5, SPEC §4, `AJOUTER_UNE_FORME.md`, `AJOUTER_UN_MODE.md`, `COMPOSANT.md`,
  plugin de restauration de session de `vite.config.ts` s'il cite un chemin du moteur.
- `src/engine/index.ts` garde les mêmes exports : l'appli, le composant et `src/index.ts` ne changent pas.
- **Fini quand :** l'arborescence est celle décrite ; `make check` vert ; l'appli sur le serveur partagé ouvre une
  fixture, change de page et de vue, édite une forme (relancer `make dev` si Vite garde d'anciens chemins) ;
  `make lib` produit la bibliothèque.
- Fait :
  - `src/engine/core/` → `src/engine/core/domains/`. `diagnostics/`, `edit/`, `format/`, `graph/`, `interaction/`,
    `model/`, `persistence/`, `render/`, `settings/` et `spatial.ts` → `src/engine/core/`. À la racine restent
    `index.ts`, `Engine.ts`, `events.ts`, et pour l'instant `shapes/`, `modes/`, `effects/` (sujet 286).
  - Tests en miroir : `tests/engine/core/domains/`, `tests/engine/core/<dossier>/`, `tests/engine/core/spatial/`,
    `tests/engine/core/settings.test.ts`.
  - Imports réécrits par script, d'après l'ancien emplacement de chaque fichier : `from`, `vi.mock`,
    `import.meta.glob`, `new URL(…, import.meta.url)`. 190 fichiers réécrits, 260 déplacés, aucun code changé à part
    les chemins et le reformatage Prettier de 9 fichiers.
  - Commentaires qui citaient un domaine (`core/selection/…`) corrigés en `core/domains/…`.
  - `.eslintrc.cjs` : chemins de `format/`, `model/`, `render/` et `interaction/` passés sous `core/`. Un mode reste
    interdit d'importer `core/domains/`, `core/format/`, `core/interaction/`, `core/persistence/` et `core/graph/`, et
    garde le droit d'importer `core/model/` et `core/render/` (vérifié par un import d'essai). Three.js reste interdit à
    `core/model/` et `core/format/`.
  - `Makefile` (`drawio-check`) : chemins des tests mis à jour.
  - Doc mise à jour : `SUMMARY.md` §3 et §5, SPEC §4.2, `AJOUTER_UNE_FORME.md`, `AJOUTER_UN_MODE.md`,
    `.claude/rules/coding.md`. Deux chemins déjà périmés du SUMMARY corrigés au passage :
    `render/shapes/rhombus.ts` → `shapes/impl/geometry/diamond/`, `render/iso/buildings.ts` →
    `shapes/generic/building/`.
  - Validation :
    - `make check` vert, mêmes chiffres qu'avant (102 fichiers, 2022 tests) ;
    - `make lib` construit la bibliothèque ;
    - dans l'appli (serveur partagé, rechargé), aucune requête en erreur et les modules servis depuis `core/`. La page
      RDD s'affiche et la sélection d'une table fonctionne ; la fixture des formes passe en iso avec ses volumes.
