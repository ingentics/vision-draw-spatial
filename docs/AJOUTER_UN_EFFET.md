# Ajouter un effet de page

Un **effet** est un décor qu'une page active en plus de son mode (ex. la forêt : des arbres autour du schéma, en iso /
3D). Contrairement au mode, les effets se cumulent ; le mode de la page reste maître et peut en refuser. Patron commun
des plugins (dossier, collecte, API, lecture seule, appel protégé, réglages, tests) :
[AJOUTER_UN_PLUGIN.md](AJOUTER_UN_PLUGIN.md). Ce guide ne donne que ce qui est propre aux effets.

Exemple complet : la forêt ([plugins/effects/forest/](../src/engine/plugins/effects/forest/index.ts)), son test
[tests/engine/plugins/effects/forest.test.ts](../tests/engine/plugins/effects/forest.test.ts).

## 1. Le dossier

```
src/engine/plugins/effects/<id>/
├── index.ts     export const definition: PageEffectDefinition = { … }
└── …            le décor (ex. forest/trees.ts : le maillage des arbres)
```

Déposer le dossier suffit : il est collecté, ses réglages apparaissent dans Paramètres › Effets, sa case dans la
section « Effets » du panneau de la page. Il n'importe que l'API des plugins
([core/plugins/index.ts](../src/engine/core/plugins/index.ts)), `three` et son dossier.

## 2. Le contrat

Le contrat fait foi : [core/effects/types.ts](../src/engine/core/effects/types.ts) (`PageEffectDefinition`, avec la
JSDoc de chaque champ). Seuls `id` et `name` sont obligatoires.

| Champ | Rôle | Défaut (absent) | Forêt |
|---|---|---|---|
| `id` | nom du dossier, écrit dans `spatial.effects` (`^[a-z][a-z0-9-]*$`, vérifié à l'enregistrement) | obligatoire | `forest` |
| `name` | nom de la case dans le panneau de la page, de la sous-page des paramètres, de l'étape d'annulation | obligatoire | « Forêt » |
| `description` | aide au survol de sa case, et sous ses réglages | aucune | — |
| `settings` | réglages globaux (`PluginSetting`), Paramètres › Effets | aucun | taille, espacement, densité, étendue, écart au schéma |
| `viewModes` | modes d'affichage où l'effet existe (`top`, `iso`, `3d`) | tous | `iso`, `3d` |
| `volume(page, room, values, light)` | décor de la scène en volume (ci-dessous) | pas de décor | les arbres |

### Le décor : `volume`

`volume(page, room, values, light)` renvoie un `Object3D` (ou `undefined` : rien à poser), ajouté à la racine de la
scène de la page :

- **Espace page** : x, y comme draw.io (pixels de page), z = hauteur au-dessus du sol. Le décor pousse avec les volumes
  à la bascule iso et suit le fondu de la page ; il n'est jamais dessiné en 2D.
- `page` : la page (`PageModel`, en lecture seule).
- `room` (`EffectRoom`) : la place prise par le schéma, pour l'éviter. `room.bounds` est l'emprise des formes, tracés
  et textes affichés (`undefined` pour une page vide) ; `room.distance(point)` la distance d'un point au plus proche
  d'entre eux, en pixels de page (0 dedans).
- `values` : les valeurs de ses réglages, bornées et complétées par le défaut (lecture : `numberValue`,
  `booleanValue`, `stringValue`).
- `light` (`EffectLight`) : `light.shade(normal)` donne la luminosité d'une facette de normale sortante `normal` (espace
  page, z vers le haut, longueur 1), d'après les réglages d'ombrage des volumes : le décor est ombré comme les formes.

Le moteur nomme l'objet `effect:<id>` et pose `userData.effectId` lui-même. Le décor n'est pas un élément du schéma :
ni sélectionnable, ni dans la mini-carte, ni dans le fichier.

### Quand il est appelé

