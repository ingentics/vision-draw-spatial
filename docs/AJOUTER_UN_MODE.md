# Ajouter un mode de page

Un **mode** spécialise une page : il ajoute des données de page, des réglages sur les flèches et les formes, et un
habillage du rendu. Tout est stocké en attributs `spatial.<espace de noms du mode>.*` (SPEC §14.3, §14.5) : dans
draw.io, la page reste une page normale. Le moteur ne connaît aucun mode en particulier : déposer les dossiers suffit.

Exemple complet : le mode « Séquences » ([engine](../src/engine/plugins/modes/sequences/index.ts),
[appli](../src/app/plugins/modes/sequences/index.tsx)). Mode avec ses propres formes : « RDD »
([engine](../src/engine/plugins/modes/rdd/index.ts), seul fichier à la racine du mode : modèle des tables dans `rdd/tables/`,
sélection et réglages dans `rdd/editing/`, régions dans `rdd/regions/`, relations dans `rdd/relations/`, formes dans
`rdd/shapes/` et leur rendu commun dans `rdd/shapes/common/`).

## 1. Deux dossiers en miroir

```
src/engine/plugins/modes/<id>/  la lib (sans React) : tout le mode
├── index.ts                    export const definition: PageModeDefinition = { … }
├── api.ts                      ce que sa partie appli importe (facultatif)
├── shapes/<forme>/index.ts     formes propres au mode (facultatif, section 6)
├── shapes/common/              code commun à ses formes (rendu, fabrique ; sans index.ts, ce n'est pas une forme)
└── …                           données, règles, opérations
src/app/plugins/modes/<id>/     l'appli (facultatif) : sections React du panneau
└── index.tsx                   export const panel: ModePanel = { PageSection }
```

- L'`id` du mode est le nom de ses dossiers et la valeur de `spatial.mode` sur `<diagram>`. La racine de composition
  (`src/engine/plugins/index.ts`) collecte le dossier ; le contrat est dans `src/engine/core/modes/types.ts`.
- Un mode importe du tronc **seulement l'API des plugins** ([core/plugins/index.ts](../src/engine/core/plugins/index.ts),
  sujet 287 : contrats, modèle, calculs purs, briques de dessin), plus `three` et son propre dossier ; ni un autre
  mode, ni un effet. Ses formes peuvent étendre une forme générale (`plugins/shapes/`). Une brique du tronc qui manque
  s'ajoute à l'API des plugins : c'est la décision d'en faire une brique commune. Pas d'import dynamique
  (`import()`, `import.meta.glob`) ni de globale du navigateur (`window`, `document`, `globalThis`, stockage,
  minuteries : sujet 305). La lint et `tests/engine/plugins/boundaries.test.ts` (chemins résolus) le vérifient.
- **Toutes les règles vont dans la lib** ; la partie appli affiche les données du mode et appelle ses opérations,
  sans règle métier. Un mode aux réglages simples n'a pas besoin de partie appli : il les déclare (section 3).

## 2. La définition

