# Formes : appels protégés, comme ceux des modes

> Architecture du moteur — étanchéité des plugins ; suite de 288 (`PluginGuard`). Audit du 2026-10-07.

- Aujourd'hui, aucun appel à une forme ne passe par `PluginGuard` : `create` (`core/render/pageScene.ts:199`),
  `matches` (`core/shapes/registry.ts:47`, appelé à chaque `resolve`, y compris au chargement par
  `collectUnsupported`, `core/domains/document/file.ts:80`), `textZone`, `volumeHeight`, `contains`, `outline`,
  `hitBounds`, `editStyle`, `swatch`, `details`, `toMinimap`. Une forme qui lève une exception empêche d'ouvrir le
  fichier, contre la règle « jamais d'échec de chargement » (SPEC §8.4).
- Le registre des formes passe derrière une façade protégée (même `PluginGuard`, libellé `Forme <id>`) :
  - `matches` en panne : la définition est ignorée pour cette forme (on continue la résolution) ;
  - `create` en panne : le placeholder gris pointillé est dessiné à la place ;
  - `outline`, `contains`, `hitBounds`, `textZone`, `volumeHeight` en panne : repli sur le rectangle des bornes et
    l'épaisseur par défaut ;
  - `editStyle` en panne : style inchangé ; `swatch` en panne : pas d'aperçu.
  - L'erreur est signalée une fois par forme et par point d'entrée dans les Diagnostics (« Forme <id> : erreur dans
    create »).
- Mini-carte : le dessin d'une forme est entouré de `save` / `restore` du contexte 2D partagé
  (`core/interaction/minimapLayout.ts:198`), pour qu'une forme ne change pas le dessin des suivantes.
- Appli : les appels aux formes faits pendant le rendu React (`app/ContextPanel.tsx:484,1141`, `app/Viewer.tsx:616`)
  passent par la façade protégée du moteur.
- Attention : `core/domains/modes/pluginGuard.ts` est en cours de modification par les sujets 297 à 299.
- **Fini quand :**
  - tests : une forme de test dont `matches`, `create`, `outline` et `textZone` lèvent une exception ; le document
    s'ouvre, la forme est dessinée en placeholder, la sélection et l'édition du texte fonctionnent, quatre erreurs
    sont signalées une fois chacune ;
  - dans l'appli, avec une forme de test en panne branchée temporairement, la fixture s'ouvre et les Diagnostics la
    signalent (vérifié puis retiré) ;
  - `make check` vert.
