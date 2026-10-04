# Ajouter un mode de page

Un **mode** spécialise une page : il ajoute des données de page, des réglages sur les flèches et les formes, et un
habillage du rendu. Tout est stocké en attributs `spatial.*` (SPEC §14.3, §14.5) : dans draw.io, la page reste une
page normale. Le moteur ne connaît aucun mode en particulier : déposer les dossiers suffit.

Exemple complet : le mode « Séquences » ([engine](../src/engine/modes/sequences/index.ts),
[appli](../src/app/modes/sequences/index.tsx)).

## 1. Deux dossiers en miroir

```
src/engine/modes/<id>/      la lib (sans React) : tout le mode
├── index.ts                export const definition: PageModeDefinition = { … }
└── …                       données, règles, opérations
src/app/modes/<id>/         l'appli (facultatif) : sections React du panneau
└── index.tsx               export const panel: ModePanel = { PageSection }
```

- L'`id` du mode est le nom de ses dossiers et la valeur de `spatial.mode` sur `<diagram>`.
- **Toutes les règles vont dans la lib** ; la partie appli affiche les données du mode et appelle ses opérations,
  sans règle métier. Un mode aux réglages simples n'a pas besoin de partie appli : il les déclare (section 3).

## 2. La définition

```ts
interface PageModeDefinition {
  id: string;                                  // nom des dossiers, valeur de spatial.mode
  name: string;                                // choix du mode dans le panneau de la page
  description?: string;                        // aide au survol
  pageProperties?: ModeProperty[];             // réglages déclarés (section 3)
  edgeProperties?: ModeProperty[];
  shapeProperties?: ModeProperty[];
  dressing?(page): PageDressing;               // habillage du rendu (section 4)
  check?(page): ModeIssue[];                   // incohérences, remises en ordre au mieux et signalées
  repair?(edit: ModeEdit): void;               // remise en ordre écrite, après une suppression
  pasteKeys?: string[];                        // attributs retirés des éléments collés ou dupliqués
  current?: ModeCurrent;                       // « courant » de session (section 5)
  edgeCreated?(edit, edgeId, current): void;   // flèche tirée depuis une forme (même étape d'annulation)
  keys?: Record<string, ModeKey>;              // touches sur l'élément sélectionné seul (ex. « + »)
}
```

## 3. Réglages et opérations

Un réglage déclaré (`toggle`, `number`, `text`, `select`) est rendu par un champ générique : section « Mode » de la
page, section au nom du mode dans le panneau d'une flèche ou d'une forme. Par défaut, il lit et écrit l'attribut
`key` de sa cible ; `value`, `write` et `hidden` le font passer par les règles du mode (ex. le rang d'une flèche, qui
s'échange avec une autre).

Une **opération** reçoit un `ModeEdit` : la page avant l'opération (`page`), les couleurs proposées par l'appli
(`palette` : fonds des styles de forme des paramètres), `setPageAttribute` et `setElementAttribute`. Toutes ses écritures forment une étape d'annulation, et rien n'est enregistré si elle ne
change rien. Depuis l'appli : `onEdit(label, (edit) => monOperation(edit, …))` (prop des sections React), ou
`engine.editPageMode(label, …)`.

Les données dérivées d'une page (ex. flèches rangées par flux) se calculent une fois par `PageModel` (le modèle est
relu après chaque modification) : un `WeakMap` suffit.

## 4. Habillage

`dressing(page)` renvoie la couleur du mode pour une flèche (`edgeColor`, trait et pointes, assombrie selon le
paramètre « Assombrissement du trait ») et une pastille
(`edgeBadge` : texte et couleur de fond). Le style draw.io n'est jamais modifié : l'habillage est appliqué au dessin
(`render/pageScene.ts`, `createEdgeObject`), à la construction de la page comme pendant un déplacement. La pastille
fait face à la caméra en iso / 3D (`userData.billboard = 'screen'`). Son apparence (tailles, bordure, chiffre) vient des
paramètres « Modes › Séquences » (clés `shapes.edgeBadge…`, communes à tous les modes).

## 5. Courant, flèche créée, touches

- `current` : un « courant » de session par page (ex. flux courant), gardé par le moteur et jamais écrit :
  `initial` (défaut), `valid` (choix encore valable), `pick` (élément sélectionné seul → nouveau courant), `color`,
  `label` et `values` (barre en haut de la zone de dessin : couleur, libellé centré, boutons précédent / suivant
  dans l'ordre de `values`, choix par `engine.setModeCurrent`). `rename` : renommer le courant depuis son libellé dans la barre (`engine.renameModeCurrent`, nom vide
  refusé). `focus` : éléments gardés nets pour le courant, les autres estompés
  (paramètre `shapes.modeDimOpacity`, opacité multipliée par `setElementsDim`, compatible avec les fondus). L'appli le lit par `engine.getModeCurrent()` et le
  reçoit dans ses
  sections (`current` des props) ; l'événement `modeCurrentChange` signale un changement.
- `edgeCreated(edit, edgeId, current)` : une flèche tirée depuis une forme, dans la même étape d'annulation.
- `keys` : touches (`KeyboardEvent.key`) sur l'élément sélectionné seul ; `applies` dit si l'élément est concerné
  (sinon la touche garde son effet habituel), `run` est une opération (une étape d'annulation, libellée `label`).

## 6. Vérifier

- Tests : `tests/engine/modes/` (contrat des dossiers, mode de test enregistré ; opérations sur une fixture).
- Conservation par draw.io : une fixture avec le mode, puis `make drawio-check` (attributs de page et d'éléments
  comparés après réenregistrement).
