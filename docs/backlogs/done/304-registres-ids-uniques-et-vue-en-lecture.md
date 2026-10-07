# Registres : ids uniques et vue en lecture seule pour l'appli

> Architecture du moteur — étanchéité des plugins ; suite de 290. Audit du 2026-10-07.

- Ids :
  - les trois registres remplacent aujourd'hui en silence une définition de même id (`modes/registry.ts:33`,
    `effects/registry.ts:31`, `shapes/registry.ts:30`) : `register` lève une erreur si l'id est déjà pris ;
  - une forme de mode doit avoir un id préfixé par celui du mode (`<mode>-…`), vérifié par la racine de
    composition ;
  - une forme de mode ne déclare ni `kinds` ni `matches` : elle ne capte pas les noms draw.io des autres formes
    (aujourd'hui `matches` passe devant les noms, `shapes/registry.ts:47`, et les formes de mode sont enregistrées
    en dernier, donc prioritaires).
- Appli :
  - `Engine.getModeRegistry`, `getEffectRegistry`, `getShapeRegistry` (`engine/Engine.ts:459`) rendent une vue en
    lecture seule : liste, nom, icône, description, réglages déclarés ; ni `register` ni les fonctions des plugins ;
  - les doublons non protégés du registre des modes (`dressing`, `allowsEffect`, `warnings`,
    `modes/registry.ts:62,101,165`) ne sont plus appelables hors de l'hôte des modes ;
  - les registres par défaut ne sont plus des singletons partagés par tous les `Engine` (`plugins/index.ts:72`) :
    chaque moteur construit les siens.
- **Fini quand :** tests : un id en double lève une erreur (forme, mode, effet), une forme de mode mal préfixée ou
  avec `matches` est refusée ; l'appli compile sans accès à `register` ; l'appli fonctionne comme avant (palette,
  choix du mode, Paramètres › Modes et Effets) ; `make check` vert.
- Fait :
  - Ids : les trois registres lèvent une exception pour un id déjà pris (« Forme rectangle : id déjà pris »…) ; une
    forme ne surcharge plus une autre. `PageModeRegistry.register(mode, formes)` refuse une forme du mode dont l'id
    n'est pas préfixé par `<mode>-` ou qui déclare `kinds` ou `matches` (vérifié là, où le mode et ses formes sont
    reçus ensemble, plutôt que dans la racine de composition).
  - Vues en lecture seule (`view()` de chaque registre) : `ModeRegistryView` (`list`, `get`, `modeId`, `modeOf`,
    `allowsViewMode`, `values` ; un mode y est un `ModeInfo` gelé : id, nom, nom court, description, icône, réglages,
    mise en valeur imposée), `EffectRegistryView` (`list`, `get`, `values` ; `EffectInfo`), `ShapeRegistryView`
    (`properties`, `swatch`, `templates`, `templateOf`). `engine.getModeRegistry`, `getEffectRegistry`,
    `getShapeRegistry` les rendent ; l'appli (`PluginsContext`) n'a plus accès ni à `register` ni aux points d'entrée.
    Le titre de la section d'une forme vient de `templateOf(shape).name` (au lieu de `resolve(shape).definition`), et
    la mention « contour imposé » des Paramètres de `ModeInfo.selectionStyle`.
  - `dressing`, `allowsEffect` et `warnings` retirés du registre des modes : l'hôte (`PageModes`) appelle lui-même
    `mode.dressing` et `mode.lifecycle.check` sous protection, et signale le mode inconnu.
  - Registres par moteur : sans registres donnés, chaque `Engine` construit les siens (`createDefault…`). Plus de
    `defaultShapeRegistry`, `defaultModeRegistry`, `defaultEffectRegistry` ; `SHAPE_TEMPLATES` et `usedTemplates`
    viennent d'un registre propre à la racine, jamais donné à un moteur ; la migration des anciens réglages des modes
    passe par `legacyModeSettings` (appli, `settingsStore.ts`).
  - Comportement inchangé.
  - Doc : `AJOUTER_UNE_FORME.md`, `AJOUTER_UN_MODE.md`.
  - Tests :
    - registre des modes : id pris, forme non préfixée, forme avec `kinds` ou `matches` refusés ; id pris refusé pour
      une forme et un effet ; la vue donne la déclaration gelée, sans `register` ;
    - `tests/engine/modeHost.ts` (nouveau) : l'hôte des modes sur un cœur réduit, pour les tests d'habillage,
      d'avertissements et d'effets permis, qui passaient par le registre ;
    - les tests qui prenaient les registres partagés en construisent un ; le test des frontières de l'appli suit
      `legacyModeSettings`.
  - Validation dans l'appli (navigateur intégré, serveur 5173) : page RDD (palette RDD, choix du mode avec ses trois
    valeurs), Paramètres › Modes (RDD, Séquences), Effets › Forêt, Sélection (« contour imposé » des pages RDD).
