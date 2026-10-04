# Formes en plugins : une interface, un dossier par forme

> Itération — formes (registre, palette, panneau, interaction) ; reprise de l'architecture SPEC §8.2

Objectif : un moteur générique qui ne connaît aucune forme en particulier, et des formes qui vivent leur vie. Déposer
un dossier de forme suffit à la brancher partout (rendu, palette, panneau, interaction), sans toucher au moteur ni à
l'appli. Chaque question qu'on se pose sur une forme (« peut-on l'arrondir ? la redimensionner ? y accrocher une
flèche ? quel aperçu ? quels réglages ? ») trouve sa réponse dans sa définition.

## Exploration : ce qui connaît une forme hors de sa définition

Recensé par `grep` sur les noms de formes et les tests `kind === …` hors de `shapes/` :

| Endroit | Ce qui est propre à une forme |
| --- | --- |
| `render/shapes/registry.ts` | liste écrite à la main des formes enregistrées |
| `render/shapes/storage.ts` | trois formes dans un fichier (`cylinder3`, `datastore`, `direct_data`) |
| `render/iso/buildings.ts` | façades iso de la BDD et du cache (propres à une forme) mêlées aux briques communes |
| `edit/palette.ts` | tous les modèles de palette (style, taille, mots-clés), import de `PLUG_SHAPE` ; clés distinctives `rounded`, `aspect`, `direction` pour reconnaître le modèle d'une forme |
| `app/Palette.tsx` | une icône par identifiant de modèle (`id === 'rectangle'`…) |
| `app/ContextPanel.tsx` | aperçu du style par forme (`ellipse`, `cylinder3` couché ou debout, `datastore`) |
| `app/BorderSection.tsx` | `ROUNDABLE = new Set(['rectangle'])` : case « Coins arrondis » |
| `interaction/pick.ts` | test d'appartenance exact pour `ellipse`, bornes pour `rectangle`, contour pour les autres ; groupe pris seulement avec un lien |
| `Engine.ts` | groupe : pas de poignées de redimensionnement (×2), ignoré par le rectangle de sélection sauf lien ; repères d'accroche en ellipse si `kind === 'ellipse'` |
| `edit/edgeEnds.ts` | groupe : pas de flèche accrochable |
| `edit/move.ts` | groupe : se déplace d'un bloc avec ses enfants |
| `spatial.ts` | `spatial.nodes` (cache), `spatial.tag` (bâtiments) : réglages propres à des formes, sans champ dans le panneau |
| tests | `storage.test.ts`, `shapesFixture.test.ts` couvrent plusieurs formes à la fois |

