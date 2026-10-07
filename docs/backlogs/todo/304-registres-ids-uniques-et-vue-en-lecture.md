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
