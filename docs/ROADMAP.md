# Feuille de route — Drawio Spatial

> Découpage en étapes courtes, chacune livrable et testable. Référence : `SPEC.md`.
> Principe : à chaque étape, l'application tourne et on peut vérifier le résultat à l'œil.

---

## Milestone 1 — Viewer

### Étape 0 — Squelette du projet
- Vite + React + TypeScript strict, Three.js, Vitest, ESLint/Prettier.
- Arborescence `src/engine`, `src/react`, `src/app`, `tests/fixtures` (cf. SPEC §4.2).
- Règle vérifiée par lint : `src/engine` n'importe jamais `react`.
- **Fini quand :** `npm run dev` affiche une page vide, `npm test` passe.

### Étape 1 — Parsing draw.io
- `decode.ts` : base64 → inflate raw → URI decode.
- `style.ts` : parsing des chaînes de style.
- `parse.ts` : `<mxfile>` → `DocumentModel` (pages, formes, arêtes, liens, coordonnées absolues avec groupes).
- Fixtures : fichier simple, compressé, multi-pages, groupes imbriqués, liens entre pages.
- **Fini quand :** tests unitaires verts sur toutes les fixtures.

### Étape 2 — Scène minimale en vue de dessus
- `Engine` + caméra orthographique au-dessus du sol.
- Registre de renderers + renderers rectangle, ellipse, texte, placeholder.
- Repère : x → X, y → Z.
- **Fini quand :** un fichier de fixture s'affiche comme dans draw.io (positions et tailles correctes).

### Étape 3 — Navigation
- Z Q S D (via `KeyboardEvent.code`), flèches, option W A S D.
- Zoom molette centré sur le curseur, pan souris.
- **Fini quand :** le ressenti est équivalent à draw.io en vue de dessus.

### Étape 4 — Arêtes et styles
- Connecteurs avec points intermédiaires et flèches.
- Couleurs de remplissage, bordures, épaisseur, labels.
- Panneau debug des styles non supportés (avec compteur, export JSON).
- **Fini quand :** un vrai schéma d'architecture est lisible ; les formes inconnues apparaissent en placeholder et sont listées.

### Étape 5 — Pages / onglets
- Sélecteur de pages dans l'UI.
- Tout le document en mémoire ; scènes Three.js construites à la demande et mises en cache.
- **Fini quand :** on bascule entre les pages d'un fichier multi-pages sans rechargement.

### Étape 6 — Persistance et lanceur
- Interface `FileStore` + `IndexedDbStore`.
- Lanceur : fichiers récents, ouvrir (sélecteur + drag & drop), nouveau fichier.
- Mémorisation de la caméra par page et de la dernière page active (debounce).
- **Fini quand :** en rouvrant l'application, on retrouve le fichier, la page et le point de vue exacts.

### Étape 7 — Mode isométrique
- Bascule `top` ↔ `iso` animée, angle configurable.
- Navigation cohérente dans les deux modes.
- **Fini quand :** le même schéma se consulte en vue de dessus et en isométrique sans perte de repère.

### Étape 8 — Mini-carte
- En bas à droite, toujours en vue de dessus.
- Emprise du viewport : rectangle (top) / trapèze (iso).
- Clic et glisser pour déplacer la caméra.
- **Fini quand :** la mini-carte suit fidèlement la caméra dans les deux modes.

### Étape 9 — Liens et transitions
- Simple clic : sélection + préchargement de la page cible.
- Double-clic : zoom jusqu'à ce que la forme remplisse l'écran + fondu vers la page cible.
- Option préchargement au survol, plafond de cache.
- Liens URL externes.
- **Fini quand :** passer d'une page à l'autre par un lien est fluide, sans à-coup.

### Étape 10 — Retour et historique
- Pile de navigation (page, forme d'origine, caméra), transition inverse.
- Pile vide : menu des pages parentes triées par usage récent (persisté).
- **Fini quand :** on peut descendre de plusieurs niveaux et remonter exactement au point de départ.

### Étape 11 — Vue graphe de la documentation
- Graphe des pages (cycles autorisés), plans flottants reliés par des arcs.
- Mise en évidence des pages orphelines / inaccessibles.
- Double-clic sur une page = navigation.
- **Fini quand :** on a une vue d'ensemble spatiale de toute la documentation du fichier.

### Étape 12 — Paramètres
- Objet `Settings` complet, persisté, éditable dans un panneau.
- Support de `prefers-reduced-motion`.
- **Fini quand :** toutes les durées, touches et options de préchargement sont réglables.

---

## Milestone 2 — Editor

### Étape 13 — Conservation de l'arbre XML
- Conserver l'arbre XML d'origine à côté du modèle neutre, avec correspondance id ↔ nœud.
- Test d'aller-retour : `parse → write` sans modification = XML sémantiquement identique.
- **Fini quand :** les tests d'aller-retour passent sur toutes les fixtures.

### Étape 14 — Déplacement et sauvegarde
- Sélection et déplacement à la souris (en top et en iso, projection sur le sol).
- Écriture in situ des attributs modifiés uniquement.
- Sauvegarde (téléchargement + mise à jour du `FileStore`).
- **Fini quand :** le critère d'acceptation SPEC §14.4 est validé dans draw.io.

### Étape 15 — Palette et création
- Palette de formes, glisser-déposer sur le plan.
- Nouveau fichier depuis un squelette vide, ajout / suppression / renommage de pages.
- **Fini quand :** un schéma créé de zéro s'ouvre correctement dans draw.io.

### Étape 16 — Édition avancée
- Redimensionnement, édition des labels, création de connecteurs et de liens entre pages.
- Annuler / rétablir.

### Étape 17 — Attributs spatiaux
- Attributs personnalisés préfixés (ex. `spatial.*`).
- Procédure de test manuelle : ouvrir dans draw.io, sauvegarder, rouvrir, vérifier la conservation.

---

## Milestone 3 — Packaging

### Étape 18 — Composant React
- `<DrawioSpatial />` avec props (contenu ou store, settings, callbacks), documentation, exemple d'intégration.

### Étape 19 — Binaire natif
- Wrapper Electron ou Tauri, `FsStore` basé sur le système de fichiers.

---

## Ensuite (backlog)
- Formes supplémentaires, priorisées par le journal des styles non supportés.
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
