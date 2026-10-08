# Retournement et rotation à 90° des formes (capacités du moteur)

> Évolution du moteur des formes (`core/shapes/types.ts`, `core/render/geometry/orient.ts`) et du panneau de forme ;
> s'appuie sur `direction` / `flipH` / `flipV` déjà lus par `orientation()` (sujet 307) ; accolades (334) comme premier
> cas d'usage

**Priorité de ce sujet :** le **copier-coller depuis draw.io** (ce qui arrive de draw.io doit s'afficher et se
comporter correctement dans l'appli). Le sens inverse (appli → draw.io) se fait **a minima** : on écrit les clés
standard de draw.io et on ne vérifie pas le rendu côté draw.io ici (suivi à part : `idea/337`).

- **Capacités déclarées par la forme.** `ShapeDefinition` gagne deux champs optionnels, **absents = non** :
  - `flippable?: { horizontal?: boolean; vertical?: boolean }` : peut être retournée (miroir), dans un sens, l'autre
    ou les deux ;
  - `rotatable?: boolean` : peut être tournée par quarts de tour.
  - Une forme qui en déclare un **doit** dessiner son contour via `orientation()` / `orientedPath()` (déjà le cas des
    accolades, acteurs, cylindres, stencils, file…) : le champ déclare une capacité, il ne l'implémente pas. Les
    formes dont le rendu suit déjà `direction` / `flipH` / `flipV` les déclarent à la suite de ce sujet (au minimum :
    accolades, prise, silhouettes) ; les autres ne changent pas.
  - Une définition qui en étend une autre (`{ ...rectangle, … }`) hérite des capacités, comme des autres champs.
- **Le panneau lit les capacités, il ne connaît aucune forme.** Dans le panneau de la forme (`ContextPanel.tsx`,
  `ShapeSections`), une section **« Orientation »** avec, selon ce que la forme permet :
  - « Retourner horizontalement » (miroir gauche ↔ droite) et « Retourner verticalement » (haut ↔ bas) ;
  - « Pivoter de 90° à gauche » (anti-horaire) et « Pivoter de 90° à droite » (horaire).
  - Boutons-icônes avec infobulle (`useTooltip`, comme `ArrangeSection`). **Quatre icônes à dessiner** ; en attendant,
    libellés texte.
  - **Section absente** si la forme ne permet rien ; un bouton dont l'action n'est permise par aucune forme de la
    sélection n'est pas affiché.
  - Les retournements sont **à bascule** (le bouton reflète `flipH` / `flipV`, un second clic défait) ; les pivots
    s'enchaînent (quatre pivots du même côté = état d'origine).
  - **Sélection multiple :** s'applique aux seules formes qui le permettent, chacune **sur son propre centre**, sans
    déplacer l'ensemble. État « actif » d'un retournement : toutes les formes concernées sont retournées.
- **Ce qui est écrit dans le XML** (clés standard de draw.io, écriture en place, SPEC §14.2) :
  - retournement : `flipH=1` / `flipV=1` ; revenir à l'état d'origine **retire la clé** (pas de `flipH=0`) ;
  - pivot : `direction` suit le cycle `east → south → west → north → east` (à droite) ou son inverse (à gauche),
    `east` (défaut) retire la clé. Et les **dimensions s'échangent autour du centre** (`mxGeometry` : `width` ↔
    `height`, `x` / `y` recalés), pour que la forme tourne réellement au lieu d'être écrasée dans ses bornes ;
  - **une seule étape d'annulation** par action, libellée (« Retourner horizontalement », « Pivoter à droite »…),
    y compris en sélection multiple.
  - Le pivot et le retournement se composent comme dans `orient.ts` (rotation puis miroir, `flipH` / `flipV` échangés
    pour un cadre couché) : les boutons agissent sur **l'écran** ; selon l'état, la clé écrite peut donc différer du
    bouton (ex. « horizontal » écrit `flipV` sur une forme `direction=north`, et un pivot à droite d'une forme avec un
    seul retournement avance `direction` dans l'autre sens). Tests dédiés.
  - **Hors périmètre :** la clé `rotation=<degrés>` de draw.io (rotation libre) n'est pas lue (déjà « non reprise »
    en SPEC §15) ; voir `idea/337`.
- **Le texte ne se retourne pas et ne pivote pas, seule la forme.** Le label garde son sens de lecture, sa position et
  son alignement : ni miroir, ni rotation, ni échange automatique gauche/droite de `align` / `labelPosition`
  (accolade droite : `labelPosition=right` est écrit, pas déduit). `textZone` et l'éditeur en place suivent les
  **bornes** de la forme (après échange de dimensions pour un pivot) ; une forme dont la zone dépend d'un côté
  (languette, tranche, bout visible…) la calcule via `orientation().map`, jamais par un cas particulier dans le
  panneau.