```ts
interface PageModeDefinition {
  id: string;                                  // nom des dossiers, valeur de spatial.mode
  namespace: string;                           // espace de noms des clés : spatial.<namespace>.<nom> (section 3)
  legacyKeys?: string[];                       // anciennes clés spatial.<nom> lues, renommées à l'ouverture
  name: string;                                // choix du mode dans le panneau de la page
  shortName?: string;                          // nom court (sous-page des paramètres ; défaut : name)
  description?: string;                        // aide au survol
  icon?: ModeIcon;                             // onglet : tracés 16 × 16 fill / line / accent
  settings?: PluginSetting[];                  // réglages globaux, Paramètres › Modes (section 3)
  page?: {                                     // la page du mode
    properties?: ModeProperty[];               // réglages déclarés de la page (section 3)
    viewModes?: ViewMode[];                    // modes d'affichage permis (section 6)
    allowsEffect?(effectId): boolean;          // effets permis (absent : tous)
    selectionStyle?: 'veil' | 'outline';       // mise en valeur de la sélection imposée (ex. RDD : contour)
    palette?: { shapes?: string[]; categories?: PaletteCategory[] };  // palette du mode (section 6)
  };
  lifecycle?: {                                // moments de la vie du document
    check?(page): ModeIssue[];                 // incohérences, remises en ordre au mieux et signalées
    opened?(edit): void;                       // remise en ordre à l'ouverture (ex. tables RDD ajustées)
    removed?(edit): void;                      // remise en ordre après une suppression d'éléments
  };
  dressing?(page, values): PageDressing;       // habillage du rendu (section 4)
  edges?: {                                    // les flèches
    properties?: ModeProperty[];               // réglages déclarés d'une flèche (section 3)
    connects?(page, source, target): boolean;  // flèches permises (ex. liaisons des tables RDD)
    manages?(page, edge): boolean;             // flèche gérée par le mode (réglages imposés)
    created?(edit, edgeId, current): void;     // flèche tirée depuis une forme (même étape d'annulation)
    reconnected?(edit, edgeId): void;          // bout d'une flèche rebranché (même étape)
  };
  gestures?: {                                 // les formes et les gestes sur elles (section 5)
    properties?: ModeProperty[];               // réglages déclarés d'une forme ou de sa partie (section 3)
    carries?(page, shape): string[];           // formes emportées quand on déplace `shape` (ex. région RDD)
    obstacles?(page, shape, values): ModeObstacles; // bornes d'un déplacement / redimensionnement (ex. régions sœurs)
    placed?(edit, shapeIds, before?): void;    // formes déplacées ou ajoutées (ex. région RDD agrandie)
    relabeled?(edit, elementId): void;         // texte d'un élément changé (ex. table RDD élargie)
    handles?: {                                // poignées propres au mode sur la forme sélectionnée (ex. « + »)
      list(page, shape, part?): ModeHandle[];
      clicked?(edit, shape, handle, part?): string | undefined;  // clic sur une poignée
    };
  };
  parts?: ModeParts;                           // parties sélectionnables d'une forme (ex. champs d'une table RDD)
  current?: ModeCurrent;                       // « courant » de session (section 5)
  keys?: Record<string, ModeKey>;              // touches sur l'élément sélectionné seul (ex. « + »)
  pasteKeys?: string[];                        // attributs du mode (noms courts) retirés des éléments collés
}
```

La page, ses formes et ses flèches reçues par le mode sont **en lecture seule** (sujet 303 : types `PageModel`,
`ShapeModel`, `EdgeModel` de l'API des plugins) : le mode n'écrit que par `ModeEdit`. En dev et en test, les pages du
document sont gelées (sujet 312) : une écriture lève une exception, traitée comme une panne du point d'entrée. Sa définition est gelée à
l'enregistrement.

Les points d'entrée sont rangés par groupe (sujet 295) : `page`, `lifecycle`, `edges`, `gestures`, `parts`,
`current`. Dans la suite, un point d'entrée est désigné par son chemin (ex. `gestures.placed`).

Le moteur appelle ces points d'entrée depuis un seul endroit (`core/domains/modes/`, sujet 288), chacun protégé : un
point d'entrée qui lève une exception est traité comme absent (pas d'habillage, pas de borne, accroche permise…), et
l'erreur est signalée une fois dans les Diagnostics (« Mode <id> : erreur dans <point d'entrée> »). Une opération
(`ModeEdit`) qui lève une exception n'écrit rien : ses écritures ne sont appliquées qu'une fois l'opération terminée.
La section 8 donne, point d'entrée par point d'entrée, quand le moteur l'appelle et ce qu'il garantit.

## 3. Réglages et opérations

### Les clés du mode

Un mode n'écrit ses données que dans son **espace de noms** (sujet 301) : `namespace` (`^[a-z][a-z0-9]*$`, ex. `seq`
pour Séquences, `rdd` pour RDD), propre au mode — un second mode qui le reprend est refusé à l'enregistrement. Le mode
ne désigne ses clés que par leur **nom court** (`flow`, `fields`…) ; le moteur ajoute le préfixe et écrit
`spatial.<namespace>.<nom>`. Un mode ne peut donc écrire ni les clés du tronc (`spatial.mode`, `spatial.height`…), ni
celles d'un autre mode ; un nom invalide (`;`, `=`, espace, ou déjà préfixé par `spatial.`) fait échouer l'opération,
qui n'écrit rien.

