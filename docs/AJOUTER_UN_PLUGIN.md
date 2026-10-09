# Ajouter un plugin : le patron commun

Le moteur s'étend par trois familles de plugins : les **formes**, les **modes de page** et les **effets de page**.
Elles suivent le même patron, décrit ici une fois ; chaque guide de famille ne garde que ce qui lui est propre :

| Famille | Dossier | Contrat | Guide |
|---|---|---|---|
| Forme | `src/engine/plugins/shapes/<catégorie>/<id>/` (forme d'un mode : `plugins/modes/<mode>/shapes/<forme>/`) | `ShapeDefinition` ([core/shapes/types.ts](../src/engine/core/shapes/types.ts)) | [AJOUTER_UNE_FORME.md](AJOUTER_UNE_FORME.md) |
| Mode | `src/engine/plugins/modes/<id>/` (partie appli facultative : `src/app/plugins/modes/<id>/`) | `PageModeDefinition` ([core/modes/types.ts](../src/engine/core/modes/types.ts)) | [AJOUTER_UN_MODE.md](AJOUTER_UN_MODE.md) |
| Effet | `src/engine/plugins/effects/<id>/` | `PageEffectDefinition` ([core/effects/types.ts](../src/engine/core/effects/types.ts)) | [AJOUTER_UN_EFFET.md](AJOUTER_UN_EFFET.md) |

**En bref :** un plugin est un dossier dont `index.ts` exporte `definition` ; il n'importe du tronc que l'API des
plugins ; il reçoit des données en lecture seule ; chaque appel du moteur est protégé (une panne est signalée dans les
Diagnostics, jamais fatale) ; ses réglages sont des champs déclarés du schéma commun. Déposer le dossier suffit : aucune
liste à compléter, ni dans le tronc ni dans l'appli (exceptions : section 9).

---

## 1. Le dossier et la définition

```
src/engine/plugins/
├── index.ts                    racine de composition : collecte les dossiers, construit les registres par défaut
├── shapes/<catégorie>/<id>/    une forme ; bases à étendre dans shapes/generic/ (hors registre)
├── modes/<id>/                 un mode (et ses formes dans modes/<id>/shapes/<forme>/)
└── effects/<id>/               un effet
```

- `index.ts` exporte `export const definition: <Contrat> = { … }`. C'est tout ce que le moteur lit du dossier.
- Le reste du dossier est libre (un fichier par sujet, `.claude/rules/coding.md` §6) ; quelques noms de fichiers sont
  conventionnels, les mêmes dans chaque plugin : `index.ts`, `facade.ts` (façade iso d'une forme), `keys.ts` (clés d'un
  mode), `settings.ts` (réglages globaux), `api.ts` (ce que la partie appli d'un mode importe).
- Du code partagé par plusieurs plugins d'une même famille va dans une base commune (`shapes/generic/`, ou
  `<famille>/common/` pour des variantes d'une forme, sans `index.ts`) ; un plugin n'importe jamais un plugin voisin
  (seule exception : une forme étend une autre forme de `plugins/shapes/`).

## 2. L'identifiant

- L'`id` est le **nom du dossier**, en anglais, en minuscules et tirets (`database`, `rounded-rectangle`, `sequences`,
  `forest`). Il est écrit dans le fichier (`spatial.kind` d'une forme, `spatial.mode`, liste `spatial.effects`) et
  vérifié à l'enregistrement contre `^[a-z][a-z0-9-]*$` (`PLUGIN_ID_PATTERN`,
  [core/spatial.ts](../src/engine/core/spatial.ts)) ; pour une forme, un test vérifie aussi qu'il est le nom du
  dossier.
- **Un id déjà pris est refusé** à l'enregistrement (exception) : un plugin n'en remplace jamais un autre. Une forme
  d'un mode a donc un id préfixé par celui du mode (`rdd-entity`) ; l'espace de noms d'un mode est aussi unique.
- Ne renommez pas un id publié : les fichiers qui l'écrivent ne le reconnaîtraient plus (forme en placeholder, mode ou
  effet signalé inconnu dans les Diagnostics).

## 3. La collecte