- **Rendu et interactions qui suivent** (acquis ou à contrôler, pas à réécrire) : contour, détails, `contains` ; les
  trois vues (2D, iso, 3D) et la mini-carte ; accroche des flèches sur le périmètre (`perimeters/index.ts`,
  `terminals.ts` lisent déjà `flipH` / `flipV`) ; poignées de redimensionnement et de connexion. Une forme sans rendu
  iso / 3D propre retombe sur son contour orienté.
- **Accolades (334) :** gauche et droite restent deux entrées de palette, distinguées par `flipH` (`matches`). Retourner
  une accolade gauche donne la droite **sans changer son label ni sa position**. Vérifier que la reconnaissance de la
  forme suit le basculement.
- **Copier-coller depuis draw.io :** une cellule collée avec `direction`, `flipH` ou `flipV` s'affiche orientée et ses
  boutons du panneau reflètent son état (y compris sur une forme qui ne déclare pas la capacité : on la rend comme
  collée, on n'offre simplement pas les boutons).
- **Pas de raccourci clavier ni de retournement / pivot à la souris** dans ce sujet.
- **Documentation :** SPEC §8.2 (champs `flippable` et `rotatable`) et section du panneau de forme ;
  `docs/AJOUTER_UNE_FORME.md` (« déclarer qu'une forme se retourne ou pivote : capacité + dessin par `orientedPath` ») ;
  `docs/SUMMARY.md` si une ligne « Où regarder » change.
- **Tests :**
  - moteur : capacités absentes → `{ horizontal: false, vertical: false }` et `rotatable` faux ; déclarées →
    renvoyées ; héritées par `{ ...base }` ;
  - édition : bascule `flipH` (écrit puis retire) ; cycle `direction` dans les deux sens ; échange `width` ↔ `height`
    autour du centre ; composition avec un retournement et avec un cadre couché ; une étape d'annulation ; sélection
    multiple (formes non permises ignorées, chacune sur son centre) ;
  - rendu : label non miroité ni tourné ; `textZone` suit les bornes ;
  - panneau : section absente pour une forme par défaut ; seuls les boutons permis apparaissent.
- **Fini quand :**
  - une forme sans capacité n'affiche **aucune** section « Orientation » ;
  - une forme qui les déclare (fixture : accolade, prise, silhouette) montre les boutons permis ; retourner et
    pivoter agit dans les trois vues, **le texte ne bouge ni ne tourne**, les flèches accrochées suivent, Ctrl+Z
    défait en une étape ;
  - une cellule collée depuis draw.io avec `direction` / `flipH` / `flipV` s'affiche orientée comme dans draw.io ;
  - `make check` vert. (Pas de `make drawio-check` exigé dans ce sujet, voir `idea/337`.)
- Fait : champs `flippable` / `rotatable` de `ShapeDefinition` (`core/shapes/types.ts`), lus par
  `ShapeRegistry.orientable(shape)` (exposé à l'appli par `ShapeRegistryView`). Règle pure `core/edit/orientShapes.ts` :
  l'action (écran) est composée avec la matrice de l'orientation courante lue par `orientation()`, puis on cherche
  parmi les combinaisons `direction` / `flipH` / `flipV` celle qui change le moins la forme (un retournement reste un
  `flipH` / `flipV`). Commande `core/domains/edit/commands/orient.ts` (`engine.orientShapes(ids, action)`) : formes
  qui l'acceptent seulement, une étape d'annulation libellée, pivot = `direction` + échange `width` / `height` autour
  du centre. Panneau : `app/OrientSection.tsx` (section « Orientation », forme seule et sélection multiple), icônes
  provisoires dessinées en SVG simple (à remplacer par les icônes définitives). Déclarée sur les accolades (la droite
  hérite de la gauche), la prise et les silhouettes (`actors/common`).
  - Écart avec le ticket : **pas de bouton enfoncé** pour les retournements (l'état d'un miroir est ambigu sur une
    forme pivotée) ; un second clic défait. Et l'écriture « horizontal sur `direction=north` écrit `flipV` » n'a pas
    été retenue comme règle : la clé écrite est celle qui donne le bon dessin à l'écran (testé par comparaison des
    matrices d'`orientation()`).
  - Validé par `make check` (tests `orientShapes.test.ts`, `domains/edit/orient.test.ts`) et à l'œil sur la fixture
    `tests/fixtures/orientation.drawio` (retourner, pivoter, annuler en une étape sur la prise ; pas de section sur le
    rectangle ; accolade collée avec `direction=south` dessinée couchée, texte horizontal). **Non vérifié** : iso et
    3D, sélection multiple à l'œil (couvert par test), `make drawio-check` (hors périmètre, `idea/337`).
