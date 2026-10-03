# Feuille de route — Drawio Spatial

> Découpage en étapes courtes, chacune livrable et testable. Référence : `SPEC.md`.
> Principe : à chaque étape, l'application tourne et on peut vérifier le résultat à l'œil.
> Légende : ✅ fait · 🟡 partiellement fait · (rien) à faire.

## Façon de travailler (phase de dev)

- Tout tourne dans Docker (Node figé par l'image) ; `make dev` lance l'appli et affiche le lien (SPEC §3.4).
- **Un seul serveur en hot reload** reste ouvert (`make dev`, port 5173) : on travaille directement dessus, il suffit de regarder ou de rafraîchir l'onglet. Une modification du moteur recharge la page en restaurant fichier, page et caméra.
- Chaque étape se termine par `make check` (lint, types, format, tests) et un commit ; les pushes sont faits à la main.

---

## Milestone 1 — Viewer ✅

### Étape 0 — Squelette du projet ✅
- Vite + React + TypeScript strict, Three.js, Vitest, ESLint/Prettier.
- Arborescence `src/engine`, `src/react`, `src/app`, `tests/fixtures` (cf. SPEC §4.2).
- Règle vérifiée par lint : `src/engine` n'importe jamais `react` (et `format/` + `model/` n'importent jamais Three.js).
- Conteneur Docker + Makefile (`make dev`, `make check`…), hot reload avec restauration de la vue.
- **Fini quand :** `make dev` affiche une page vide, `make test` passe.

### Étape 1 — Parsing draw.io ✅
- `decode.ts` : base64 → inflate raw → URI decode.
- `style.ts` : parsing des chaînes de style.
- `parse.ts` : `<mxfile>` → `DocumentModel` (pages, formes, arêtes, liens, coordonnées absolues avec groupes).
- Fixtures : fichier simple, compressé, multi-pages, groupes imbriqués, liens entre pages.
- **Fini quand :** tests unitaires verts sur toutes les fixtures.

