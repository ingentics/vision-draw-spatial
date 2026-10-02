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
- **Glisser molette enfoncée** : déplacer la vue, ou **tourner la vue** — au choix dans une **barre d'outils** (deux boutons liés « Déplacer » | « Tourner », Déplacer par défaut). (SPEC §9.3).
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
- Bascule `top` ↔ `iso` animée (boutons « 2D | Iso », touche I) ; réglages iso (section « Vue isométrique » des paramètres) : orientation vers la droite / la gauche / sans rotation ou angle libre au curseur (±90°), élévation 10–80° (35,26° = isométrie vraie), appliqués en direct.
- Navigation cohérente dans les deux modes (zoom au curseur, pan, rotation, clic, liens, transitions) ; orbite au glisser en mode Tourner.
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

## Ensuite (backlog)
- Formes supplémentaires, priorisées par le journal des styles non supportés (une définition par forme, au minimum à plat — SPEC §8.2).
- Rendus `iso` pour d'autres formes (ex. labels dressés face à la caméra), arêtes en hauteur, mode 3D (`volume`, perspective), forme par forme, avec repli à plat.
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