[src/engine/plugins/index.ts](../src/engine/plugins/index.ts) est le **seul** fichier qui connaît les dossiers de
`plugins/` : il les collecte par `import.meta.glob` (import de `definition`, sans liste) et construit les registres
par défaut, `createDefaultRegistry` (formes), `createDefaultModeRegistry`, `createDefaultEffectRegistry`.

- Le tronc (`core/`) n'importe jamais un plugin ; il ne connaît que les contrats et ne teste jamais un id en dur.
- Chaque moteur construit ses propres registres, sauf si on lui en passe (`EngineOptions.registry`, `modes`, `effects`).
- L'appli n'en voit qu'une vue en lecture seule (`engine.getShapeRegistry()`, `getModeRegistry()`,
  `getEffectRegistry()`) : la déclaration des plugins et les valeurs de leurs réglages, jamais leurs points d'entrée.
- Retirer un plugin = supprimer son dossier.

## 4. Ce qu'un plugin importe : l'API des plugins

Un plugin importe du tronc **seulement** [core/plugins/index.ts](../src/engine/core/plugins/index.ts), plus `three`
et son propre dossier. Règle complète (globales du navigateur, imports dynamiques, vérification par la lint et
`tests/engine/plugins/boundaries.test.ts`) : `.claude/rules/coding.md` §5.

L'API est rangée en rubriques commentées : contrats et aides des réglages ; modèle neutre en lecture seule, attributs
spatiaux et calculs purs ; briques de dessin (contours, traits, textes, couleurs) ; règles d'édition partagées. Avant
d'écrire un calcul, cherchez-le là. Une brique du tronc qui manque à un plugin s'y **réexporte** (le code reste dans
son dossier du tronc) : c'est la décision d'en faire une brique commune, visible dans le diff. Ce qui héberge les
plugins sans leur être destiné (registres, hôtes, écritures d'un mode) n'y est pas.

## 5. Lecture seule, gel, pas d'état

- **Les données reçues sont en lecture seule** : `PageModel`, `ShapeModel`, `EdgeModel` de l'API sont les types en
  lecture seule du modèle, et le contexte de rendu d'une forme est gelé. En dev et en test, les pages du document sont
  gelées : une écriture lève une exception, traitée comme une panne (section 6). Un plugin n'écrit que par le canal de
  sa famille : un mode par `ModeEdit` (une opération), une forme et un effet jamais (ils renvoient un objet Three.js ;
  pour un aperçu, une forme dessine une copie `{ ...shape, style: { ...shape.style, … } }`).
- **La définition est gelée à l'enregistrement** : un plugin ne modifie ni la sienne ni celle d'un autre.
- **Les points d'entrée sont appelés détachés** de la définition : pas de `this`.
- **Pas d'état de module** (`.claude/rules/coding.md` §3) : deux moteurs d'une page partagent les modules. Un résultat
  ne dépend que de ce que le point d'entrée reçoit ; un cache pur indexé par un objet gelé (`WeakMap` par `PageModel`,
  ex. `plugins/modes/sequences/steps.ts`) est admis. Ce qui dépend du moteur arrive en paramètre (ex. la mesure du
  texte : `ctx.measureText` pour une forme, `edit.measureText` pour un mode).

## 6. Appel protégé et Diagnostics

Le moteur appelle chaque point d'entrée par un seul appel protégé, commun aux trois familles (`callPlugin`,
[core/diagnostics/pluginCalls.ts](../src/engine/core/diagnostics/pluginCalls.ts)), depuis un seul endroit par
famille : le registre des formes, l'hôte des modes (`core/domains/modes/`), l'hôte des effets
(`core/domains/effects/`).

