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
- Fait :
  - Protection dans le registre des formes (`core/shapes/registry.ts`), par où passent tous les appels aux formes, du
    moteur comme de l'appli :
    - chaque fonction d'une définition est appelée sous protection, avec le repli du ticket : `matches` (définition
      ignorée pour la forme), `flat|iso|volume.create` (placeholder au même niveau), `outline`, `contains`,
      `hitBounds`, `textZone` (les bornes), `volumeHeight` (`blockHeight`), `editStyle` (style tel quel), `swatch`
      (aperçu du rectangle), `minimap` (les bornes) ;
    - nouvelle méthode `outline(shape)`, protégée ; la sélection (`picking.ts`) et le repli de la mini-carte
      (`minimapOutline.ts`) passent par elle au lieu d'appeler la définition ;
    - `reportingTo(onError)` : le même registre (mêmes formes), dont les erreurs vont à `onError`. Le moteur
      (`EngineCore`) prend cette vue et la branche sur `PluginGuard` (« Forme <id> : erreur dans <point d'entrée> »,
      une fois par session) ; les registres par défaut, partagés, restent sans destinataire et écrivent à la console.
  - Mini-carte : le dessin propre d'une forme (`minimap`) est entouré de `save` / `restore` du contexte 2D, pour qu'il
    ne change pas le dessin des suivantes ; en panne, les bornes sont dessinées.
  - Appli : rien à changer. Elle reçoit le registre du moteur (`getShapeRegistry`), donc la vue protégée : les aperçus
    du panneau (`swatch`) sont protégés ; les autres usages relevés (`properties`, `templates`, `palette.name`) ne lisent
    que des données.
  - Comportement inchangé quand aucune forme ne lève d'exception.
  - Doc : `AJOUTER_UNE_FORME.md` (section « Une forme en panne », table des replis), SPEC §8.4, commentaire de
    `PluginGuard`.
  - Tests (`tests/engine/core/shapes/registry.test.ts`) :
    - une forme dont `matches` lève une exception est en placeholder et recensée comme non supportée ;
    - une forme dont tous les autres points d'entrée lèvent une exception : placeholder, replis, huit erreurs
      signalées une fois chacune, une seule republication des Diagnostics ;
    - la page se construit et les deux formes se sélectionnent au clic ;
    - sans destinataire, repli et erreur à la console.
    - Le faux contexte 2D de `levels.test.ts` reçoit `save` / `restore`.
  - Validation dans l'appli (navigateur intégré, serveur 5173), avec le losange mis en panne temporairement
    (`flat.create` et `textZone`), puis remis :
    - `shapes.drawio` s'ouvre, les Diagnostics montrent « Forme diamond : erreur dans flat.create (essai de panne) » ;
    - sur `three-rectangles.drawio`, un losange glissé depuis la palette est dessiné en placeholder, se sélectionne
      avec ses poignées ; le double-clic ouvre l'éditeur sur ses bornes, le texte est écrit, et l'erreur de `textZone`
      s'ajoute aux Diagnostics ; les deux modifications annulées.
