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