- Un point d'entrée qui lève une exception est **traité comme absent** : l'appelant prend son repli (placeholder,
  bornes de la forme, pas d'habillage, pas de décor…). Ni l'ouverture du fichier, ni le rendu, ni le geste en cours ne
  s'arrêtent. Une opération d'un mode qui lève une exception n'écrit rien.
- L'erreur est signalée **une fois par session**, par plugin et par point d'entrée, dans le panneau **Diagnostics**
  (niveau erreur) : « Forme <id> : erreur dans <point d'entrée> (<message>) », de même « Mode <id> », « Effet <id> »
  (`core/domains/runtime/pluginGuard.ts`). Un registre utilisé hors du moteur (tests) l'écrit à la console.
- Un id du fichier sans plugin n'est jamais une erreur de lecture : forme dessinée en placeholder et comptée dans les
  formes non supportées, « Mode de page inconnu : <id> », « Effet de page inconnu : <id> ».
- Le repli de chaque point d'entrée est écrit dans le guide de sa famille.

## 7. Réglages déclarés : le schéma commun des champs

Un plugin ne dessine jamais son interface de réglage : il **déclare des champs**, que l'appli rend par un seul
composant (`src/app/DeclaredField.tsx`). Tous étendent `Field`
([core/fields/fieldSchema.ts](../src/engine/core/fields/fieldSchema.ts)) : une clé `key`, un nom `label`, une aide
au survol `title`, et selon son `type` :

| `type` | Ce qu'il déclare en plus | Rendu |
|---|---|---|
| `toggle` | — | case à cocher |
| `number` | `placeholder` ; bornes `min`, `max`, `step` ; `unit` (`px`, `ms`, `%`), `zero` (libellé de 0) | curseur si bornes et pas, sinon champ numérique (vide = défaut) |
| `text` | `placeholder`, `multiline` (zone de texte), `monospace` (chasse fixe), `live` (écrit à chaque frappe, une étape d'annulation par passage) | champ texte |
| `choice` | `options` : `value`, `label`, `title`, `color`, `icon` (mêmes tracés que l'icône d'un mode) | boutons (pastilles, icônes) si toutes les options ont une icône ou une couleur, sinon liste |
| `color` | — | couleur #rrggbb |
| `url` | — | adresse http(s), sans barre finale |
| `button` | — | bouton pleine largeur |

Une valeur enregistrée est relue par `readFieldValue` (nombre ramené dans ses bornes, valeur parmi les choix, adresse
normalisée…). Chaque famille n'ajoute que sa cible :

| Champ | Cible | Où il s'affiche | Guide |
|---|---|---|---|
| `ShapeProperty` | la forme posée (style ou attribut `spatial.…`) | panneau de la forme | forme, section 6 |
| `ModeProperty` | la page, une flèche, une forme ou sa partie, dans l'espace de noms du mode | panneau, section du mode | mode, section 3 |
| `PluginSetting` | toute l'appli (réglage global) | Paramètres | ci-dessous |

### Réglages globaux (`PluginSetting`)

Une préférence pour toute l'appli (pas une valeur draw.io, qui reste dans le fichier) est un `PluginSetting` :
`number` (bornes `min`, `max`, `step` obligatoires), `toggle`, `color`, `choice` ou `url` (`when` : modifiable
seulement quand un autre réglage du plugin a une valeur), avec son défaut `default`, un groupe (`group`, `groupHint`)
et une aide sous le réglage (`hint`).

| Déclaré par | Sous-page des Paramètres | Enregistré dans | Valeurs reçues par le plugin |
|---|---|---|---|
| un mode (`settings`) | Modes › <`shortName` ou `name`> | `settings.modes[id][clé]` | `values` de `dressing`, `gestures.obstacles`, `current.look` ; `ModePanelProps.values` côté appli |
| un effet (`settings`) | Effets › <`name`> | `settings.effects[id][clé]` | `values` de `volume` |
| une catégorie de formes (`settings` de `ShapeCategory`) | Formes › <catégorie> | `settings.shapeCategories[id][clé]` | `ctx.values` des formes de la catégorie |

- Le registre du plugin borne les valeurs enregistrées et complète par le défaut : le plugin reçoit toujours une valeur
  valide pour chaque clé déclarée. Lisez-la par `numberValue`, `booleanValue`, `stringValue` de l'API.
- Seuls les écarts au défaut sont enregistrés. Changer une valeur reconstruit ce qui en dépend (scènes, habillage).
- **Ne renommez jamais la clé d'un réglage déclaré** : la préférence serait perdue. Un réglage qui change de place
  déclare son ancienne clé par `legacy` (chemin depuis la racine des paramètres, ex. `view.facadeTags`), reprise tant
  que la nouvelle n'a pas de valeur (lu aujourd'hui pour les catégories de formes).
- Le moteur ne lit jamais ces valeurs lui-même : il les passe au plugin, qui lui rend ce qu'il applique.

**Catégories de formes.** Les formes n'ont pas de réglage global individuel : un réglage lu par des formes est
déclaré par **leur catégorie de palette**, dans
[plugins/shapes/categories.ts](../src/engine/plugins/shapes/categories.ts) (`PALETTE_CATEGORIES`, hors du tronc),
près de la forme ou de la base qui le lit (ex. `FACADE_TAGS_SETTING` de `shapes/generic/building/`, déclaré par la
catégorie Architecture). Lecture dans la forme : [AJOUTER_UNE_FORME.md](AJOUTER_UNE_FORME.md) section 4.1.

## 8. Tests de contrat

Ce qui est vérifié pour tous les plugins d'une famille, sans rien écrire :

| Test | Vérifie |
|---|---|
| `tests/engine/plugins/boundaries.test.ts` (et la lint) | imports : API des plugins, `three`, son dossier |
| `tests/engine/plugins/index.test.ts` | un effet par dossier, `id` = nom du dossier, enregistré sans liste |
| `tests/engine/core/shapes/registry.test.ts` | formes : `id` = dossier, catégorie de palette = dossier, replis en panne |
| `tests/engine/core/modes/registry.test.ts` | modes : contrat des dossiers, id et espace de noms, replis en panne |
| `tests/engine/core/effects/registry.test.ts` | effets : id refusé, décor en panne omis |
| `tests/engine/core/shapes/contractDoc.test.ts`, `tests/engine/core/modes/contractDoc.test.ts`, `tests/engine/core/effects/contractDoc.test.ts` | chaque membre d'un contrat a sa ligne dans le tableau de son guide (et réciproquement) |
| `tests/engine/core/plugins/guides.test.ts` | chaque symbole cité dans les guides des plugins est exporté par l'API (sauf liste blanche) |
| `tests/docs/paths.test.ts` | chaque chemin cité dans les docs existe |

Un membre ajouté à un contrat fait donc échouer un test tant que son guide ne le décrit pas. Les tests propres au
plugin vont dans `tests/engine/plugins/<sorte>/` (ex. `tests/engine/plugins/effects/forest.test.ts`), et une fixture
`.drawio` enregistrée par draw.io avec `make drawio-check` dès que le plugin écrit dans le fichier.

## 9. Ce qui touche encore le tronc

Le patron « déposer le dossier » a des exceptions, toutes voulues :

- **une brique manquante** dans l'API des plugins : son réexport dans `core/plugins/index.ts` (section 4) ;
- **un nouveau point d'entrée** dans un contrat : le contrat, son hôte, et la ligne du tableau du guide (section 8) ;
- **forme** : un synonyme du nom draw.io (`SHAPE_ALIASES`), un périmètre d'accroche propre (`perimeterKind`), une
  nouvelle catégorie de palette ou un réglage de catégorie (`plugins/shapes/categories.ts`, hors du tronc) ;
  détail dans [AJOUTER_UNE_FORME.md](AJOUTER_UNE_FORME.md) ;
- **réglage commun à toutes les formes** (épaisseur, ombrage) : un paramètre du tronc (SPEC §13), pas un réglage de
  plugin.

## 10. Récapitulatif

- [ ] Dossier `plugins/<sorte>/<id>/` (`id` = dossier, minuscules et tirets, libre) avec `index.ts` qui exporte
      `definition`
- [ ] Imports : l'API des plugins, `three`, son dossier ; une brique manquante réexportée par l'API
- [ ] Rien d'écrit dans ce qui est reçu ; pas d'état de module ; pas de `this`
- [ ] Repli acceptable si un point d'entrée lève une exception (guide de la famille)
- [ ] Réglages déclarés (champs du schéma commun), jamais une interface écrite à la main ; clés jamais renommées
- [ ] Tests du plugin dans `tests/engine/plugins/<sorte>/`, `make check` ; fixture et `make drawio-check` si le
      fichier est touché