Restent hors des formes, volontairement (règles du format draw.io, pas d'une forme) :
- `format/style.ts` : alias de noms draw.io (`rect`, `label` → `rectangle`…) ;
- `render/edges/route.ts` : périmètre d'accroche, qui suit le style (`perimeter=`, nom de style `ellipse;`) et pas la
  forme (`shape=ellipse` garde un périmètre rectangle dans draw.io) ;
- `graph/graphPage.ts` : la vue graphe crée des rectangles et des textes (consommatrice des formes).

## Ce qu'on veut

- **Une interface `ShapeDefinition` complète**, par thèmes, chaque champ facultatif avec un repli générique :
  - identité : `kind`, `matches` ;
  - géométrie : `outline`, `contains` (appartenance d'un point ; repli : le contour, sinon les bornes) ;
  - rendu : `flat` (obligatoire), `iso`, `volume`, `volumeHeight`, `textZone`, `minimap` ;
  - interaction : `resizable`, `connectable`, `pickable` (`always` / `withLink`), `movesAsBlock` (groupe) ;
  - palette : `templates` (style, taille, mots-clés, icône SVG, rang `order`) et `templateOf(style)` (variante de
    la forme : rectangle / arrondi, ellipse / cercle, BDD / queue) ;
  - panneau : `swatch(style)` (aperçu SVG du style) et `properties` (réglages propres à la forme, rendus par un
    champ générique : case, nombre, texte, écrits dans une clé du style ; ex. « Coins arrondis » `rounded`,
    nœuds du cache `spatial.nodes`, étiquette de façade `spatial.tag`).
- **Le moteur et l'appli ne posent plus de question à `kind`** : ils interrogent le registre (`registry.resolve`,
  ou des méthodes du registre) ; plus aucun nom de forme hors de `src/engine/shapes/`, sauf les exceptions ci-dessus.
- **Un dossier par forme** `src/engine/shapes/<forme>/`, dont `index.ts` exporte `definition` ; le registre les
  collecte tout seul (`import.meta.glob('./*/index.ts')`) : déposer le dossier suffit, sans liste à tenir à jour.
- **Le code partagé entre formes** va dans `src/engine/shapes/utils/` (tracés de cylindre, briques des « bâtiments »
  iso, façade de queue, repli mini-carte) ; les briques de rendu génériques (`render/flat`, `render/iso/block`,
  `render/geometry`) restent où elles sont.
- `storage.ts` est éclaté en `cylinder3/`, `datastore/`, `direct-data/` ; les façades BDD et cache vont dans leur
  dossier.
- **Les tests des formes** vont dans `tests/engine/shapes/` ; un test de contrat vérifie toutes les définitions
  (rendu `flat`, modèles valides et reconnus, replis d'interaction, aperçus, réglages) et qu'une forme de test
  déposée se branche sans autre code. Un test propre à une forme peut aussi vivre dans son dossier
  (`src/**/*.test.ts` est pris par vitest).
- **Fini quand :** aucun nom de forme ni `kind === …` hors de `shapes/` (exceptions listées) ; une forme de test
  déposée dans un dossier apparaît dans la palette, se dessine, se règle dans le panneau sans autre modification ;
  palette, panneau, sélection, poignées et rendus identiques à l'œil ; `make check` vert.
- Fait :
  - Contrat complet dans `src/engine/shapes/types.ts` (`contains`, `resizable`, `connectable`, `pickable`,
    `movesAsBlock`, `templates` / `templateOf`, `swatch`, `properties` / `ShapeProperty`) et questions correspondantes
    sur `ShapeRegistry` (`contains`, `isResizable`, `isConnectable`, `isPickable`, `movesAsBlock`, `templates`,
    `templateOf`, `swatch`, `properties`). `SHAPE_DEFINITIONS` collecte `./*/index.ts` ; `defaultShapeRegistry` sert
    l'appli et le moteur par défaut.
  - Un dossier par forme : `rectangle/`, `ellipse/`, `text/`, `group/`, `rhombus/`, `plug/`, `cylinder3/` (+
    `database.ts`, façade iso BDD), `datastore/` (+ `cache.ts`, façade iso cache), `direct-data/`. Communs dans
    `shapes/utils/` : `cylinder.ts`, `building.ts` (briques des bâtiments, `tagProperty`), `queue.ts`, `minimap.ts`.
    `render/shapes/` et `render/iso/buildings.ts` disparaissent.
  - Moteur : `pick.ts` reçoit `contains` / `pickable` ; `connectableShapes` et `moveTarget` reçoivent le registre ;
    `Engine` ne teste plus `kind` (poignées, rectangle de sélection) ; les repères d'accroche suivent `perimeterKind`
    (un losange montre désormais son périmètre en losange). `setSpatial` accepte un texte (`spatial.tag`).
  - Palette : modèles et icônes déclarés par chaque forme (`edit/palette.ts` les rassemble, `Palette.tsx` affiche
    l'icône) ; reconnaissance des variantes par `templateOf` au lieu des clés distinctives codées en dur.
  - Panneau : aperçus des styles par `swatch` ; `ShapePropertyFields` (`app/ShapeProperties.tsx`) affiche les
    réglages déclarés : « Coins arrondis » (rectangle, plus de `ROUNDABLE`), « Nœuds » (cache), « Étiquette »
    (BDD, queue, cache). Champs texte et nombre sortis dans `app/Fields.tsx`.
  - Tests : `tests/engine/shapes/registry.test.ts` (contrat, forme de test branchée) ; `shapesFixture` et `storage`
    déplacés dans `tests/engine/shapes/`. Docs : `AJOUTER_UNE_FORME.md` (dossier, interface, section 6), SPEC §4.2 et
    §8.2.
  - Restent hors des formes, comme prévu : alias de `format/style.ts`, `perimeterKind`, vue graphe ; un commentaire
    d'exemple dans `model/types.ts`.
  - Vérifié dans l'appli : palette (icônes, ordre), aperçus de style d'un cylindre, réglage « Étiquette » en section
    Volume, « Coins arrondis » sur un rectangle, vue iso ; `make check` vert.