- À **chaque construction de la scène en volume** de la page (ouverture, chaque modification de la page, changement
  d'un réglage). Il doit être une **fonction pure** de ce qu'il reçoit : même page, mêmes réglages, même décor (la
  forêt tire ses arbres d'une graine par case de grille, jamais de `Math.random`).
- Seulement au niveau `iso` : en vue de dessus, ou avec « Formes en volume » désactivé, pas de décor.
- Une page dont un effet actif a un `volume` passe en volume en iso / 3D, même sans forme en volume.
- Mêmes contraintes sur l'objet renvoyé qu'une forme ([AJOUTER_UNE_FORME.md](AJOUTER_UNE_FORME.md) section 5) :
  matériaux propres à l'objet (libérés avec la scène), pas de cache entre deux appels. Préférez un seul maillage pour
  beaucoup de pièces (la forêt : un maillage, couleurs par sommet).

## 3. En panne

`volume` est appelé par l'hôte des effets (`core/domains/effects/pageEffects.ts`) avec l'appel protégé commun. S'il
lève une exception (y compris en écrivant dans la page reçue, gelée en dev et en test), **le décor est omis** : la page
s'affiche sans lui, les autres effets sont posés, et l'erreur est signalée une fois dans les Diagnostics
(« Effet <id> : erreur dans volume »).

## 4. Réglages

Les réglages globaux sont des `PluginSetting` (schéma commun : [AJOUTER_UN_PLUGIN.md](AJOUTER_UN_PLUGIN.md) section
7), enregistrés dans `settings.effects[id][clé]` et passés à `volume` dans `values`. Une valeur changée reconstruit les
scènes. Un effet n'a pas de réglage par page : tout ce qui est propre à une page est dans son schéma.

## 5. Activation : `spatial.effects` et refus par le mode

- Une page active ses effets par l'attribut `spatial.effects` de son `<diagram>` : les `id` séparés par des virgules
  (`spatial.effects="forest"`), conservé par draw.io. L'effet lui-même n'écrit jamais dans le fichier : c'est le moteur
  qui écrit l'attribut quand on coche ou décoche sa case dans la section « Effets » du panneau de la page (une étape
  d'annulation « Effet <name> » ou « Sans effet <name> », page modifiable seulement).
- **Le mode est maître** : un effet est actif seulement si le mode de la page le permet (`page.allowsEffect(effectId)`
  du mode, absent = tous ; en panne = permis) et si l'un de ses `viewModes` est permis sur la page (ex. Séquences, 2D
  seulement : la forêt y est inactive). Un effet refusé reste écrit dans le fichier, sans décor, et n'est pas proposé
  dans le panneau.
- Un `id` sans effet (écrit par une version plus récente) est conservé, signalé dans les Diagnostics (« Effet de page
  inconnu : <id> ») et sous la section « Effets » du panneau.

## 6. Frontières

Un effet ne fait **que** son décor en volume : il ne reçoit ni le moteur, ni la caméra, ni la sélection, ni le DOM ;
il n'écrit ni le fichier, ni la page, ni les paramètres ; il ne connaît ni les modes ni les autres effets. Il ne voit
du schéma que la page et la place prise (`room`). Un comportement qui demande davantage (interaction, rendu en 2D,
données par page) est un nouveau point d'entrée du contrat (`core/effects/types.ts`, son hôte, et une ligne au
tableau de la section 2) ou un mode.

## 7. Tests

Modèle : [tests/engine/plugins/effects/forest.test.ts](../tests/engine/plugins/effects/forest.test.ts), dans
`tests/engine/plugins/effects/`.

- **Décor posé** : construire la scène iso d'une page (`buildPageScene(page, createDefaultRegistry(), ctx, 'iso')`),
  puis `createDefaultEffectRegistry().decorate(page, root)` ; l'objet est `root.getObjectByName('effect:<id>')`.
- **Évitement** : aucun sommet du décor dans une forme ou sur un tracé de la page.
- **Déterminisme** : deux constructions de la même page donnent le même décor ; un schéma changé change le décor
  autour de lui.
- **Réglages** : `registry.values(id, stored)` borne et complète ; un réglage changé change le décor.
- **Ombrage** : `decorate(page, root, { shading })` avec d'autres réglages d'ombrage change les couleurs.
- Le contrat commun (id = dossier, enregistrement, id refusé, décor en panne omis) est déjà vérifié pour tous les
  effets par `tests/engine/plugins/index.test.ts` et `tests/engine/core/effects/registry.test.ts`.

Ensuite, vérifiez dans l'appli : cocher l'effet sur une page, iso et 3D (rotation complète), bascule depuis la 2D,
réglages dans Paramètres › Effets, et une page d'un mode qui le refuse.