### Étape 2 — Scène minimale en vue de dessus ✅
- `Engine` + caméra orthographique au-dessus du sol.
- Registre de renderers + renderers rectangle, ellipse, texte, placeholder.
- Texte SDF (troika) avec police embarquée ; appli de démo (fixtures, ouverture d'un fichier local).
- Repère : x → X, y → Z.
- **Fini quand :** un fichier de fixture s'affiche comme dans draw.io (positions et tailles correctes).

### Étape 3 — Navigation ✅
- Z Q S D (via `KeyboardEvent.code`, = W A S D sur QWERTY), flèches.
- Zoom molette centré sur le curseur ; pan au clic droit et Espace + glisser.
- **Glisser molette enfoncée** : déplacer la vue (le mode « Tourner » a été retiré).
- **Entrée** : bascule vue globale ↔ 1:1 (SPEC §9.3).
- **Glissade** : pas d'accélération, courte décélération à l'arrêt, au clavier comme au glisser (SPEC §9.2).
- **Fini quand :** le ressenti est équivalent à draw.io en vue de dessus.

### Étape 4 — Arêtes et styles ✅
- Connecteurs avec points intermédiaires et flèches (tracé recalculé : droit, orthogonal, coude ; pointes draw.io ; labels avec fond).
- Couleurs de remplissage, bordures, épaisseur, pointillés, labels.
- Panneau **Diagnostics** : éléments non supportés du fichier entier (compteur, pages, exemple de style, occurrences cliquables qui cadrent l'élément), cumul tous fichiers ouverts, avertissements de lecture, **export JSON** (SPEC §8.4).
- **Fini quand :** un vrai schéma d'architecture est lisible ; les formes inconnues apparaissent en placeholder et sont listées.

### Étape 5 — Pages / onglets ✅
- Sélecteur de pages dans l'UI.
- Tout le document en mémoire ; scènes Three.js construites à la demande et mises en cache (`SceneManager`, plafond `maxCachedPages`, libération de la moins récemment affichée).
- Chaque page garde sa caméra ; mémorisée aussi pour le rechargement en dev (base du `cameraByPage` de l'étape 6).
- **Fini quand :** on bascule entre les pages d'un fichier multi-pages sans rechargement.

### Étape 6 — Persistance et lanceur ✅
- Interface `FileStore` + `IndexedDbStore` (+ `MemoryStore` de repli et pour les tests).
- Lanceur : fichiers récents, ouvrir (sélecteur + glisser-déposer partout), nouveau fichier, retrait de la liste, exemples.
- Mémorisation de la caméra par page, de la dernière page active, de la pile de navigation et de l'usage des liens (debounce 500 ms + à la fermeture).
- **Fini quand :** en rouvrant l'application, on retrouve le fichier, la page et le point de vue exacts.

### Étape 7 — Mode isométrique ✅
- Bascule `top` ↔ `iso` animée (boutons « 2D | Iso », touche I) ; réglages iso (section « Vue isométrique » des paramètres) : orientation vers la droite / la gauche / sans rotation ou angle libre au curseur (±180°), élévation 10–80° (35,26° = isométrie vraie), appliqués en direct.
- Navigation cohérente dans les deux modes (zoom au curseur, pan, rotation, clic, liens, transitions).
- Volume en iso : rectangles, ellipses et placeholders en blocs ombrés (épaisseur réglable, `spatial.height` par forme), empilés sur leur conteneur, qui poussent avec l'inclinaison.
- **Fini quand :** le même schéma se consulte en vue de dessus et en isométrique sans perte de repère.

### Étape 8 — Mini-carte ✅
- En bas à droite, toujours en vue de dessus (nord en haut).
- Emprise du viewport : rectangle (top) / rectangle tourné et allongé (iso orthographique, pas de perspective donc pas de trapèze).
- Clic et glisser pour déplacer la caméra ; repliable (×, touche M), choix mémorisé.
- **Fini quand :** la mini-carte suit fidèlement la caméra dans les deux modes.

### Étape 9 — Liens et transitions ✅ (avancée avant les étapes 6 à 8)
- Simple clic : sélection + préchargement de la page cible.
- Double-clic : zoom jusqu'à ce que la forme remplisse l'écran + fondu vers la page cible (posée dans la forme pendant le plongeon, bascule invisible, recadrage).
- Option préchargement au survol, plafond de cache.
- Liens URL externes (http, https, mailto uniquement) ; pastille et infobulle sur les formes liées.
- **Fini quand :** passer d'une page à l'autre par un lien est fluide, sans à-coup.

### Étape 10 — Retour et historique ✅
- Pile de navigation (page, forme d'origine, caméra), transition inverse (un seul trajet de caméra).
- Bouton « Retour » + Retour arrière / Alt+←.
- Pile vide : menu des pages parentes triées par usage récent (persisté avec le fichier) ; un seul parent → directement.
- **Fini quand :** on peut descendre de plusieurs niveaux et remonter exactement au point de départ.

### Étape 11 — Vue graphe de la documentation ✅
- Graphe des pages (cycles autorisés) : une page générée avec une carte par page (vraie miniature) et des flèches par lien.
- Disposition en couches depuis la page de départ ; pages inaccessibles (orange) et orphelines (rouge) mises en évidence.
- Double-clic sur une carte = plongée continue dans la page ; Retour ressort vers le graphe ; onglet « Vue graphe », touche G.
- **Fini quand :** on a une vue d'ensemble spatiale de toute la documentation du fichier.

### Étape 12 — Paramètres ✅
- Objet `Settings` complet (`engine/settings.ts`), fusion partielle validée et bornée, `engine.updateSettings` appliqué à chaud.
- Panneau « Paramètres » : navigation, vue, transitions, préchargement, mini-carte, accessibilité, raccourcis (capture de touche), diagnostics ; persisté, réinitialisable.
- `prefers-reduced-motion` suivi (ou forcé : toujours / jamais) : transitions, bascules et glissade instantanées.
- **Fini quand :** toutes les durées, touches et options de préchargement sont réglables.

---

## Milestone 2 — Editor

### Étape 13 — Conservation de l'arbre XML ✅
- Conserver l'arbre XML d'origine à côté du modèle neutre, avec correspondance id ↔ nœud.
- Test d'aller-retour : `parse → write` sans modification = XML sémantiquement identique.
- Fait : `format/xmlTree.ts` (arbre, `cells` id → `<mxCell>` / enveloppe / `<mxGeometry>`, forme de chaque page), `readDrawio` construit le modèle à partir de cet arbre, `format/write.ts` resérialise l'arbre (pages compressées intactes recopiées telles quelles, modifiées recompressées). L'`Engine` garde l'arbre à côté du modèle. Fixture `roundtrip.drawio` (commentaires, éléments et attributs inconnus, entités, `UserObject`).
- **Fini quand :** les tests d'aller-retour passent sur toutes les fixtures.

### Étape 14 — Déplacement et sauvegarde ✅
- Sélection et déplacement à la souris (en top et en iso, projection sur le sol).
- Écriture in situ des attributs modifiés uniquement.
- Sauvegarde (téléchargement + mise à jour du `FileStore`).
- État de vue par page : enregistrer dans les attributs de la page la position de la caméra et le mode de rendu (`top` / `iso`) avec ses paramètres (orientation, élévation, volumes, épaisseur) ; à l'ouverture d'un fichier ou au retour sur une page, la vue reprend exactement cet état.
- Fait : clic gauche + glisser sur une forme (top et iso, aimanté à la grille, Alt = libre ; groupe déplacé d'un bloc, arêtes reliées retracées en direct) ; `format/edit.ts` réécrit uniquement `x` / `y` du `<mxGeometry>` ; `spatial.view` sur `<diagram>` (`format/viewState.ts`), relu à l'ouverture, réglages iso repris par page ; bouton « Sauvegarder » / Ctrl+S (téléchargement + `FileStore`), pastille de modification, confirmation avant de quitter. Fixture `three-rectangles.drawio` et test du critère §14.4 côté XML.
- Validé avec draw.io 24.7.5 (export en ligne de commande `draw.io -x -f xml`, qui relit et réécrit le fichier) : rectangles aux nouvelles positions, reste identique, `spatial.view` conservé. Procédure manuelle complète : SPEC §15.
- **Fini quand :** le critère d'acceptation SPEC §14.4 est validé dans draw.io, et un fichier sauvegardé puis rouvert (ici comme après un passage dans draw.io) retrouve la même caméra et le même mode de rendu sur chaque page.

### Étape 15 — Palette et création ✅
- Palette de formes, glisser-déposer sur le plan.
- Nouveau fichier depuis un squelette vide, ajout / suppression / renommage de pages.
- Fait : palette à gauche (rectangle, rectangle arrondi, ellipse, cercle, texte : styles et tailles par défaut de draw.io, seulement des formes dessinées par le moteur) ; glisser-déposer au point visé, projeté au sol (top et iso), aimanté à la grille ; clic = ajout au centre de la vue. `format/create.ts` ajoute cellules (ids à la draw.io, premier calque, créé au besoin) et pages dans l'arbre, en reprenant l'indentation ; le modèle est relu de l'arbre (`documentFromTree`). Onglets : + (nouvelle page), double-clic (renommer), × (supprimer, avec confirmation). Une page vide est cadrée sur le haut de la feuille draw.io (coordonnées positives).
- Validé avec draw.io 24.7.5 : un fichier créé de zéro (deux pages, rectangle, ellipse, texte) se rend correctement à l'export PNG et se relit sans perte (`spatial.view` compris).
- **Fini quand :** un schéma créé de zéro s'ouvre correctement dans draw.io.

### Étape 16 — Édition avancée ✅
- Redimensionnement, édition des labels, création de connecteurs et de liens entre pages.
- Annuler / rétablir.
- Fait : poignées sur la forme sélectionnée, sur le dessus du volume en iso (8 pour redimensionner, aimantées à la grille, taille minimale ; 1 pour connecter : tirer vers une autre forme crée un connecteur au style draw.io par défaut) ; label au double-clic (élément sans lien), F2 ou bouton « Texte » (champ posé sur l'élément : Entrée = ligne, Ctrl+Entrée / clic ailleurs = valider, Échap = annuler ; HTML échappé avec `<br>` si `html=1`) ; barre de sélection : lien vers une page ou une URL (cellule enveloppée dans un `<UserObject>` comme draw.io), suppression (Suppr : avec le contenu, les labels et les arêtes reliées) ; annuler / rétablir par instantanés de l'arbre XML (boutons, Ctrl+Z, Ctrl+Maj+Z / Ctrl+Y), « modifié » qui revient à faux en annulant jusqu'à la dernière sauvegarde.
- Validé avec draw.io 24.7.5 : forme redimensionnée, label sur deux lignes avec `<`, `>`, `&`, connecteur créé et lien vers une nouvelle page rendus et relus à l'identique.

### Étape 17 — Attributs spatiaux ✅
- Attributs personnalisés préfixés (ex. `spatial.*`).
- Procédure de test manuelle : ouvrir dans draw.io, sauvegarder, rouvrir, vérifier la conservation.
- Fait : `engine/spatial.ts` (attributs connus, lecture style ou objet) ; `spatial.height` lu aussi sur l'objet, nouveau `spatial.elevation` (forme qui flotte en iso) ; champs « Épaisseur » / « Élévation » dans la barre de sélection (écriture en place, annulable) ; fixture `spatial.drawio`. `make drawio-check` fait réenregistrer les fixtures par draw.io et vérifie la conservation (sorties versionnées dans `tests/fixtures/drawio-saved/`, testées à chaque `make check`) ; procédure manuelle en SPEC §15.

---

## Milestone 3 — Packaging

### Étape 18 — Composant React ✅
- `<DrawioSpatial />` avec props (contenu ou store, settings, callbacks), documentation, exemple d'intégration.
- Fait : props `xml` ou `store` + `fileId` (vue mémorisée dans le store, contenu enregistré à la sauvegarde), `editable` (moteur en visionneuse par défaut), `settings`, `fonts`, `background`, mini-carte contrôlée ou non ; événements `onLoad`, `onPageChange`, `onSelectionChange`, `onCameraChange`, `onModifiedChange`, `onSave`, `onError`, `onEngine` ; `ref` (`save`, `undo`, `redo`, `engine`) ; Ctrl+S / Ctrl+Z traités dans le composant. API publique `src/index.ts`, `make lib` (`dist-lib/` : module ES, `style.css`, types ; React fourni par l'hôte). Documentation `docs/COMPOSANT.md`, exemple `examples/basic/` (http://localhost:5173/examples/basic/).

### Étape 19 — Binaire natif ✅
- Wrapper Electron ou Tauri, `FsStore` basé sur le système de fichiers.
- Fait : Electron (44.5), construit dans Docker de bout en bout : runtime macOS téléchargé dans le conteneur, appli web en chemins relatifs, `.app` assemblée et signée ad hoc par `rcodesign`, `.zip` (Linux : `tar.gz`). `FsStore` (vrais chemins, vue dans `library.json`), dialogues Ouvrir / Enregistrer sous, glisser-déposer avec chemin, sauvegarde directe. `make desktop`, `desktop-dev`, `desktop-package`, `desktop-install`, `desktop-lock`.
- Validé sur macOS 14 (arm64) : signature acceptée par `codesign --deep --strict`, appli lancée, fichier réel ouvert depuis la bibliothèque, forme déplacée à la souris et Ctrl+S : seuls la géométrie et `spatial.view` changent sur le disque ; `make desktop-dev` affiche le serveur de dev.

---

## Milestone 4 — Éditeur de forme (prochain chantier)

### Étape 20 — Panneau de forme et styles
- **Panneau « Forme » à droite**, comme le panneau Format de draw.io : il s'ouvre quand une forme est sélectionnée,
  se met à jour quand la sélection change, se ferme quand on désélectionne (ou par ×). Il partage l'emplacement des
  panneaux Paramètres / Diagnostics (un seul ouvert à la fois). La barre de sélection du bas garde les actions
  rapides ; les réglages de la forme migrent progressivement dans le panneau.
- **Première section : Style**, une grille de vignettes cliquables (aperçu de la forme avec ce style, au survol le nom
  du style) ; le style courant de la forme est mis en évidence.
  - **Styles de base de draw.io** (les mêmes que la palette Style de draw.io, valeurs exactes) :

    | Style | `fillColor` | `strokeColor` | Autres |
    |---|---|---|---|
    | Par défaut | `#ffffff` | `#000000` | |
    | Gris | `#f5f5f5` | `#666666` | `fontColor=#333333` |
    | Bleu | `#dae8fc` | `#6c8ebf` | |
    | Vert | `#d5e8d4` | `#82b366` | |
    | Orange | `#ffe6cc` | `#d79b00` | |
    | Jaune | `#fff2cc` | `#d6b656` | |
    | Rouge | `#f8cecc` | `#b85450` | |
    | Violet | `#e1d5e7` | `#9673a6` | |

  - **Palette étendue** : 12 teintes pastel (menthe, jaune pâle, lavande, rose saumon, bleu, pêche, vert tendre,
    rose, gris, mauve, vert pâle, crème), en plus des styles de base. Fond pastel et **contour dérivé** (même teinte,
    plus soutenue), pour garder le principe fond + contour de draw.io. Valeurs de départ, à affiner à l'œil :
    `#dcefea`, `#ffffe5`, `#e8e5f0`, `#fdd8d6`, `#d8e4f0`, `#ffe4d3`, `#e4f1d3`, `#fdebf2`, `#f2f2f2`, `#e8d7e8`,
    `#edf5e8`, `#fef7d7`.
- **Appliquer un style** écrit seulement les clés concernées dans le style draw.io de la cellule
  (`fillColor`, `strokeColor`, `fontColor` si le style en a une ; le reste du style intact, SPEC §14.2), avec
  annuler / rétablir. En **sélection multiple**, le style s'applique à toutes les formes sélectionnées.
- Les palettes sont des **paramètres** (`Settings`, source de vérité) : listes de styles modifiables plus tard,
  valeurs par défaut ci-dessus.
- Rendu immédiat dans les trois modes (2D, iso, 3D : fond, côtés ombrés, arêtes) ; réouverture identique dans draw.io.
- **Fini quand :** sélectionner une forme ouvre le panneau, un clic sur une vignette change ses couleurs (une ou
  plusieurs formes), Ctrl+Z annule, et draw.io affiche le même style.

---

## Milestone 5 — Formes géométriques

> Formes demandées : Actor, Hexagon, Octagon, Pentagon, Triangle (vers la droite), Triangle (vers le haut),
> Parallelogram, Step, Diamond, étoile à 4 branches, étoile à 6 branches.
> Règles communes (SPEC §8, guide `docs/AJOUTER_UNE_FORME.md`) : formes **natives de draw.io**, dessinées comme
> draw.io en 2D (même rendu à la réouverture dans draw.io), en volume en iso / 3D, créables depuis la palette avec le
> style et la taille par défaut de la palette draw.io. La géométrie se vérifie contre l'export de draw.io (CLI :
> `draw.io -x -f svg` ou `png`, comme pour `direct_data`).

### Étape 21 — Socle commun des formes géométriques
Prérequis aux étapes 22 et 23 : aujourd'hui, seuls le rectangle et l'ellipse sont gérés hors du rendu.
- **Contour polygonal** par forme (`outline`), utilisé partout : rendu 2D (`flatBox`), volume iso (`isoBlock` : prisme
  du contour, toit avec le label, arêtes verticales aux angles vifs, rentrants compris), mini-carte (repli contour).
- **Clic et survol sur le contour réel** (point dans le polygone) au lieu des bornes (`shapeContains`) : les coins
  vides d'un losange ou d'une étoile ne sont pas cliquables.
- **Accroche des flèches sur le contour** (intersection avec le polygone) : périmètre générique `polygon` dans
  `edges/route.ts`, en plus de `rectangle` et `ellipse`.
- **`direction`** draw.io (`east` par défaut, `south`, `west`, `north`) générique pour toutes les formes polygonales :
  contour tracé dans un cadre local puis tourné dans les bornes (comme le cylindre couché) ; `flipH` / `flipV`.
- **Labels hors de la forme** : `verticalLabelPosition=bottom|top`, `labelPosition=left|right` dans `createLabel`
  (Actor, étoiles), aussi en iso (label posé au sol à côté du volume, ou sous l'Actor).
- Fixture `tests/fixtures/shapes.drawio` **enregistrée par draw.io**, avec toutes les formes de l'étape 22 et leurs
  variantes (directions, tailles, `size` / `dx`) ; `make drawio-check`.
- **Fini quand :** une forme polygonale de test se clique sur son contour, reçoit les flèches sur son contour,
  s'oriente avec `direction`, et son label peut être placé dessous.

### Étape 22 — Polygones et étoiles
Pour chaque forme : définition (`render/shapes/`), entrée de palette avec aperçu, tests (contour 2D, volume iso,
clic, accroche des flèches), comparaison visuelle avec l'export draw.io.

| Forme | Style draw.io (palette) | Taille | Géométrie 2D | Iso / 3D |
|---|---|---|---|---|
| Hexagon | `shape=hexagon;perimeter=hexagonPerimeter2;whiteSpace=wrap;html=1;fixedSize=1;` | 120 × 80 | hexagone couché (pointes à gauche et à droite) ; `size` = largeur des pans coupés (px avec `fixedSize=1`, défaut 20 ; sinon fraction de la largeur) | prisme du contour |
| Octagon | `whiteSpace=wrap;html=1;shape=mxgraph.basic.octagon2;align=center;verticalAlign=middle;dx=15;` | 100 × 100 | rectangle aux quatre coins coupés de `dx` px | prisme du contour |
| Pentagon | `whiteSpace=wrap;html=1;shape=mxgraph.basic.pentagon` | 100 × 90 | pentagone pointe en haut, inscrit dans les bornes (proportions à relever sur l'export draw.io) | prisme du contour |
| Triangle (vers la droite) | `triangle;whiteSpace=wrap;html=1;` | 60 × 80 | triangle isocèle, base à gauche, pointe au milieu du bord droit (`direction=east`, défaut) | prisme du contour |
| Triangle (vers le haut) | `triangle;whiteSpace=wrap;html=1;direction=north;` | 80 × 60 | le même tourné (`direction=north`) : base en bas, pointe en haut | prisme du contour |
| Parallelogram | `shape=parallelogram;perimeter=parallelogramPerimeter;whiteSpace=wrap;html=1;fixedSize=1;` | 120 × 60 | côtés obliques décalés de `size` (px avec `fixedSize=1`, défaut 20) | prisme du contour |
| Step | `shape=step;perimeter=stepPerimeter;whiteSpace=wrap;html=1;fixedSize=1;` | 120 × 80 | chevron d'étape : encoche à gauche, pointe à droite, de profondeur `size` (défaut 20) | prisme du contour |
| Diamond | `rhombus;whiteSpace=wrap;html=1;` | 80 × 80 | losange inscrit (sommets au milieu des bords) | prisme du contour |
| Étoile à 4 branches | `html=1;shape=mxgraph.basic.4_point_star_2;dx=0.8;` (préfixe de la palette « Basic » à relever) | 100 × 100 | étoile à 4 pointes ; `dx` = creux des branches (0,8 par défaut) | prisme du contour, arêtes verticales aux pointes et aux creux |
| Étoile à 6 branches | `html=1;shape=mxgraph.basic.6_point_star` (idem) | 100 × 90 | étoile à 6 pointes (proportions à relever sur l'export draw.io) | prisme du contour, idem |

- Les volumes suivent la règle commune : épaisseur par défaut (`view.isoDepth`, 32 px), `spatial.height` prioritaire,
  `spatial.elevation`, empilement sur le conteneur, repli à plat sans fond.
- Les noms de forme sont ceux de `resolveShapeKind` : `hexagon`, `mxgraph.basic.octagon2`, `mxgraph.basic.pentagon`,
  `triangle`, `parallelogram`, `step`, `rhombus`, `mxgraph.basic.4_point_star_2`, `mxgraph.basic.6_point_star`
  (alias dans `SHAPE_ALIASES` si draw.io écrit la même forme autrement).
- **Fini quand :** les 10 formes s'affichent comme dans draw.io en 2D (comparaison avec l'export), en volume en iso et
  en 3D, se cliquent et reçoivent les flèches sur leur contour, se créent depuis la palette ; plus aucune n'apparaît
  dans le panneau Diagnostics.

### Étape 23 — Actor
- Style draw.io (palette) : `shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;`,
  30 × 60.
- **2D** : bonhomme draw.io (tête ronde remplie de la couleur de fond, corps, bras, jambes en traits), aux proportions
  de draw.io, étiré dans ses bornes ; **label sous la forme** (`verticalLabelPosition=bottom`, étape 21).
- **Iso / 3D** : pas d'extrusion (un bonhomme en prisme n'a pas de sens). Le personnage est **debout** : sa silhouette
  2D dans un plan vertical tourné vers la caméra, pieds au centre de l'emprise, hauteur = hauteur de la forme (ou
  `spatial.height`), comme une unité de jeu ; label au sol devant lui. Demande de remettre en place l'orientation des
  objets selon la vue (supprimée avec les arêtes verticales en rubans), de façon exacte en perspective.
- Clic sur ses bornes (bonhomme fin : le contour réel serait trop difficile à viser) ; accroche des flèches sur ses
  bornes, comme draw.io (`outlineConnect=0`) ; mini-carte : sa silhouette.
- **Fini quand :** l'Actor s'affiche comme dans draw.io en 2D, se tient debout face à la caméra en iso et en 3D sous
  tous les angles, se crée depuis la palette.

---

## Après la roadmap

- Fond et grille ✅ : couleur de fond réglable, grille au sol dans les trois modes (pas de la page draw.io ou 10 px, ligne principale toutes les 4 cases, couleur), shader net à tout zoom qui s'estompe au dézoom et au loin en 3D ; section « Fond et grille » des paramètres.
- Rotation à la souris ✅ : clic droit + glisser fait tourner la caméra en iso (élévation inchangée) et en 3D (avec l'inclinaison) ; la caméra bouge, la page reste fixe. Jamais de rotation en 2D.
- Vue 3D ✅ : troisième mode (« 2D | Iso | 3D », touche P), caméra en perspective façon jeu de construction : zoom borné (×0,1 à ×4), glisser molette = déplacer, glisser clic droit = tourner / incliner (0–65°) autour du centre ; bascule animée sans saut (la perspective s'ouvre progressivement), mini-carte en trapèze.
- Sauvegarde automatique ✅ : paramètre « Sauvegarde » (activée, 1 s), `Autosaver` (`engine/edit/autosave.ts`) dans le composant (`autosave`, `onSave(xml, { auto })`) ; bibliothèque du navigateur ou vrai fichier dans l'appli native.

## Ensuite (backlog)
- Formes supplémentaires, priorisées par le journal des styles non supportés (une définition par forme, au minimum à plat — SPEC §8.2).
- Rendus `iso` pour d'autres formes (ex. labels dressés face à la caméra), arêtes en hauteur, rendu `volume` forme par forme, avec repli à plat.
- Optimisations mémoire / rendu si nécessaire.
- Rendu en volume (extrusion), si souhaité.

---

## Prompt de départ suggéré pour Claude Code

```
Lis SPEC.md et ROADMAP.md. Nous commençons le Milestone 1.
Implémente uniquement l'étape 0, puis l'étape 1 avec ses tests.
Respecte strictement la séparation des couches (le moteur ne dépend jamais de React).
Arrête-toi à la fin de l'étape 1 et résume ce qui a été fait avant de continuer.
```
