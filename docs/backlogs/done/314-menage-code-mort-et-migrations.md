# Ménage : code mort et migrations sans objet

> Itération — moteur et appli, après la série de refactors (sujets 301 à 313)

L'appli n'est pas en production : aucun fichier ni paramètre enregistré ancien n'est à reprendre. On repart de
zéro, seules les fixtures doivent être au format final.

- **Migrations retirées :**
  - paramètres enregistrés de l'appli (`settingsStore.ts`) : plus de numéro de version ni de `migrate` (épaisseur 16,
    touche ⌘, vitesse 12, réglages des modes sortis de `shapes` et d'`exporters`), plus de reprise des anciennes clés
    `drawio-spatial:view-settings` et `drawio-spatial:minimap-visible` ;
  - réglages des modes : plus de `PluginSetting.legacy`, `legacySettings` ni `legacyModeSettings` ;
  - clés des modes (sujet 301) : plus de `legacyKeys` ni de renommage `spatial.<nom>` → `spatial.<espace>.<nom>` à
    l'ouverture, ni d'anciennes clés retirées au collage ;
  - état de vue des pages (`spatial.view`) : plus de `v=` ni de `LEGACY_DEFAULT_DEPTH` (16 relu à 32).
- **Fixtures au format final :** `rdd-anciennes-cles.drawio` et `sequences-anciennes-cles.drawio` supprimées (avec
  leurs sorties draw.io) ; `v=2;` retiré des `spatial.view` ; `depth=16` sans version de `spatial.drawio` passé à 32.
- **Code mort :** symboles jamais utilisés (`textPresetPatch`, `SpatialKey`, `missingName`,
  `CameraController.getSettings`, `Minimap.setSize`) et méthodes de la façade `Engine` que ni l'appli ni le composant
  n'appellent (`toggleSelect`, `selectItems`, `selectInRect`, `getModeHint`, `isFlattened`, `anchoringOf`, `jumpsOf`,
  `nudgeSelection`, `editEdgeText`, `editEdgeEndLabel`) : les contrôles passent déjà par les domaines.
- Docs à jour : SPEC (§ épaisseur), `AJOUTER_UN_MODE.md`.
- **Fini quand :** plus aucune référence aux migrations ci-dessus dans `src/`, `make check` passe, `make drawio-check`
  passe, l'appli s'ouvre sur les fixtures RDD, Séquences et `spatial.drawio` comme avant.
- Fait : migrations retirées (`settingsStore.ts` réduit à lire / écrire, `PluginSetting.legacy` et
  `legacySettings`, `legacyKeys` et `migrateLegacyKeys`, `v=` et `LEGACY_DEFAULT_DEPTH` de `viewState.ts`) ; fixtures
  `*-anciennes-cles.drawio` supprimées, `flows.drawio` sans `v=2`, `spatial.drawio` à `depth=32`, sorties draw.io
  régénérées (`make drawio-check`) ; symboles et méthodes de `Engine` inutilisés retirés ; SPEC et
  `AJOUTER_UN_MODE.md` à jour. Test des fixtures RDD et Séquences de `helpers.test.ts` rendu effectif (il cherchait les
  anciennes clés et ne vérifiait plus rien). Écarts : paramètres enregistrés plus migrés ; un `spatial.view` à
  `depth=16` sans version est lu à 16. Vérifié à l'œil : `rdd.drawio`, `sequences.drawio`, `spatial.drawio`.