Pour lire, le mode prend un lecteur de ses clés dans l'API des plugins, une fois, à partir de ce qui le situe :

```ts
export const SEQUENCES_KEYS = { namespace: 'seq', legacyKeys: ['flows', 'flow', 'step', 'participant'] };
export const keys = modeKeys(SEQUENCES_KEYS);   // keys.value(edge, 'flow'), keys.flag(…), keys.pageValue(page, 'flows')
export const definition: PageModeDefinition = { id: 'sequences', ...SEQUENCES_KEYS, … };
```

`keys.key(nom)` donne la clé complète, pour l'écrire soi-même dans un style (modèle de palette, aperçu d'une forme).
`legacyKeys` : noms courts dont l'ancienne clé `spatial.<nom>` (d'avant l'espace de noms) est encore lue ; à
l'ouverture du document, le moteur la réécrit sous son nouveau nom, à la même place, dans l'étape d'annulation de
`lifecycle.opened`. Un nouveau mode n'en a pas.

Un réglage déclaré (`toggle`, `number`, `text` — `multiline` pour une zone de texte —, `select`, dont les choix
reçoivent les couleurs de l'appli ; `readOnly` pour l'afficher sans le rendre modifiable) est rendu par un champ
générique : section « Mode » de la
page, section au nom du mode dans le panneau d'une flèche ou d'une forme. Par défaut, il lit et écrit l'attribut du
mode de nom court `key` sur sa cible ; `value`, `write` et `hidden` le font passer par les règles du mode (ex. le rang d'une flèche, qui
s'échange avec une autre).

Un réglage peut aller dans sa propre section du panneau (`section`, son titre ; défaut : la section au nom du mode,
sujet 260), et être en lecture seule selon sa cible (`readOnly` fonction, ex. label de la clé primaire).

Un réglage `button` (sujet 253) est un bouton sur toute la largeur de la section, dont le clic appelle `write`.
`write` peut renvoyer une partie de la forme : elle est alors sélectionnée et son texte passe en édition (ex.
séparateur ajouté) ; `anyPart` montre le réglage que la forme seule ou une de ses parties soit sélectionnée.

Un réglage `part: true` porte sur une **partie** de la forme (ex. un champ d'une table RDD, sujet 249) : il n'est
montré que lorsqu'une partie est sélectionnée (et les autres réglages de forme seulement lorsqu'aucune ne l'est) ;
`value`, `write` et `hidden` reçoivent alors la partie en dernier paramètre.

Une **opération** reçoit un `ModeEdit` : la page avant l'opération (`page`), les couleurs proposées par l'appli
(`palette` : fonds des styles de forme des paramètres), `setPageAttribute`, `setElementAttribute` (attributs du mode,
par leur nom court), `setElementStyle` (autre clé du style draw.io, ex. `fillColor` ; ni `spatial.*`, ni clé de verrou
`locked`, `movable`, `resizable`, `editable`, `deletable`) et `setShapeBounds` (bornes d'une forme, ex. une table qui
grandit avec ses champs). Un élément verrouillé ne change ni de style, ni de bornes, ni de place dans l'ordre, ni de
textes de bout. Toutes ses écritures forment une étape d'annulation, et rien n'est enregistré si elle ne
change rien. Depuis l'appli : `onEdit(label, (edit) => monOperation(edit, …))` (prop des sections React), ou
`engine.editPageMode(label, …)`.

Les **réglages globaux** du mode (ticket 283), pour toute l'appli et non pour une page, sont déclarés dans sa
définition (`settings`, rangés dans `plugins/modes/<id>/settings.ts`), du même type que ceux d'un effet
(`PluginSetting`, sujet 287) : nombre borné (`unit` `px`, `ms`
ou `%`, `zero` : libellé de 0), case à cocher, couleur, choix dans une liste (`choice`, `options`) ou adresse http(s)
(`url`, `when` : modifiable seulement quand un autre réglage a une valeur ; sujet 306), avec leur défaut, un groupe (`group`, `groupHint`) et une aide
(`hint`). L'appli les affiche dans une sous-page du mode (Paramètres › Modes, titre `shortName` sinon `name`) et les
enregistre dans `settings.modes[id][key]` ; le registre les borne (`values`, aussi dans la vue que l'appli reçoit,
`engine.getModeRegistry()` : déclaration des modes seulement, jamais leurs points d'entrée, sujet 304). Le moteur ne les lit
jamais : il passe les valeurs (`values`) aux mécanismes du mode (`gestures.obstacles`, `dressing`, `current.look`), qui lui
rendent ce qu'il applique (écart, apparence des pastilles, opacité…) ; la partie appli du mode les reçoit aussi
(`ModePanelProps.values`, ex. moteur de rendu de l'export PlantUML de Séquences). `legacy` : ancienne clé de la section
`shapes`, ou chemin depuis la racine des paramètres s'il contient un point (`exporters.plantuml.renderer`), reprise une
fois par la migration des paramètres enregistrés.

Les données dérivées d'une page (ex. flèches rangées par flux) se calculent une fois par `PageModel` (le modèle est
relu après chaque modification) : un `WeakMap` suffit.

## 4. Habillage

`dressing(page, values)` renvoie la couleur du mode pour une flèche (`edgeColor`, trait et pointes, assombrie de
`edgeDarken`, défaut 0,25) et une pastille
(`edgeBadge` : texte et couleur de fond). Le style draw.io n'est jamais modifié : l'habillage est appliqué au dessin
(`core/render/pageScene.ts`, `createEdgeObject`), à la construction de la page comme pendant un déplacement. La pastille
fait face à la caméra en iso / 3D (`userData.billboard = 'screen'`). Son apparence (tailles, bordure, chiffre) est
`edgeBadgeStyle`, tirée des réglages du mode (défaut : `DEFAULT_EDGE_BADGE`).

## 5. Courant, flèche créée, touches

- `current` : un « courant » de session par page (ex. flux courant), gardé par le moteur et jamais écrit :
  `initial` (défaut), `valid` (choix encore valable), `pick` (élément sélectionné seul → nouveau courant), `color`,
  `label` et `values` (barre en haut de la zone de dessin : couleur, libellé centré, boutons précédent / suivant
  dans l'ordre de `values`, choix par `engine.setModeCurrent`). `rename` : renommer le courant depuis son libellé dans la barre (`engine.renameModeCurrent`, nom vide
  refusé). `focus` : éléments gardés nets pour le courant, les autres estompés
  (opacité de `look(values).dimOpacity`, défaut 0,3, multipliée par `setElementsDim`, compatible avec les fondus ;
  `look(values).barSlideDuration` : glissement de la barre, défaut 200 ms). L'appli le lit par `engine.getModeCurrent()` et le
  reçoit dans ses
  sections (`current` des props) ; l'événement `modeCurrentChange` signale un changement.
- `edges.created(edit, edgeId, current)` : une flèche tirée depuis une forme, dans la même étape d'annulation.
- `keys` : touches (`KeyboardEvent.key`) sur l'élément sélectionné seul ; `applies` dit si l'élément est concerné
  (sinon la touche garde son effet habituel), `run` est une opération (une étape d'annulation, libellée `label`).
- `gestures.carries(page, shape)` : formes emportées quand on déplace `shape` (glisser ou flèches du clavier), calculées sans
  parent draw.io (ex. contenu d'une région RDD) ; de proche en proche, dans la même étape d'annulation, avec les
  flèches qui les relient entre elles. La sélection les met en valeur avec la forme.
- `gestures.placed(edit, shapeIds)` : formes posées (fin d'un glisser, flèches du clavier, ajout depuis la palette), déjà
  écrites ; remise en ordre dans la même étape d'annulation (`edit.page` : la page après la pose ; `before` : la page
  avant un déplacement, absente pour un ajout).
- `gestures.relabeled(edit, elementId)` : texte d'un élément changé (édition sur place ou panneau), déjà écrit ; remise en
  ordre dans la même étape d'annulation (`edit.page` montre le nouveau texte ; ex. table RDD élargie pour son nom).
- `lifecycle.opened(edit)` (sujet 255) : remise en ordre d'une page du mode à l'ouverture du document, faite sur la mesure
  exacte du texte (à l'ouverture si les polices sont chargées, sinon à leur arrivée) ; une étape d'annulation
  « Ajustement du mode » pour tout le document, rien si rien ne change ou si le document n'est pas modifiable.
- `gestures.handles` : `list` / `clicked` (sujets 250, 256) : poignées propres au mode sur la forme sélectionnée seule et
  modifiable (disque de leur couleur marqué d'un « + », accroché à un point de page et décalé de pixels écran) ; un
  clic est une opération du mode (une étape d'annulation) qui renvoie la partie à sélectionner, dont le texte passe en
  édition.
  Une forme peut aussi limiter ses poignées de connexion (`ShapeDefinition.connectSides`).
- `parts` (sujet 249) : parties d'une forme du mode, désignées par une chaîne propre au mode. Un clic sur une partie
  (`at(page, shape, point)`) la sélectionne, la forme sélectionnée ou non (`Selection.part`), mise en valeur sur son
  emprise (`bounds`), et pré-sélectionnée au survol (fond plus léger, sujet 259) ; Échap revient à la forme. `text` / `setText` : texte modifiable sur place au double-clic, sur une
  ligne (Entrée valide), écrit par une opération du mode (une étape d'annulation). `remove` : Suppr sur la partie
  sélectionnée la retire (sujet 251) ; la forme n'est jamais supprimée à sa place, et un refus du mode laisse tout tel
  quel. `comment` / `setComment` (sujet 262) : commentaire d'une partie (titre et texte, vide s'il n'y en a pas,
  undefined si elle ne peut pas en avoir), montré dans l'encart au survol après celui de la forme, et édité en texte
  brut par la touche C quand la partie est sélectionnée ou survolée. `textPreview` (sujet 253) : la forme telle qu'elle serait avec le texte en cours de saisie, redessinée en
  direct ; les objets du texte dessiné de la partie (marqués `userData.part`) sont masqués pendant l'édition, et
  `ModePartText` peut demander un éditeur sans fond (`transparent`), centré (`center`), d'une couleur (`color`). Les
  touches du mode (`keys`) reçoivent aussi la partie sélectionnée et peuvent renvoyer la partie à sélectionner.
  `dropAt` / `move` (sujet 252) : un appui sur la partie sélectionnée la glisse (et non la forme) ; `dropAt` donne
  la place visée sous le pointeur, `preview` la forme telle qu'elle serait (redessinée en direct, la partie mise en
  valeur à sa nouvelle place), `move` déplace la partie au lâcher (une étape d'annulation) et renvoie la partie à
  sélectionner.
- `gestures.obstacles(page, shape, values)` : emprises que `shape` ne doit pas approcher pendant un déplacement (glisser,
  flèches du clavier) ou un redimensionnement, à l'écart `gap` (réglage du mode, ex. `obstacleGap` de RDD) ; `above` : ce que la forme dessine
  au-dessus de ses bornes. Le moteur borne le geste (un axe puis l'autre, on glisse le long d'un obstacle) et montre la
  limite atteinte en pointillé rouge (`core/edit/obstacles.ts`).

## 6. Formes, palette et modes d'affichage

- **Formes du mode** : un dossier par forme, `plugins/modes/<id>/shapes/<forme>/index.ts`, qui exporte `definition`
  (`ShapeDefinition`, même contrat que `plugins/shapes/<catégorie>/<forme>/`, voir `AJOUTER_UNE_FORME.md`). Déposer le
  dossier suffit : le registre des formes l'enregistre (la forme se dessine sur toute page, collée ailleurs elle
  reste lisible), le registre des modes la réserve à la palette des pages du mode. Son `id` est préfixé par celui du
  mode (`rdd-entity`) pour ne jamais masquer une forme générale.
- **`page.palette.categories`** : catégories propres au mode (`{ id, name, order }`), rangées avec celles de la palette
  (Géométrie 10, Général 20, Architecture 30) ; la `category` de la palette d'une forme du mode en nomme une. Une
  catégorie vide pour la page n'est pas affichée.
- **`page.palette.shapes`** : liste blanche des ids proposés (formes générales ou du mode). Absente : palette normale et formes du
  mode. Présente : la palette de la page (recherche comprise) n'affiche que ces formes ; les formes déjà posées et le
  collage ne sont pas filtrés.
- **`page.viewModes`** (`'top' | 'iso' | '3d'`) : modes d'affichage permis ; absent = tous. La page s'affiche dans le premier
  permis (ouverture, changement de page, passage dans le mode, rechargement), `I` / `P` sont sans effet et les
  boutons des autres modes désactivés ; en quittant la page, on retrouve la vue choisie par l'utilisateur.
- Registre : `paletteFor(page)` (catégories et formes de la palette d'une page), `allowsViewMode(page, mode)`.

## 7. Vérifier

- Tests : `tests/engine/core/modes/registry.test.ts` (contrat des dossiers, mode de test enregistré avec sa forme dans
  `fixtures/test/shapes/`) ; ceux du mode dans `tests/engine/plugins/modes/` (opérations sur une fixture).
- Conservation par draw.io : une fixture avec le mode, puis `make drawio-check` (attributs de page et d'éléments
  comparés après réenregistrement).

## 8. Garanties du moteur, point d'entrée par point d'entrée

Règles communes (sujet 288) :
- **Opération** : une fonction qui reçoit un `ModeEdit`. `edit.page` est la page *avant* l'opération (le modèle n'est
  relu qu'à la fin). Les écritures sont rassemblées puis appliquées une fois l'opération terminée. Une opération qui ne
  change rien n'ouvre pas d'étape d'annulation ; une opération qui lève une exception n'écrit rien, et si une de ses
  écritures échoue en route (ex. cellule disparue), la page revient à l'état d'avant l'opération (sujet 302).
- **Remise en ordre** : une opération appelée *après* un geste déjà écrit dans l'arbre. `edit.page` est la page relue
  *après* le geste, et ses écritures tombent dans l'étape d'annulation du geste.
- **En panne** : un point d'entrée qui lève une exception est traité comme absent (colonne « En panne ») ; l'erreur est
  signalée une fois par session dans les Diagnostics.
- Annuler / rétablir ne rappelle aucun point d'entrée : le document revient tel qu'il était, remises en ordre comprises.

| Point d'entrée | Appelé | Page reçue | Écritures | En panne |
|---|---|---|---|---|
| **Déclaration** | | | | |
| `id` | lu par le registre (dossier, `spatial.mode`) | — | — | — |
| `namespace` | enregistrement (unique, sinon refusé) ; préfixe de chaque écriture d'attribut du mode | — | — | — |
| `legacyKeys` | ouverture du document : anciennes clés renommées, avant `lifecycle.opened` | page de l'arbre | dans l'étape de `lifecycle.opened` | — |
| `name` | choix du mode, titres | — | — | — |
| `shortName` | sous-page Paramètres › Modes | — | — | — |
| `description` | aide du choix du mode | — | — | — |
| `icon` | onglet d'une page du mode | — | — | — |
| `page.palette.shapes` | palette d'une page du mode (`paletteFor`) | — | — | — |
| `page.palette.categories` | palette d'une page du mode | — | — | — |
| `page.viewModes` | ouverture, changement de page, passage dans le mode, boutons de vue | — | — | — |
| `page.allowsEffect` | effets actifs d'une page (scène en volume, page en volume ou non), panneau des effets | — | — | effet permis (les modes d'affichage de l'effet restent vérifiés) |
| `page.selectionStyle` | mise en valeur de la sélection sur une page du mode | — | — | — |
| `settings` | Paramètres › Modes ; valeurs bornées passées à `dressing`, `gestures.obstacles`, `current.look` | — | — | — |
| `pasteKeys` | collage et duplication, sur toutes les pages | — | clés du mode (et anciennes clés) retirées des éléments collés | — |
| **Cycle de vie** | | | | |
| `lifecycle.check` | chaque lecture du document (ouverture, chaque modification, annuler / rétablir) | page du modèle | aucune (avertissements) | aucun avertissement du mode pour la page |
| `lifecycle.opened` | ouverture du document, et à nouveau quand la mesure exacte du texte arrive ; pas en lecture seule | page du modèle | une étape « Ajustement du mode » pour tout le document | rien d'écrit pour la page |
| `lifecycle.removed` | après une suppression (Suppr, Couper) | relue après la suppression | remise en ordre, étape de la suppression | rien d'écrit |
| **Rendu** | | | | |
| `dressing` | construction de chaque scène de page, et pendant un déplacement (flèches retracées) | page du modèle | aucune | pas d'habillage ; `edgeColor` / `edgeBadge` en panne : couleur ou pastille absente pour la flèche |
| **Flèches** | | | | |
| `edges.created` | flèche tirée depuis une forme, au lâcher ; reçoit le courant | relue avec la flèche | remise en ordre, étape de la création | rien d'écrit |
| `edges.reconnected` | bout d'une flèche rebranché (poignée d'extrémité), au lâcher | relue après le rebranchement | remise en ordre, étape du rebranchement | rien d'écrit |
| `edges.connects` | pendant le tirage ou le rebranchement d'un bout, pour chaque forme candidate | page du modèle | aucune | accroche permise |
| `edges.manages` | panneau d'une flèche, textes de début / fin (édition, déplacement) | page courante | aucune | flèche non gérée |
| **Formes et gestes** | | | | |
| `gestures.carries` | début d'un déplacement (glisser, clavier), Aligner / Répartir, mise en valeur de la sélection ; de proche en proche | page du modèle | aucune | n'emporte rien (ce qui a été trouvé avant la panne est gardé) |
| `gestures.obstacles` | début d'un déplacement ou d'un redimensionnement, Aligner / Répartir ; reçoit les réglages du mode | page du modèle | aucune | aucune borne |
| `gestures.placed` | fin d'un déplacement (glisser, clavier), d'un redimensionnement, ajout depuis la palette, collage, Aligner / Répartir ; `before` : page d'avant un déplacement, absente pour un ajout | relue après la pose | remise en ordre, étape du geste | rien d'écrit |
| `gestures.relabeled` | texte d'un élément validé (édition sur place ou panneau) | relue avec le nouveau texte | remise en ordre, étape du texte | rien d'écrit |
| `keys` | touche sur l'élément sélectionné seul d'une page modifiable : `applies` puis `run` | page du modèle ; `run` : opération | une étape au titre `label` | `applies` : touche non prise ; `run` : rien d'écrit |
| `gestures.handles.list` | forme sélectionnée seule et modifiable : dessin des poignées et pointeur | page du modèle | aucune | pas de poignée |
| `gestures.handles.clicked` | clic sur une poignée du mode ; renvoie la partie à sélectionner | opération | une étape au titre de la poignée | rien d'écrit |
| **Parties** | | | | |
| `parts` | `at` : pointeur et clic ; `bounds` : mise en valeur, validité de la partie sélectionnée ; `text`, `textPreview` : édition sur place ; `comment` : encart et touche C ; `dropAt`, `preview` : glisser d'une partie ; `setText`, `setComment`, `remove`, `move` : opérations | page du modèle (opérations : page avant) | `setText` « Texte », `setComment` « Commentaire », `remove` « Suppression », `move` « Ordre » | lecture : partie absente (la forme elle-même, pas de texte, pas de place) ; opération : rien d'écrit |
| **Courant** | | | | |
| `current` | `initial` / `valid` : à chaque lecture du courant ; `pick` : clic ou sélection d'un seul élément ; `color`, `label`, `values` : barre du courant ; `focus` : avant chaque image ; `look` : barre et estompage ; `rename` : opération depuis la barre | page du modèle (`rename` : opération) | `rename` : une étape « Renommage » ; le courant lui-même n'est jamais écrit | pas de courant, pas de barre, rien d'estompé, apparence par défaut |
| **Réglages déclarés** | | | | |
| `page.properties` | panneau de la page : `hidden`, `value`, `readOnly`, `options` évalués par le moteur (sujet 294) ; `write` : opération | page du modèle (`write` : opération) | une étape au titre du réglage ; réglage en direct (`live`) : une étape par saisie | réglage montré, valeur de l'attribut, modifiable, sans choix ; `write` : rien d'écrit |
| `edges.properties` | panneau d'une flèche, comme `page.properties` | idem | idem | idem |
| `gestures.properties` | panneau d'une forme ou de sa partie sélectionnée (`part`), comme `page.properties` | idem | idem | idem |

